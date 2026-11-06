import { and, desc, eq } from 'drizzle-orm'
import { Clock, Context, Effect, Layer } from 'effect'
import { bestTiers, rewardsOf, type TitleId } from '#/domain/achievements.ts'
import { BANNERS, defaultAvatar, trophyItem, type Avatar, type TrophyItemId } from '#/domain/avatar-parts.ts'
import { unearnedChoice } from '#/domain/player-style.ts'
import type { PlayerStyleInput } from '#/shared/schemas.ts'
import { CardCatalog, type CardSearchResult } from '../catalog/card-catalog.ts'
import { requireUser } from '../current-user.ts'
import { Db } from '../db/client.ts'
import { decks, playerStyle } from '../db/schema.ts'
import { InvalidState } from '../errors.ts'
import { AchievementsService } from './achievements.ts'
import { insertDefaultStyles, styleOf, styleRows, type PlayerStyle } from './style.ts'

/** What the customise editor needs: the style, the defaults to fall back to, and what the player has earned. */
export interface StyleEditor {
  readonly style: PlayerStyle
  readonly defaultAvatar: Avatar
  readonly earned: {
    readonly trophies: ReadonlyArray<TrophyItemId>
    readonly titles: ReadonlyArray<TitleId>
    /** Achievement id → best tier, for the Badges slot. */
    readonly badges: Readonly<Record<string, number>>
  }
  /** Tiers earned after this are new: their items and titles carry a NEW tag. */
  readonly seenAt: number
  readonly newTrophies: ReadonlyArray<TrophyItemId>
  readonly newTitles: ReadonlyArray<TitleId>
  readonly decks: ReadonlyArray<{
    readonly id: string
    readonly name: string
    readonly archetype: string | null
    readonly format: string
    readonly isPublic: boolean
  }>
}

