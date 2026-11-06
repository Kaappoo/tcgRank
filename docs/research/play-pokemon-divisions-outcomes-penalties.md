# Play! Pokémon rules: age divisions, match outcomes, penalties, software and Play! Pokémon details

Research for [#85](https://github.com/Kaappoo/tcgRank/issues/85) (map [#82](https://github.com/Kaappoo/tcgRank/issues/82)). Researched 2026-11-06. Terms follow `GLOSSARY.md` (Match, Game, Bye, Drop, Record, Match points, OMW%, Placement, Best of). **Play! Pokémon details** means a player's legal name, Player ID and birth date.

## Sources

Primary documents, all linked from the official [Play! Pokémon Rules & Resources page](https://www.pokemon.com/us/play-pokemon/about/tournaments-rules-and-resources):

| Short name | Document | Version |
| --- | --- | --- |
| **TRH** | [Play! Pokémon Tournament Rules Handbook](https://www.pokemon.com/static-assets/content-assets/cms2/pdf/play-pokemon/rules/play-pokemon-tournament-rules-handbook-en.pdf) | English, last revision **September 1, 2026** (previous issue May 21, 2026) |
| **TCG-H** | [Pokémon TCG Tournament Handbook](https://www.pokemon.com/static-assets/content-assets/cms2/pdf/play-pokemon/rules/play-pokemon-tcg-tournament-handbook-en.pdf) | English, last revision **September 1, 2026** |
| **PG** | [Play! Pokémon Penalty Guidelines (TCG, VG and GO)](https://www.pokemon.com/static-assets/content-assets/cms2/pdf/play-pokemon/rules/play-pokemon-penalty-guidelines-en.pdf) | English, last revision **September 1, 2026** (previous issue May 21, 2026) |
| **League Guide** | [League Challenges, Cups, and Prerelease Guide](https://www.pokemon.com/static-assets/content-assets/cms2/pdf/play-pokemon/rules/play-pokemon-league-challenges-cups-and-prerelease-guide-en.pdf) | English, last revision **September 1, 2026** |
| **Store Handbook** | [Play! Pokémon Store Handbook](https://www.pokemon.com/static-assets/content-assets/cms2/pdf/play-pokemon/rules/play-pokemon-store-handbook-en.pdf) | English, last revision **September 1, 2026** |
| **Privacy** | [Pokémon Privacy Notice](https://www.pokemon.com/us/privacy-notice), incl. section 9 "Play! Pokémon" and the Supplemental Kids' Privacy Notice | Updated **September 2, 2026** |
| **2027 changes** | [What's New in the 2027 Championship Series Season](https://championships.pokemon.com/en-us/about/2027-season-changes) | 2027 season page; rendered by JavaScript, so its text was read through a search-engine summary only |
| **Glossary** | [Play! Pokémon Glossary](https://www.pokemon.com/us/play-pokemon/about/tournaments-glossary) | Undated |

There is still no separate "Tournament Operation Procedures" document: event structure is in the TRH, game-specific rules in the TCG-H (as noted in the earlier [elimination research](https://github.com/Kaappoo/tcgRank/blob/research/play-pokemon-elimination-rules/docs/research/play-pokemon-elimination-rules.md)). The Play! Pokémon Terms of Use is referenced by the TRH (1.1) but its text was not found as a document; facts about personal data come from the Privacy Notice and the handbooks.

Confidence: **High** = quoted from a primary document above. **Lower** = inferred from primary wording, or only in secondary sources (named).

## 1. Age divisions

- **Three divisions: Junior, Senior, Masters.** A player's division "is set at the beginning of the tournament season based on that competitor's year of birth and does not change over the course of that season" (TRH 5.1.3). **High.**
- **The season, and so the divisions, change over on September 1 at 00:00 UTC** each year (TRH 5.1.3). **High.**
- **Cutoffs for the 2026–27 season (the "2027 season", September 1, 2026 to Worlds 2027):**

  | Division | Born |
  | --- | --- |
  | Junior | 2015 or later |
  | Senior | 2011–2014 inclusive |
  | Masters | 2010 or earlier |

  Source: TRH 5.1.3 table (Sept 1, 2026 revision). **High** for the years. Note the table is captioned "2026 Championship Season Age Divisions", but its years match the 2027 season as published on the [2027 changes page](https://championships.pokemon.com/en-us/about/2027-season-changes) (same years; read via search summary, **lower** for the page text itself). Treat the caption as a labelling slip.
- **Previous season (2025–26, "2026 season"):** Junior 2014 or later, Senior 2010–2013, Masters 2009 or earlier. Only seen in secondary coverage ([Victory Road](https://victoryroad.pro/2026-season-structure), search summaries). **Lower.**
- **The rule of the shift:** each season every boundary moves one birth year later. Junior covers the 4+ most recent birth years open-ended, Senior exactly 4 birth years, Masters everything older. Generalised: for the season that starts on September 1 of year *Y* (named season *Y*+1), Junior = born ≥ *Y*−11, Senior = *Y*−15 … *Y*−12, Masters = born ≤ *Y*−16. Derived from the two seasons above. **Lower** (a pattern, not a stated formula), but it matches every season in the secondary record.
- **Playing up (a younger player entering an older division): not provided for.** No current primary document mentions it; the TRH says the division is set from the year of birth and does not change, and the glossary says players are grouped "based on the year they were born". There is no mechanism to opt into an older division. **High** that no rule allows it; **lower** that it is expressly forbidden (absence of a rule).
- **Minimum age:** Championship Series events (League Challenges and League Cups included) exclude "competitors below 6 years of age" (TRH 2.1.2). Some games carry national age ratings (TRH 2.1; 2027: Pokémon Champions under-12 in Germany and under-14 in Brazil, a video-game matter, not TCG). **High** for TRH 2.1.2.
- **Pokémon GO has no age divisions** in the 2027 season (2027 changes page via search summary). Not relevant to a TCG app. **Lower.**

## 2. Combining divisions

- **Threshold: fewer than six competitors in a division** → "age-combined play (or age-modified Swiss)" (TRH 5.2.1). It is the same for every event tier; the TRH gives no per-tier thresholds. **High.**
- **Which divisions combine** (TRH 5.2.1, the software does this):
  1. Juniors < 6 → combine with Seniors.
  2. If still < 6 → Juniors + Seniors combine with Masters.
  3. Juniors ≥ 6 but Seniors < 6 → Seniors combine with Masters.
  4. Only Masters < 6 → Masters combine with Seniors.

  **High.**
- **What is shared:** "Combined-age-division pods only share Swiss round pairings. Each age division has its own standings and, if applicable, single-elimination top cut." Competitors "are separated by age division for single-elimination rounds" (TRH 5.2.1). **High.**
- **Event minimum:** "Tournaments may be run with as few as four competitors even though the minimum for an age-separated pod is six" (TRH 5.2.1). A sanctioned tournament needs at least 4 competitors and 3 full rounds (TRH 5.2). **High.**
- **Separated divisions:** with at least six in each division, "each division is run as a separate tournament, though the results of all three divisions are reported as a single tournament" (Glossary, "Age-Separated Swiss Pairing"). **High.**
- **Round counts and top cut** follow attendance *per age division* (TRH 5.5.6 tables, see the earlier elimination research). **High.**
- **Prizes:** League Cup playmats go to "the winner in each age division (as determined by their standings after Swiss rounds and any age division single-elimination rounds, per section 5.2.1 of the Tournament Rules Handbook)" (League Guide 6.4). Championship Points are awarded by placement in the final standings (TRH 4.6.2). **High.**
- **Restricting divisions:** League Challenges "cannot restrict any demographics from participating (such as holding a League Challenge for Masters Division players only)" (League Guide 4). **High.**
- **Not stated anywhere:** whether pairing inside a combined pod prefers same-division opponents. The glossary's "Age-Modified Swiss Pairing" says players "are paired both by record and by age division" and "may be matched with players from other age divisions in certain circumstances", which suggests TOM pairs within a division first. **Lower** for the exact algorithm; whether the combination can be undone after round 1 is not addressed.

## 3. Match outcomes

Base scoring (TRH 5.3.2): win 3 match points, tie 1, loss 0. Record is W/L/T (TRH 5.3.1). A bye "counts as a win for that competitor's match record but does not count as a round played when calculating that competitor's win percentage" (TRH 5.6.1). **High.**

**Win % (used for OMW% and OOMW%)** (TRH 5.3.3.1), **high**:

- A competitor who **completes** the tournament: wins ÷ total number of rounds in the tournament, minimum 25 %, **maximum 100 %**.
- A competitor who **dropped**: wins ÷ rounds they participated in, minimum 25 %, **maximum 75 %**.
- "Rounds in which a competitor received a random bye do not count as a win" for this calculation.
- Swiss tiebreakers in order: OMW%, OOMW%, then head-to-head only if exactly two are tied and played each other; otherwise random (TRH 5.5.2.1).

Outcomes:

| Outcome | What the rules say | Match points / Record / win % | Confidence |
| --- | --- | --- | --- |
| **Game loss** (penalty) | "The game is recorded as a loss for the competitor receiving the penalty" (PG 3.5). During a game: that game is lost, the next game is set up if one would be played (PG 4.3.3). Right after a game ends: applies to that game. **Between rounds: applies to the competitor's next game.** Competitors cannot concede to avoid it (PG 2.1.1). | It is a game in the match score (e.g. moves 1–0 to 1–1); the match then resolves normally. | High |
| **Double game loss** in a best of three where each player has already lost one game | "In Swiss formats/rounds, this match will be recorded as a tie. In single elimination or in a match that requires a winner, the competitors must then play a tiebreaker game" (TCG-H 7.2). | Swiss: tie, 1 point each. Elimination: tiebreaker game decides. | High |
| **Double game loss** in a **single-game** match | "A single-game match terminated in this manner is not a tie; it is recorded as having no winner" (PG 4.3.3). | Not a tie, so 0 points each; most likely a loss for both on the record (a double loss). The documents don't spell out the record entry. | High for "not a tie, no winner"; lower for "loss for both" |
| **Double game loss** in game 1 or 2 of a best of three otherwise | Not addressed. Reading PG 4.3.3 literally, the game has no winner and play moves to the next game. | — | Lower (gap) |
| **Match loss** (penalty) | "The match immediately ends and is recorded as a loss for the offending competitor" (TRH 7.2, PG 3.6). During a match, the current game is also a loss. Between rounds: applies to the competitor's next match (PG 4.3.4). | Loss, 0 points; opponent gets the win. | High |
| **Double loss** (match loss to both) | "In extreme cases where significant errors have been made by both competitors in a match, a Match Loss penalty may be issued to both competitors simultaneously" (TRH 7.2). | Both get a loss and 0 match points; both lose a win-% round. | High that it exists; the record effect is inferred from "recorded as a loss" (lower) |
| **No-show / severe tardiness** (more than 10 minutes late) | "a) the tardy competitor receives a Match Loss for their round, b) the tardy competitor is dropped from the event, and c) the present competitor receives a Match Win for their round." They may re-enter only "if the subsequent round has not been paired and the competitor confirms their participation with the Tournament Organizer" (PG 5.2.1). | Absent player: loss + drop (so win % capped at 75 %). Present player: a **match win**, not a bye, so it counts as a win in their win % and the absent player stays their opponent for OMW%. | High for the rule; lower for the OMW% consequence (inferred) |
| **Minor / major tardiness** | Under 5 minutes: Warning. 5–10 minutes: Game Loss (PG 5.2.1). Also the **Tardiness Clause**: a player who was late or away without permission loses an unresolved match once time and +3 turns are up (TCG-H 7.4.4.1). | — | High |
| **Drop mid-match** | "will receive a loss for all their games that have yet to resolve"; dropped after the round (TRH 5.7.1). Dropped players stay in final standings (TRH 5.7.2). | Loss for the match. | High |
| **Disqualification** | During Swiss with a match in progress: Match Loss for that match, then DQ. Not playing: DQ applies at once. In single elimination: Match Loss for the most recent elimination match; opponent advances (PG 4.3.6). The DQ'd player is "removed from the standings completely" and gets no prizes (TRH 5.7.3); other players' standings normally don't change (TRH 4.6.3). | Removed from standings. | High |
| **Intentional draw / concession** | Allowed: concede for any reason, or in TCG make a single offer to draw. Deciding by coin flip, bribery, or by looking at standings is not (TRH 5.4). | Tie or loss as agreed. | High |

## 4. Late entries

- The organizer may refuse a late competitor. "It is recommended that competitors not be added after the third round of the tournament is completed"; at Championship Series events (League Challenges and League Cups included) they "should not be added" after round 3 (TRH 5.2.2, 5.2.2.1). **High.**
- A late competitor "will be paired in the following round. That competitor will receive losses for the current round and any round that has already completed" (TRH 5.2.2). **High.**
- Late entrants added after round 1 is paired "will not contribute to the number of rounds that tournament will feature" (TRH 5.2.2, 5.5.4). **High.**
- **Tiebreakers:** the rules don't single these losses out. Win % for a player who completes the event is wins ÷ *total number of rounds in the tournament* (TRH 5.3.3.1), so missed rounds count against the late player's own win % exactly like played losses (floored at 25 %). Since the losses have no opponent, they cannot appear in anyone else's OMW% list. **Lower** (inferred from the formula; TOM records them as losses without an opponent).

## 5. Penalties

**Ladder** (TRH 7.2, PG 3), mildest first, **high**:

1. **Caution**: verbal, "not reported to Play! Pokémon".
2. **Warning**: minor, **reported**.
3. **Double Prize Card penalty (DPC)**, TCG only: the opponent needs two fewer Prize cards to win this game (wins at once if already there).
4. **Quadruple Prize Card penalty (QPC)**, TCG only: four fewer.
5. **Game Loss**: may be given to both players at once.
6. **Match Loss**: may be given to both players at once.
7. **Disqualification**: removed from standings, no prizes, may be asked to leave.

(The older term "prize loss" is now DPC/QPC.)

**Base infraction categories and recommended starting penalties** (PG 5), **high**:

| Category (PG section) | Minor | Major | Severe |
| --- | --- | --- | --- |
| Procedural Error (5.1) | Caution | Warning | Game Loss |
| Tardiness (5.2) | Warning (< 5 min) | Game Loss (5–10 min) | > 10 min: Match Loss + drop, opponent gets a Match Win |
| Unsporting Conduct (5.3) | Warning | Match Loss | Disqualification |
| Cheating (5.4) | — | — | Always Disqualification, no deviations |
| Gameplay Error, TCG (5.5.1) | Warning | DPC | Game Loss |
| Legality Checks, TCG deck (5.6.1) | Warning | Game Loss | Disqualification |
| Pace of Play (5.7) | Warning | — | DPC |

Judges may escalate or de-escalate from the starting penalty for reversibility, repeated infractions, and age and experience (PG 4.4). Repeat infractions "do not always require escalation" (PG 4.1.1). Time extensions are allowed for rulings (capped at 16 minutes at Regionals and above) (PG 4.6).

**Who may issue** (PG 2.1, 3.2 note, 4.1, 4.3.1; TRH 3.3.4.2), **high**:

- Judges, and Tournament Organizers acting as Judges, issue penalties.
- "While the Tournament Organizer and other Judges may assign penalties, they should always check with the Head Judge or Assistant Head Judge before assigning a penalty more severe than a Warning." All Cautions and Warnings are reported to the Head Judge.
- If an event has only an Organizer and no other staff, "the Organizer is also the Head Judge" (TRH 3.3.4.2). A League Challenge or League Cup needs only an Organizer with the right Professor roles; a Judge is recommended but not required (League Guide 6.2).
- Appeals go to the Head Judge, whose ruling is final on site (TRH 4.3.3).
- At Regionals and above, a DQ needs at least three Judges including the Head Judge (PG 4.1).

**What is reported to TPCi** (TRH 7.5, PG 6), **high**:

- A **Tournament Penalty Summary** for every event: a CSV with columns *Tournament ID, Round of Issue, Judge Player ID, Competitor's Player ID, Category, Severity, Penalty, Notes*, one row per penalty, submitted by the Organizer via the customer-support "Tournament Report" tool within **7 days**. Warnings and above are logged; Cautions are not.
- A **Disqualification Report** from the Head Judge for each DQ (using the template on the Professor Community site), through a support ticket within **14 days**, with all contributing factors and the names and Player IDs of the Judges present. No-shows are excepted (TRH 3.3.4.2).
- Penalty information should be treated with sensitivity; Judges shouldn't comment publicly on penalties they weren't part of (TRH 7.3.1, PG 4.5.1). TPCi itself may publish "competitor penalties" (TRH 2.3).

## 6. Who may run a sanctioned event; TOM and third-party software

- "When a tournament is created in Play! Tools, it is 'sanctioned.' Any tournament that uses Play! Tools and the Play! Pokémon Tournament Operations Manager (TOM) is considered a 'sanctioned event'" (TRH 4.1.2). **High.**
- "For larger tournaments, such as Regional Championships, Special Championships, International Championships, and World Championships, **third-party programs may be used** to run and manage tournament operations" (TRH 4.1.2). Nothing grants the same for League-level events. **High.**
- League Challenges and League Cups: the League Guide gives the **TOM mode** to use (TCG League Challenge, TCG League Cup) (League Guide 4.2.1, 5.2.1). Prereleases "must be sanctioned through Play! Tools and run using Tournament Organization Manager (TOM). The results must then be uploaded from TOM into Play! Tools" (League Guide 3.4). Friendly Tournaments sanctioned in Play! Tools "must be operated via the Tournament Operations Manager (TOM)" (Store Handbook 6.1.1). **High.**
- A store may be actioned for "**Failing to use Play! Tools and TOM to run events**" (Store Handbook 8.1). **High.**
- Championship Series events "may not be sanctioned without the use of a special tool"; sanctioned at least 7 days ahead; never retroactively (TRH 4.1.2.2–4.1.2.3). Results must be reported on pokemon.com within 7 days (TRH 4.4). **High.**
- A Scorekeeper "must hold the appropriate certification to operate tournament software" (TRH 3.3.5). **High.**
- The Organizer is a certified Professor, must be present for the whole event (TRH 3.3.3, 4.3.2.1). Match slips are required at TCG Championship Series events including League Challenges and Cups; digital match slips are only allowed at Regionals and above (TRH 4.3.4.1–4.3.4.2). **High.**
- **Unsanctioned events:** nothing in these documents restricts software for events that are not sanctioned (a store's casual night). Publishing results is free, "subject to local, state, and national laws" (TRH 2.3). **High** that no rule covers them.

Consequence for tcgRank: for any sanctioned store event (Friendly Tournament, League Challenge, League Cup, Prerelease), the Organizer must run it in TOM and upload to Play! Tools. tcgRank cannot be the system of record for those events under the current rules. It can run unsanctioned events and could, at most, mirror a TOM-run event. Replacing TOM for sanctioned League events would need TPCi permission (TRH 5.5 also requires "express written permission" for other tournament styles).

## 7. Storing a minor's birth date (Play! Pokémon details)

- **What TPCi itself collects and shares:** the Privacy Notice (section 9) says Pokémon uses personal information "to track your tournament results, player ranking, rating, and player status", and "may disclose your personal information to independent third parties (such as League Leaders, League Assistants, and Tournament Organizers)". For a player without a Pokémon account it retains "first name, first initial of last name, date of birth, and any Championship Points". **High.**
- **Children (under 13, or the local legal age):** Pokémon collects a parent's email and obtains verifiable parental consent; it may "disclose the kid's personal information to independent third parties … so they can run offline Play! Pokémon events"; a parent who doesn't want that "should not allow their kid to participate in the Play! Pokémon tournament ratings". Pokémon does not, "nor does it allow third parties to, collect kids' personal information … for targeted advertising, amassing a profile, or any purpose other than to support its internal operations". Pokémon is in CARU's COPPA Safe Harbor program (Privacy, Supplemental Kids' Privacy Notice). **High.** That last sentence binds parties acting for Pokémon; whether it binds a store's own app is not stated. **Lower.**
- **Store roster:** for each new League participant the store records "their name (first name and at least the initial of their last name), Player ID, and **year of birth**" in Play! Tools; the roster is erased at each League cycle end (Store Handbook 3.3.3, 3.3.2.1). Note: **year**, not full date. **High.**
- **Public display:** TPCi posts full name or first name + last initial for players 13+, and for under-13s only a screen name if the parent chooses (Privacy 9). **High.**
- **Account rules:** players under 13 get a child account under a guardian's Pokémon Trainer Central account after identity verification (TRH 2.2). One Player ID per person; multiple IDs breach the Terms of Use (League Guide 6.1). **High.**
- **Nothing in the Play! Pokémon documents governs a third-party app's own storage** of a minor's birth date. That falls to local law (GDPR/UK GDPR, COPPA in the US, etc.) and to the store as data controller. The Play! rules only need the **birth year** to place a player in a division (TRH 5.1.3), so storing the year rather than the full date is enough and minimises data. **High** for "nothing in the Play! documents"; legal requirements are out of scope here.

## Open questions

1. How TOM records a single-game double game loss and a double match loss in W/L/T (assumed loss for both).
2. Double game loss in game 1 or 2 of a best of three when neither player has lost a game: not addressed.
3. Exact age-modified pairing algorithm (same-division preference) in a combined pod.
4. Whether late-entry losses are stored with an opponent of "none" or a phantom; the effect on OMW% above is inferred.
5. The 2027 changes page couldn't be read directly (JavaScript-only); its division years were confirmed only through a search summary, but they match the TRH table.
6. The Play! Pokémon Terms of Use text itself wasn't located.
7. Whether TPCi grants exceptions to the TOM requirement for League events (none found).

## Differences from today's tcgRank (for the map)

- `src/domain/standings.ts` computes win % as wins ÷ matches played excluding byes, floored at 25 %. Play! uses wins ÷ **total rounds of the tournament** for players who finished (byes not counted as rounds), and a **75 % cap** for dropped players. Head-to-head is the third Swiss tiebreaker, after OOMW%.
- tcgRank treats an opponent who dropped as a bye; Play!'s severe tardiness gives the present player a **match win** against the absent player.
