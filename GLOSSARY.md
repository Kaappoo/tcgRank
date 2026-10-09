# Glossary

Domain language for tcgRank. Code, UI copy and issues should use these terms.

| Term | Meaning | In code |
| --- | --- | --- |
| **Event** | One tournament night at a store (League Challenge, League Cup, casual night). Has a host, a format, a round timer and a join code. | `events` table, `EventsService` |
| **Host** | The signed-in user who created the event. Only the host pairs rounds, controls the clock, overrides results and finishes the event. | `events.hostId` |
| **Entry / Player** | A user registered in an event, optionally with a registered deck. | `event_players` |
| **Join code** | Six characters from an unambiguous alphabet (no 0/O/1/I/L). Encoded in the QR code as `/join/<code>`. | `domain/ids.ts` |
| **Round** | One round of pairings under the event's pairing system. Exactly one round is `active` at a time. Owns the match clock. | `rounds` |
| **Match** | Two players at a numbered table in a round, played over the event's **Best of**. A match with no player 2 is a **bye**. | `matches` |
| **Game** | One play of the card game within a match. A match's score counts games won by each player ("2–1"). _Avoid_: "match" for a single game. | `player1Games`, `player2Games` |
| **Best of** | An event setting chosen by the host: the most games a match can have (1, 3 or 5). A player who wins a majority of them (1, 2 or 3) wins the match. | |
| **Incomplete report** | A report in which neither player reached a majority of the best-of, e.g. 1–0 or 1–1 in a best of three. Allowed after a warning; the player with more games wins, equal games is a tie. | |
| **Elimination round** | A round of a top cut or a single-elimination event: a match's loser is out, so a match can't end in a tie. | |
| **Pairing system** | How an event builds its rounds: **Swiss**, **round robin** (everyone plays everyone once) or **single elimination** (losers are out). Chosen by the host. | |
| **Top cut** | A single-elimination bracket of the best-ranked players who haven't dropped, played after the Swiss rounds of an event the host set up with one, as at League Cups. Its size (top 2, 4 or 8) follows attendance unless the host changes it when cutting. | |
| **Seed** | A player's starting position in a bracket, 1 being the strongest. Top cut seeds come from Swiss rank; single-elimination seeds are drawn at random. The highest seeds receive any byes. | |
| **Schedule** | In round robin, which round each pair of players meets in. Drawn at random when round 1 is paired and fixed from then on; entries close at that point. | |
| **Pairing** | The assignment of players to tables for a round, produced by `pairRound`. | `domain/swiss.ts` |
| **Bye** | Free win (3 points) for a player with no opponent this round. In Swiss it goes to the lowest-ranked active player who has not had one; in round robin the schedule gives each player of an odd field exactly one; an opponent who dropped also gives one. In an elimination round a bye only advances the player. | `outcome = 'bye'` |
| **Report** | A player (or host) submitting a game score. A player report is **pending** until confirmed. | `reportedById`, `reportedAt` |
| **Confirm** | The opponent agreeing with a report (or reporting the same score). Host reports are confirmed immediately. Only confirmed matches count. | `confirmedAt` |
| **Drop** | A player leaving mid-event. They keep their results but are not paired again; in round robin their remaining matches become byes for those opponents, and they can't rejoin. | `droppedAtRound` |
| **Match points** | Win 3, tie 1, loss 0, bye 3. | `domain/standings.ts` |
| **Head-to-head** | In round robin, the result of the match between two players tied on match points; the winner ranks higher. Only breaks a tie between exactly two players. | |
| **OMW%** | Opponents' match-win percentage. Each opponent's win % is floored at 25%; byes are excluded. First tiebreaker. | `opponentWinPercentage` |
| **OOMW%** | Opponents' opponents' match-win percentage. Second tiebreaker. | `opponentOpponentWinPercentage` |
| **Match clock** | Round countdown stored as `endsAt` (running) or `pausedRemainingMs` (paused) so every phone shows the same time. | `domain/match-clock.ts` |
| **Time** | When the clock hits zero: current turn is turn 0, then three more turns. The clock shows overtime as `+mm:ss`. | `clockPhase = 'overtime'` |
| **Registered deck** | The deck a player enters an event with. Can be changed until round 1 starts, then it is locked. Only the player and the host see it until the event ends. | `event_players.deckId` |
| **Deck required** | An event setting chosen by the host: players must register a 60-card deck in the event's format to enter. Without it, players may skip registering a deck. | `events.deckRequired` |
| **Deck list** | A PTCG Live / Limitless export. Stored raw, parsed on read into Pokémon / Trainer / Energy sections. | `domain/deck-list.ts` |
| **Cover card** | The card from a deck's own list that the owner picks as the deck's face. Without a pick, the deck's most-played Pokémon. | `decks.coverCard` |
| **Store screen** | Full-screen projector view for the store TV: QR, clock and an alphabetical pairing list. | `/events/$eventId/screen` |