const make = Effect.gen(function* () {
  const db = yield* Db
  const achievements = yield* AchievementsService
  const catalog = yield* CardCatalog

  /** A player's identity with defaults applied. */
  const get = Effect.fn('PlayerStyleService.get')(function* (userId: string) {
    const rows = yield* styleRows([userId])
    return styleOf(userId, rows.get(userId))
  })

  /** Makes sure a user has a stored style: new accounts get their default look here. */
  const ensure = Effect.fn('PlayerStyleService.ensure')(function* (userId: string) {
    yield* insertDefaultStyles([userId], new Date(yield* Clock.currentTimeMillis))
  })

  const rewardsFor = Effect.fn('PlayerStyleService.rewardsFor')(function* (userId: string) {
    return rewardsOf(yield* achievements.earned(userId))
  })

  const editor = Effect.fn('PlayerStyleService.editor')(function* () {
    const me = yield* requireUser
    yield* ensure(me.id)
    const [rows, earned, deckRows] = yield* Effect.all(
      [
        styleRows([me.id]),
        achievements.earned(me.id),
        db.query((d) =>
          d
            .select({
              id: decks.id,
              name: decks.name,
              archetype: decks.archetype,
              format: decks.format,
              isPublic: decks.isPublic,
            })
            .from(decks)
            .where(eq(decks.userId, me.id))
            .orderBy(desc(decks.updatedAt)),
        ),
      ],
      { concurrency: 'unbounded' },
    )
    const row = rows.get(me.id)
    const seenAt = row?.achievementsSeenAt.getTime() ?? 0
    const rewards = rewardsOf(earned)
    const fresh = rewardsOf(earned.filter((e) => e.earnedAt > seenAt))
    return {
      style: styleOf(me.id, row),
      defaultAvatar: defaultAvatar(me.id),
      earned: {
        trophies: [...rewards.trophies],
        titles: [...rewards.titles],
        badges: Object.fromEntries(bestTiers(earned)),
      },
      seenAt,
      newTrophies: [...fresh.trophies],
      newTitles: [...fresh.titles],
      decks: deckRows,
    } satisfies StyleEditor
  })

  const ownPublicDeck = Effect.fn('PlayerStyleService.ownPublicDeck')(function* (userId: string, deckId: string) {
    const deck = yield* db.query((d) =>
      d.query.decks.findFirst({
        columns: { isPublic: true },
        where: and(eq(decks.id, deckId), eq(decks.userId, userId)),
      }),
    )
    if (!deck) return yield* new InvalidState({ reason: 'Feature one of your own decks' })
    if (!deck.isPublic) return yield* new InvalidState({ reason: 'Make the deck public to feature it' })
  })

  /** Finds the partner card in the catalog by name and id, and copies what the trainer card shows. */
  const resolvePartner = Effect.fn('PlayerStyleService.resolvePartner')(function* (partner: {
    cardId: string
    name: string
  }) {
    for (let page: number | null = 1; page !== null && page <= 5;) {
      const result: CardSearchResult = yield* catalog.search(partner.name, page)
      const card = result.cards.find((c) => c.id === partner.cardId)
      if (card) {
        return {
          partnerCardId: card.id,
          partnerName: card.name,
          partnerSetName: card.setName,
          partnerImageUrl: card.large ?? card.small,
        }
      }
      page = result.nextPage
    }
    return yield* new InvalidState({ reason: 'That card isn’t in the catalog' })
  })

  /**
   * Saves the editor's draft. Only trophy items, titles and badges the player has earned, only a public deck of their
   * own, and a partner card found in the catalog.
   */
  const save = Effect.fn('PlayerStyleService.save')(function* (input: PlayerStyleInput) {
    const me = yield* requireUser
    yield* ensure(me.id)
    const current = yield* get(me.id)
    const title = input.title as TitleId | null
    const avatar = input.avatar as Avatar
    const refusal = unearnedChoice(
      { avatar, banner: input.banner, title, showcase: input.showcase },
      yield* rewardsFor(me.id),
    )
    if (refusal) return yield* new InvalidState({ reason: refusal })
    if (input.featuredDeckId) yield* ownPublicDeck(me.id, input.featuredDeckId)
    const partner =
      input.partner === null
        ? { partnerCardId: null, partnerName: null, partnerSetName: null, partnerImageUrl: null }
        : input.partner.cardId === current.partner?.cardId
          ? {}
          : yield* resolvePartner(input.partner)

    yield* db.query((d) =>
      d
        .update(playerStyle)
        .set({
          avatar,
          sleeveColour: input.sleeveColour,
          banner: input.banner,
          bannerColour: input.bannerColour,
          titleId: title,
          showcase: [...input.showcase],
          featuredDeckId: input.featuredDeckId,
          ...partner,
        })
        .where(eq(playerStyle.userId, me.id)),
    )
    return yield* get(me.id)
  })

  /** Puts on one earned trophy item straight away (the celebration's Wear it). */
  const wear = Effect.fn('PlayerStyleService.wear')(function* (itemId: TrophyItemId) {
    const me = yield* requireUser
    yield* ensure(me.id)
    if (!(yield* rewardsFor(me.id)).trophies.has(itemId)) {
      return yield* new InvalidState({ reason: `You haven’t earned the ${trophyItem(itemId).name} yet` })
    }
    const current = yield* get(me.id)
    const item = trophyItem(itemId)
    const change =
      item.slot === 'banner'
        ? { banner: BANNERS.find((b) => b.trophy === itemId)!.id }
        : { avatar: { ...current.avatar, [item.slot]: itemId } }
    yield* db.query((d) => d.update(playerStyle).set(change).where(eq(playerStyle.userId, me.id)))
    return yield* get(me.id)
  })

  /** Shows an earned title, or none (the celebration's Show it). */
  const showTitle = Effect.fn('PlayerStyleService.showTitle')(function* (title: TitleId | null) {
    const me = yield* requireUser
    yield* ensure(me.id)
    if (title && !(yield* rewardsFor(me.id)).titles.has(title)) {
      return yield* new InvalidState({ reason: 'You haven’t earned that title yet' })
    }
    yield* db.query((d) => d.update(playerStyle).set({ titleId: title }).where(eq(playerStyle.userId, me.id)))
    return yield* get(me.id)
  })

  /** The signed-in player's default parts, for the editor's Default options and Reset all. */
  const mineDefault = Effect.fn('PlayerStyleService.defaultAvatar')(function* () {
    const me = yield* requireUser
    return defaultAvatar(me.id)
  })

  const searchPartner = Effect.fn('PlayerStyleService.searchPartner')(function* (query: string, page: number) {
    yield* requireUser
    return yield* catalog.search(query, page)
  })

  return { get, ensure, editor, save, wear, showTitle, defaultAvatar: mineDefault, searchPartner }
})

export class PlayerStyleService extends Context.Service<PlayerStyleService, Effect.Success<typeof make>>()(
  'tcgrank/server/identity/PlayerStyleService',
) {
  static readonly layer = Layer.effect(PlayerStyleService, make).pipe(Layer.provide(AchievementsService.layer))
}
