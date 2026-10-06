# 2. Polling, not websockets, for live event updates

**Status:** accepted

## Context

Players need new pairings, opponent confirmations and clock changes within seconds. The app targets serverless/edge hosting with Turso.

## Decision

The event query polls every 4 s while an event is running (20 s otherwise) via TanStack Query `refetchInterval`. The match clock never polls for ticks: the server stores `endsAt`/`pausedRemainingMs` and returns `serverNow`, and each client renders the countdown locally with a clock-skew offset.

## Consequences

- No connection state to manage; works on any host and survives flaky store Wi-Fi (persisted query cache + service worker).
- Up to ~4 s latency for pairings and reports, which is fine at a table. Revisit with server-sent events if events grow past ~200 players.
