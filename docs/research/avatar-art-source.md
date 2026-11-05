# Avatar art source: open-licence set or original SVG parts?

Research for #53 (part of map #52). Researched 2026-11-05 against `@dicebear/styles@10.6.0`, `@dicebear/core@10.7.0`, `satori@0.35.2` (the version `package.json` pins), `sharp@0.35.5` and librsvg 2.63.4 (the version sharp's prebuilt libvips bundles).

## Recommendation

**Draw original SVG parts in the repo, and compose them with a small layer system of our own that copies DiceBear's conventions.** Do not build on an existing set's artwork.

Trade-off: we pay for the drawing up front (every skin tone, hair, top and hat has to be drawn, and hair has to work under every hat). In return the art matches DESIGN.md, the trainer-style hats exist at all, nothing needs attribution, and nothing breaks between the browser and the OG renderer. No existing set gives us that. The CC0 sets with clothes and hats are either 16×16 pixel art or black ink drawings that vanish on our black field. Each has only 2–10 hats, none of them trainer caps. Any hat we add has to fit that set's head geometry and drawing style, so we would be drawing in someone else's style anyway.

A fallback that keeps the original art but saves code: use `@dicebear/core` (MIT) only as the engine, with a style definition of our own (see [Option B](#option-b-dicebear-core-as-the-engine-our-own-definition)). It is viable. Owning about 50 lines of composer code fits `src/domain/` better than a dependency that is mid-way through a major-version change.

## 1. Which sets are licensed for commercial use, and how many parts they have

DiceBear is the umbrella that packages most of the known layered sets. In v10, every style is a JSON *definition* in `@dicebear/styles`, and each definition carries its own licence in a `meta.license` block. The engine code is MIT, but **each style's artwork has its own licence** ([`@dicebear/styles` LICENSE.md](https://github.com/dicebear/styles/blob/main/LICENSE.md)): "The avatar styles and the code that ships them are under different licenses."

The figure styles below are the ones with a person, plus clothes and/or hats. Part counts were read from the `components[*].variants` of each `src/<style>.json` in `@dicebear/styles@10.6.0`.

| Style | Artist / source | Licence (from `meta.license`) | Parts per category | Hats |
| --- | --- | --- | --- | --- |
| **open-peeps** | Pablo Stanley, [openpeeps.com](https://www.openpeeps.com/) | **CC0 1.0** | head (hair+hat merged) 48, expression 30, facialHair 16, accessories 8, mask 2; skin 5, clothing colours 7 | 2 (`hatBeanie`, `hatHip`), inside `head` |
| **pixel-art** | DiceBear | **CC0 1.0** | hair 45, clothes 23, mouth 23, glasses 14, eyes 12, hat 10, beard 8, accessories 4; skin 8 | 10 (`variant01..10`), 16×16 px canvas |
| **voxel-art** | DiceBear | **CC0 1.0** | top (hair+hat) 21, outfit 10, mouth 10, eyes 8 …; skin 8, hat colours 8 | 2 (`cap`, `beanie`) in `top` |
| **notionists** | Zoish | **CC0 1.0** | hair 64, mouth 30, clothes 25, nose 20, eyebrows 13, beard 12, glasses 11, gesture 10 | none |
| **lorelei** | Lisa Wischofsky | **CC0 1.0** | hair 48, mouth 27, eyes 24, eyebrows 13 … (no clothes) | none |
| avataaars | Pablo Stanley | *"Free for personal and commercial use"* (custom, not CC0/MIT) | top (hair+hat) 34, eyebrows 13, eyes/mouth 12, clothesGraphic 10, clothes 9, accessories 7; skin 7 | ~5 in `top` (`hat`, `winterHat1..04`) |
| personas | Draftbit | CC BY 4.0 (attribution) | hair 20, mouth 7, eyes 6, facialHair 6, clothes 4 | none |
| micah | Micah Lanier | CC BY 4.0 | hair 8, mouth 8, eyes 5, clothes 3 … | none |
| toon-head | Johan Melin | CC BY 4.0 | clothes 5, hair 4, rearHair 4 … | none |
| adventurer, big-ears, big-smile, croodles, miniavs, dylan | various | CC BY 4.0 | heads only, or no clothes/hats | none |

Takeaways:

- **CC0 with clothes and hats**: only open-peeps, pixel-art and voxel-art. notionists and lorelei are CC0 but have no hats.
- **CC BY 4.0** styles are usable commercially, but CC BY 4.0 requires attribution wherever the art is shown. avataaars uses a bespoke licence, which a reviewer would have to vet.
- **No set has trainer-style hats** (caps with a front panel, visors, bucket hats) in any number. Every set has at most 10 hats, and those are generic.
- Several sets **merge hair and hat into one slot** (avataaars `top`, open-peeps `head`, voxel-art `top`). This matters for authoring: see §4.

### Can they be restyled to fit DESIGN.md?

Colour, yes. Shape language, no.

- Each definition exposes **named colour slots** (`colors.skin.values`, `colors.hair`, `colors.clothing` …), which `@dicebear/core` lets you override per avatar with `<name>Color` options (`Options.color(name)` in `lib/Options.d.ts`). So our curated avatar palette can replace theirs.
- The outlines and drawing style are baked into the path data. In the probe render (below), **open-peeps' black ink hair and outline merged into our `#0b0b0c` field**. It needs a light backing disc to read at all. That disc is the "spotlight" look DESIGN.md refuses, and the result would be a sketchy illustration inside a bold scoreboard UI. pixel-art reads clearly but is 16 px blocky art, a different visual world from Archivo Black and the slab.

## 2. Does it render the same in the browser and in satori?

### How satori handles SVG (from the source)

satori does **not** interpret SVG itself. When it meets an inline `<svg>` element, `layout.ts` calls `SVGNodeToImage()` (`src/handler/preprocess.ts`). That function serializes the JSX subtree to an SVG string and embeds it as a `data:image/svg+xml` image in the output:

```ts
// satori src/layout.ts
} else if (type === 'svg') {
  // When entering a <svg> node, we need to convert it to a <img> with the
  // SVG data URL embedded.
  const src = await SVGNodeToImage(element, currentColor)
```

The SVG features therefore reach the **final rasterizer** unchanged. In tcgRank that is `sharp` (`src/server/og/render.tsx`: `sharp(Buffer.from(svg)).png()`), and sharp's libvips loads SVG through **librsvg** ([libvips `svgload.c`](https://github.com/libvips/libvips/blob/master/libvips/foreign/svgload.c): "load SVG with librsvg"; sharp-libvips builds librsvg `VERSION_RSVG=2.63.4`).

librsvg's [supported-features list](https://gitlab.gnome.org/GNOME/librsvg/-/blob/main/devel-docs/features.rst) covers `clipPath`, `mask` (`maskUnits`, `maskContentUnits`), `linearGradient`, `radialGradient`, `filter` and all 17 `fe*` primitives, `pattern` and `<style>`. Only animation, interactivity and scripting are unsupported.

The satori README's CSS table (`clipPath`, `maskImage`, `filter`, gradients) only matters for **HTML elements styled with CSS**. It does not apply to SVG content.

### Constraints satori places on inline SVG (from `preprocess.ts`)

- **Only intrinsic elements** inside `<svg>`: "Only intrinsic elements are supported inside <svg>". You cannot nest React components such as `<Hat/>` inside the `<svg>` tree that satori sees. Components have to *return* plain elements, so call them as functions or compose in data first.
- **`<text>` is rejected**: "<text> nodes are not currently supported, please convert them to <path>".
- `className` is dropped (destructured and never emitted), so Tailwind classes do nothing inside the avatar. `style` objects are emitted as inline CSS.
- `currentColor` is resolved to the parent's `color` at serialization time.
- **CSS custom properties from the app are not available**: the SVG becomes a standalone data URI. Fills must be literal hex values, which suits a fixed avatar palette.
- **Hooks don't run**: satori calls function components outside React's renderer, so you cannot use `useId()` to make `clipPath`/`mask` ids unique. Derive ids from the avatar (DiceBear does the same: it suffixes ids with a hash of the seed, `Renderer.js` `#hashSeed`).
- **Gotcha found while probing**: passing an `<img src>` data URI that is *not* base64 and contains non-Latin-1 characters crashes satori. `image.ts` runs `btoa(decodeURIComponent(...))`, which throws "Invalid character". DiceBear's `toDataUri()` triggers this, because its licence metadata contains „ ” quotes. Use base64 (`Buffer.from(svg).toString('base64')`) or inline JSX.

### Probe

`satori@0.35.2` + `sharp@0.35.5`, using the repo's Archivo font, on a `#0b0b0c` field. One test SVG combined `clipPath` + `mask` + `linearGradient` + an `feGaussianBlur` filter. Next to it went DiceBear avatars (open-peeps, pixel-art, avataaars, notionists, seed `user_123`) passed as base64 `<img>`. **All of them rendered correctly in the PNG**, and every avatar string was byte-identical across two renders with the same seed. Browsers support all of these features natively, so for flat art the two pipelines match. The remaining risk is anti-aliasing and filter differences between librsvg and Blink/WebKit, which is a reason to keep the parts to flat fills.

**Rule for our parts:** plain `<path>`/`<circle>`/`<rect>` with hex `fill`, plus optionally one `clipPath` to the head silhouette. No filters, no gradients (DESIGN.md is flat anyway), no `<text>`, no `className`.

## 3. How the sets turn a seed into a deterministic default

From `@dicebear/core@10.7.0` `lib/Prng.js` and `lib/Prng/{Fnv1a,Mulberry32}.js`:

- **Keyed, not sequential.** `getValue(key) = Mulberry32(Fnv1a.hash(seed + ':' + key)).nextFloat()`. Each slot draws from its own key (`hairVariant`, `skinColor`, `hatProbability` …), so **the same seed always gives the same pick for a slot, whatever order the slots are drawn in**. Adding a new slot does not reshuffle the existing ones.
- `pick(key, items)` **dedupes and sorts items by code point** before indexing, so reordering the parts list doesn't change existing avatars. *Adding* a part still can, because the index range changes.
- `weightedPick` uses per-variant weights. `bool(key, likelihood)` decides optional layers (`probability`: for example, pixel-art's `hat` shows in 5% of avatars and `glasses` in 20%).
- Colours carry `notEqualTo` constraints (for example, hair ≠ hat colour) in the definition (`Style/Color.js`).
- The core README says all language ports "share the same PRNG and rendering pipeline, producing identical SVG output for the same seed".

**For tcgRank:** a pure `defaultAvatar(userId)` in `src/domain/` using FNV-1a → Mulberry32 per slot key is about 20 lines, needs no IO, and is trivially unit-testable. It doesn't touch Effect's `Random`, because it is a pure hash, not runtime randomness. Draw the default only from **free** parts, so nobody's default shows a trophy item. Store the *resolved* choices once the user customises. Optionally store them at sign-up too, so later edits to the parts list never change anyone's look.

## 4. What authoring our own parts would take: the layer and anchor conventions

DiceBear's definition format (generated by its [Figma exporter plugin](https://www.figma.com/community/plugin/1005765655729342787), per the `$comment` in each file) is a clean convention worth copying:

- **One fixed canvas** (avataaars 280×280, pixel-art 16×16, open-peeps 704×704). The base (body/neck/head silhouette) is drawn directly on it, filled with a **named colour slot** (`fill: { type: 'color', name: 'skin' }`).
- **Component slots in z-order**, each placed by a single anchor, `transform: translate(x y)` on the canvas. Each component declares its own `width`/`height` box, and every variant of that component is drawn inside the same box. From avataaars: `clothes translate(40 184.7) → mouth → nose → eyes → eyebrows → top translate(8) → facialHair → accessories`. From pixel-art: `accessories → clothes → eyes → glasses → beard → mouth → hair → hat`.
- **Later slots paint on top** (SVG has no z-index; satori README note 2 says the same).
- **Hair under hats** is the hard part. Sets solve it one of two ways:
  1. **Merge** hair and hat into one slot (avataaars `top`, open-peeps `head`). This is simple, but every hat × hair combination has to be drawn.
  2. **Separate slots**, where the hat is drawn over the hair (pixel-art). This only works if hats cover the crown and the hair variants stay within a known silhouette.

  For us, option 2 plus a per-hair **"hatted" variant**, or a `clipPath` that trims hair above the brim line, keeps the counts additive (hair + hats) instead of multiplicative (hair × hats).
- Optional slots carry a `probability`. Colourable regions reference colour slot names, never literal colours, so the palette stays content (as the map says).

A minimal in-repo model would be `Part = { slot, id, paths: { d, fill: ColourSlot | hex }[], free: boolean }`, with a slot table of `{ slot, z, anchor: [x, y], box: [w, h] }` on one canvas (for example 256×256). One `<AvatarSvg>` would map that data to intrinsic elements and render unchanged in React and satori. The real cost is the art itself: a head base plus N skin tones (recolour only), and roughly 10 hairs, 8 tops and 8 hats as a first set, with each hair checked under each hat.

## Option B: DiceBear core as the engine, our own definition

`@dicebear/core` is MIT (`package.json` `"license": "MIT"`) and renders any definition that follows its schema. We could draw original parts in Figma, export them with the DiceBear plugin, and let core handle the seeding, colour slots and id randomization.

Against it:

- v10 is already deprecating its own API (it logged `Passing a style definition to new Avatar() is deprecated and will be removed in v11`), and `11.0.0-rc.2` is published.
- It outputs an SVG *string*, so the browser needs `dangerouslySetInnerHTML` or an `<img>`, and satori needs a base64 `<img>` (see the gotcha above).
- It writes licence metadata into every SVG.
- The definition is a JSON element tree rather than typed TS.

None of these is a blocker. The case for our own composer is fit with `src/domain/`, not capability.

## Sources

- `@dicebear/styles@10.6.0`: `LICENSE.md`, `src/*.json` (`meta`, `canvas`, `components`, `colors`). Repo: <https://github.com/dicebear/styles>
- `@dicebear/core@10.7.0`: `README.md`, `lib/Prng.js`, `lib/Prng/Fnv1a.js`, `lib/Prng/Mulberry32.js`, `lib/Resolver.js`, `lib/Renderer.js`, `lib/Options.d.ts`. Repo: <https://github.com/dicebear/dicebear>
- `satori@0.35.2`: `README.md` (CSS table, notes), `src/layout.ts`, `src/handler/preprocess.ts`, `src/handler/image.ts`, `src/builder/svg.ts` (from the published source map). Repo: <https://github.com/vercel/satori>
- librsvg supported features: <https://gitlab.gnome.org/GNOME/librsvg/-/blob/main/devel-docs/features.rst>
- libvips SVG loader: <https://github.com/libvips/libvips/blob/master/libvips/foreign/svgload.c>. sharp-libvips librsvg version: <https://github.com/lovell/sharp-libvips/blob/main/versions.properties>
- tcgRank: `src/server/og/render.tsx`, `DESIGN.md`, map #52.
