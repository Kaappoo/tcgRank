# 4. Achievements stored, refreshed from history at set moments

**Status:** accepted

## Context

Achievements (see GLOSSARY.md) are worked out from a player's history in qualifying events, and a host's correction may take one away. Avatars and shown titles appear on the pairing card and standings, which refresh every 4 s during an event (ADR 0002). Some achievements, such as Rival, need the player's whole match history.

## Decision

A pure domain function works out every earned tier from a player's full history. It runs from scratch for each affected player when an event finishes, when a host corrects a result on a finished event, when a guest is claimed, and once as a backfill at launch. The result is stored as one row per earned tier, replacing the previous rows. Reads only look up those rows. A tier's earned date is the finish date of the event whose results crossed its threshold, so it comes out the same however often it's recalculated.

## Considered options

- **Calculate on every read.** Always correct, but every 4 s refresh would rescan each player's history.
- **Award once, at the moment it's earned.** Cheap, but a correction could never remove a badge, and past history needs a separate backfill path.

## Consequences

- Stored rows are a copy that can always be rebuilt. If a refresh moment is missed, rerunning the function fixes it.
- If a correction removes a tier, a trophy item or title the player is using falls back silently (the item to the player's default-avatar part; the title is hidden).
- "New" for the celebration means earned after the player's last-seen marker.
