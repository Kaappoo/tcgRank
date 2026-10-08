# Play! Pokémon rules: top cut, elimination ties and seeding

Research for [#8](https://github.com/Kaappoo/tcgRank/issues/8) (map [#6](https://github.com/Kaappoo/tcgRank/issues/6)). Researched 2026-10-08.

## Sources

All primary, linked from the official [Play! Pokémon Rules & Resources page](https://www.pokemon.com/us/play-pokemon/about/tournaments-rules-and-resources):

| Short name | Document | Version |
| --- | --- | --- |
| **TRH** | [Play! Pokémon Tournament Rules Handbook](https://www.pokemon.com/static-assets/content-assets/cms2/pdf/play-pokemon/rules/play-pokemon-tournament-rules-handbook-en.pdf) | English, last revision **September 1, 2026** |
| **TCG-H** | [Pokémon TCG Tournament Handbook](https://www.pokemon.com/static-assets/content-assets/cms2/pdf/play-pokemon/rules/play-pokemon-tcg-tournament-handbook-en.pdf) | English, last revision **September 1, 2026** |
| **League Guide** | [Play! Pokémon League Challenges, Cups, and Prerelease Guide](https://www.pokemon.com/static-assets/content-assets/cms2/pdf/play-pokemon/rules/play-pokemon-league-challenges-cups-and-prerelease-guide-en.pdf) | English, last revision **September 1, 2026** |

Notes on sources:

- There is no separate "Tournament Operation Procedures" document on the Rules & Resources page any more. Event structure lives in the TRH; game-specific match rules (time, ties, top-cut game rules) moved into the per-game TCG-H.
- The single-day attendance table (Variant #3) is unchanged from the TRH revision of January 1, 2025, so it has been stable for at least two seasons.
- Every attendance table counts **competitors per age division** (Junior, Senior, Masters). Each division has its own standings and its own top cut, even when small divisions are combined for Swiss (TRH 5.2.1).

## 1. Top cut size by attendance, per event tier

Which structure each TCG tier uses (TRH 5.5.6, "Championship Series Event Tournament Structures"; League Guide 4.2.1 and 5.2.1):

| Tier | TOM mode | Structure |
| --- | --- | --- |
| League Challenge | TCG League Challenge | **Variant #2: Swiss only, no top cut** |
| League Cup | TCG League Cup | **Variant #3: TCG Single Day, Swiss + single elimination** |
| Regional / International Championships | TOM Two Phase Championship | Variant #5: two-phase Swiss, then an "asymmetrical" top cut |
| Prerelease | Prerelease/Draft | Swiss only or Swiss + single elimination, organizer's choice (League Guide 3.4) |

**Variant #2: TCG Swiss Rounds Only (League Challenge)** (TRH 5.5.6.1)

| Competitors per age division | Swiss rounds | Elimination rounds |
| --- | --- | --- |
| 4–8 | 3 | 0 |
| 9–16 | 4 | 0 |
| 17–32 | 5 | 0 |
| 33–64 | 6 | 0 |
| 65–128 | 7 | 0 |
| 129–256 | 8 | 0 |
| 257–512 | 9 | 0 |
| 513+ | 10 | 0 |

**Variant #3: TCG Single Day (League Cup)** (TRH 5.5.6.1)

| Competitors per age division | Swiss rounds | Elimination rounds | Top cut |
| --- | --- | --- | --- |
| 4–8 | 3 | 0 | none |
| 9–12 | 4 | 2 | top 4 |
| 13–20 | 5 | 2 | top 4 |
| 21–32 | 5 | 3 | top 8 |
| 33–64 | 6 | 3 | top 8 |
| 65–128 | 7 | 3 | top 8 |
| 129–226 | 8 | 3 | top 8 |
| 227–409 | 9 | 3 | top 8 |
| 410+ | 10 | 3 | top 8 |

The handbook gives the number of elimination rounds; the "top cut" column is derived (2 rounds = 4 players, 3 rounds = 8). A League Cup's cut is therefore always top 4 or top 8 and never needs byes.

**Variant #5: Two Phase 2026 Championship Format (Regionals and up)** (TRH 5.5.6.2): 4–8 players have no cut, then "Asymmetrical Top 2" (9–16), "Top 4" (17–32), "Top 6" (33–64) and "Top 8" (65+). These are tagged "Natural Swiss", "Natural Swiss +1" or "Natural Swiss +2". An asymmetrical top cut may hold at most 16 TCG competitors. **Unverified:** neither handbook defines "asymmetrical top cut" or "Natural Swiss +N". From the wording it appears to mean "everyone within N match-record steps of the natural cut line makes it", so the size varies, but no primary text says so. This tier is outside a store app's scope.

Minimums for any sanctioned tournament (TRH 5.2): at least 4 competitors, at least 3 full rounds, and every competitor must meet a valid opponent before round 3 completes.

## 2. Top cut matches: best-of, time, end of round, ties

- **Best-of:** "Single-elimination rounds at Championship Series events using the Swiss + single-elimination tournament structure must use best-of-three matches" (TRH 5.5.7). For Swiss the organizer may choose single game or Bo3 (League Guide 5.2.1: "Single game or best-of-three"). So at a League Cup the Swiss may be Bo1 while the top cut is always Bo3.
- **Round time:** there are minimums only. A single game gets 30 minutes and a Bo3 gets 50 (TRH 5.5.7), and these apply to top-cut rounds as well. Neither handbook sets a longer top-cut time. **Unverified/absent:** the longer top-cut timers seen at some events are not specified in these documents.
- **Who goes first:** in top-cut matches "the higher-seeded player in the single-elimination bracket has the choice of going first or second in Game 1". In later games the loser of the previous game chooses (TCG-H 7.2).
- **End of round** (TCG-H 7.4.3): time is called when the round timer hits 0. Players then have **15 additional minutes to complete +3 turns**, and the round ends for everyone when that 15-minute window runs out. If time is called during Pokémon Checkup, the next player's turn is the first of the three.
- **Tardiness clause first** (TCG-H 7.4.4.1): a player who was late, or away without a judge's permission, loses the unresolved match once the +3 turns are up.
- **A top-cut match cannot end in a tie.** "Matches during single-elimination tournaments may not result in a tie" (TCG-H 7.4.4.3). After +3 turns:

  | Time called | Result (single elimination, Bo3) |
  | --- | --- |
  | During game 1 | Player with the fewest Prize cards remaining wins the match |
  | Between games 1 & 2 | Winner of game 1 wins |
  | During game 2 | Winner of game 1 wins |
  | Between games 2 & 3 (1–1) | Winner of a **tiebreaker game** wins |
  | During game 3 | Player with the fewest Prize cards remaining wins |

  If Prize cards are equal, "the game must continue until one competitor either satisfies this tiebreaker or wins the game outright" (TCG-H 7.4.4.3).
- **Tiebreaker game** (TCG-H 7.4.3.1): a fresh game with 6 Prize cards and a coin flip for first turn. The first player to get **ahead on Prize cards** (or to win outright) wins it. It is also used when both players take their last Prize card at the same moment, or when both get a simultaneous second Game Loss in a single-elimination match (TCG-H 7.2).
- **Unbreakable loops** (TCG-H 7.4.3.2, rare): after +1 turn and a tiebreaker game, the player **seeded highest in Swiss** wins the game.
- For contrast, in Swiss the match **is** a tie when time is called during game 1, between games 2 and 3, or during game 3. If time is called after game 1 or during game 2, the winner of game 1 wins (TCG-H 7.4.4.2).

App implications: in a store app the host enters results, so "fewest Prize cards / tiebreaker game" is something played out at the table. The app's job is to refuse a drawn result in an elimination match, since a winner must always be reported.

## 3. Seeding and byes

- **Swiss + top cut** (TRH 5.5.8): after Swiss, players are ranked by match points and Swiss tiebreakers (Op Win %, then Op Op Win %, then head-to-head or random; TRH 5.5.2.1). The top N "will then be seeded into single-elimination brackets, equal to the number of slots available in the bracket". **The seed is the Swiss rank.**
- **Pure single elimination** (TRH 5.5.3): "Competitors are assigned seeds at random and then paired based on the standard single-elimination brackets."
- **Field not a power of two** (TRH 5.5.3.1): "the highest-seeded competitors receive byes". The number of byes is the next power of two minus attendance (worked example in the handbook: 53 players gives 64 − 53 = 11 byes for seeds 1–11).
- **Bracket order (1v8, 4v5, 2v7, 3v6): unverified.** The handbook only says "standard single-elimination brackets" and never prints the slot order. The usual layout keeps seeds 1 and 2 apart until the final: 1v8 and 4v5 in one half, 2v7 and 3v6 in the other. This is what TOM produces in practice, but no primary text states it. With byes, the bye seeds take the top slots of that same layout.
- League Cup cuts are always 4 or 8, so byes in elimination only arise in a host-chosen pure single-elimination event or in Regionals-style asymmetrical cuts.
- Placement playoffs: the organizer may announce up front that the two Top 4 losers play off for 3rd and 4th instead of using tiebreakers (TRH 5.5.3.3).

## 4. Final placement of players knocked out in the same round

There are two different rules, depending on the structure:

- **Swiss + top cut** (TRH 5.5.8): "After each round of single elimination, eliminated competitors are ranked according to their final Swiss ranking, with the highest-seeded competitor taking the highest rank available for that bracket." For example, in a top 8 the four quarter-final losers take places 5–8 in order of their Swiss rank, and the two semi-final losers take 3–4 the same way (unless a 3rd-place playoff was announced).
- **Pure single elimination** (TRH 5.5.3.2): "All other competitors are ranked based on the final record of the opponent who knocked them out". A first-round loser to the eventual winner ranks above every other first-round loser. **Unspecified:** what happens when two such opponents have the same final record. The handbook gives no further tiebreaker; random or seed order are both plausible.

## Swiss round counts vs `recommendedRounds`

`src/domain/swiss.ts` `recommendedRounds` claims to follow "the Play! Pokémon attendance table for League Challenges and Cups". It matches the **League Cup (Variant #3)** Swiss column for 4–226 players:

| Players | App | League Cup (V3) | League Challenge (V2) |
| --- | --- | --- | --- |
| 1–2 | 1 | not sanctionable (min 4) | not sanctionable |
| 3 | 3 | not sanctionable | not sanctionable |
| 4–8 | 3 | 3 | 3 |
| 9–12 | 4 | 4 | 4 |
| 13–16 | **5** | 5 | **4** |
| 17–20 | 5 | 5 | 5 |
| 21–32 | 5 | 5 | 5 |
| 33–64 | 6 | 6 | 6 |
| 65–128 | 7 | 7 | 7 |
| 129–226 | 8 | 8 | 8 |
| 227–256 | **8** | **9** | 8 |
| 257–409 | **8** | **9** | **9** |
| 410–512 | **8** | **10** | **9** |
| 513+ | **8** | **10** | **10** |

- With no top cut (League Challenge, Variant #2), the app plays **one round too many for 13–16 players** (5 rather than 4). The two tables really do differ there.
- Above 226 players the app caps at 8. This is irrelevant for a store.
- The official tables count players **per age division**. The app counts all entrants.
- A follow-up for the pairing-systems spec: the recommended round count should depend on whether a top cut follows (V3 when it does, V2 when it doesn't). The top-cut size comes from V3's elimination column (top 4 for 9–20, top 8 for 21+, none for 8 or fewer).

## Unverified or not covered by primary sources

- The exact bracket slot order (1v8, 4v5, 2v7, 3v6) and where bye seeds sit. The handbook says only "standard single-elimination brackets".
- A top-cut-specific round time beyond the 50-minute Bo3 minimum.
- The meaning of "asymmetrical top cut" and "Natural Swiss +N" in Variant #5.
- The tiebreaker between same-round losers in pure single elimination when their eliminators' records are equal.
