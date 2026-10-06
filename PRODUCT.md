# Product

**tcgRank** runs Pokémon TCG league nights at local game stores. It replaces the generic (Magic-focused) app the store used for promotion and pairings with one built around Play! Pokémon rules.

## Who it serves

- **Hosts** (store staff / organisers): create an event, put a QR code on the counter or TV, pair rounds with one tap, run the round clock, fix results, publish standings.
- **Players**: scan to join, see opponent and table the moment pairings drop, report and confirm the score from their phone, watch the clock, keep a profile with match history and a deck library.

## Use scene

A loud, busy store at night. Phones at arm's length on a play mat, one hand free, patchy Wi-Fi, sometimes a TV or laptop on the counter. Sessions are short and frequent: glance, act, put the phone down.

## Principles

- **The pairing is the product.** Opponent, table and clock must be readable in under a second.
- **Two taps to report**, one tap to confirm. Disagreements resolve by reporting again; the host has the final word.
- **Rules, not settings.** Points and tiebreakers follow Play! Pokémon; round counts follow attendance unless the host overrides.
- **Works offline-ish.** Your pairing, decks and profile survive a dropped connection.

## Surfaces

| Surface | Mode | Route |
| --- | --- | --- |
| Landing | Persuade | `/` |
| Event hub (player + host) | Operate | `/events/$eventId` |
| Store screen | Operate (ambient display) | `/events/$eventId/screen` |
| Join | Operate | `/join`, `/join/$code` |
| Events, decks, profile, settings | Operate | `/events`, `/decks`, `/u/$username`, `/settings` |
