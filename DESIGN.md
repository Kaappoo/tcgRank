# Design

**World: the tournament floor at night.** A black field, one safety-orange voice, and type that reads like a scoreboard. Bold and imposing, never noisy.

## Palette (oklch tokens in `src/styles/app.css`)

| Token | Role |
| --- | --- |
| `--ink` | Page field. Near-black with a hint of blue so orange glows warmer against it. |
| `--surface` / `--surface-raised` | Panels and raised controls. Separation comes from 1px `--line` borders, not shadows. |
| `--paper` / `--paper-dim` | Primary and secondary text (warm whites; dim stays ≥ 4.5:1 on ink). |
| `--orange` | The only accent: primary actions, live state, the slab, the table number. |
| `--on-orange` | Text on orange (dark ink, ~7.5:1). |
| `--win` / `--loss` / `--draw` | Result semantics only — never decoration. |

Dark only: the use scene is a dim store with phones held at the table.

## Type

One self-hosted family, **Archivo Variable**, using its width axis:

- `.font-display` — stretched to 125%, weight 850: headlines, names, the wordmark.
- `.font-numerals` — squeezed to 72%, weight 800, tabular: the match clock, table numbers, ranks, scores.
- Body at normal width. Share images use static Archivo / Archivo Black files bundled for satori.

## Signature move: the slab

A skewed orange slab (`.slab`) with a thin ember edge. It sits behind the table number on the pairing card, wipes in with a clip-path (`animate-slab`) whenever a new pairing arrives, and frames the OG share images. On phones it collapses into a skewed chip behind the table number so it never collides with names.

## Motion

- **Focal moment:** the slab wipe on a new pairing (720 ms, expo-out).
- **Continuity:** TanStack Router view transitions — quick blur-out, 340 ms rise-in. The header is excluded so navigation feels anchored.
- **Feedback:** button press scale, tab indicator slide, result tiles tinting to win/tie/loss, the live dot pulse, list stagger capped at 8 items.
- `prefers-reduced-motion` keeps opacity/colour feedback and removes movement.

## Refused

Gradient text, glow shadows, radial "spotlights", eyebrow labels, icon-card grids, glassmorphism as decoration. Elevation is neutral black shadow; separation is borders.
