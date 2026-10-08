# Glossary

Domain language for tcgRank. Code, UI copy and issues should use these terms.

| Term | Meaning | In code |
| --- | --- | --- |
| **Event** | One tournament night at a store (League Challenge, League Cup, casual night). Has a host, a format, a round timer and a join code. | `events` table, `EventsService` |
| **Host** | The signed-in user who created the event. Only the host pairs rounds, controls the clock, overrides results and finishes the event. | `events.hostId` |
| **Entry / Player** | A user registered in an event, optionally with a registered deck. | `event_players` |
| **Join code** | Six characters from an unambiguous alphabet (no 0/O/1/I/L). Encoded in the QR code as `/join/<code>`. | `domain/ids.ts` |
| **Round** | One Swiss round. Exactly one round is `active` at a time. Owns the match clock. | `rounds` |
| **Match** | Two players at a numbered table in a round, best of three. A match with no player 2 is a **bye**. | `matches` |
| **Pairing** | The assignment of players to tables for a round, produced by `pairRound`. | `domain/swiss.ts` |
| **Bye** | Free win (3 points) for the odd player out. Goes to the lowest-ranked active player who has not had one. | `outcome = 'bye'` |
| **Report** | A player (or host) submitting a game score. A player report is **pending** until confirmed. | `reportedById`, `reportedAt` |
| **Confirm** | The opponent agreeing with a report (or reporting the same score). Host reports are confirmed immediately. Only confirmed matches count. | `confirmedAt` |
| **Drop** | A player leaving mid-event. They keep their results but are not paired again. | `droppedAtRound` |
| **Match points** | Win 3, tie 1, loss 0, bye 3. | `domain/standings.ts` |
| **OMW%** | Opponents' match-win percentage. Each opponent's win % is floored at 25%; byes are excluded. First tiebreaker. | `opponentWinPercentage` |
| **OOMW%** | Opponents' opponents' match-win percentage. Second tiebreaker. | `opponentOpponentWinPercentage` |
| **Match clock** | Round countdown stored as `endsAt` (running) or `pausedRemainingMs` (paused) so every phone shows the same time. | `domain/match-clock.ts` |
| **Time** | When the clock hits zero: current turn is turn 0, then three more turns. The clock shows overtime as `+mm:ss`. | `clockPhase = 'overtime'` |
| **Registered deck** | The deck a player enters an event with. Can be changed until round 1 starts, then it is locked. Only the player and the host see it until the event ends. | `event_players.deckId` |
| **Deck required** | An event setting chosen by the host: players must register a 60-card deck in the event's format to enter. Without it, players may skip registering a deck. | `events.deckRequired` |
| **Deck list** | A PTCG Live / Limitless export. Stored raw, parsed on read into Pokémon / Trainer / Energy sections. | `domain/deck-list.ts` |
| **Store screen** | Full-screen projector view for the store TV: QR, clock and an alphabetical pairing list. | `/events/$eventId/screen` |
