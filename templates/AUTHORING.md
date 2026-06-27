# Tranzmit paywall authoring guide (the design data-repo)

> **This is the canonical reference for authoring a Tranzmit paywall.** If you are
> an agent (or a person) about to design a new paywall, read this end-to-end
> first, then clone the closest reference sample from
> [`preview/samples/`](./preview/samples/) and re-skin it. Do **not** invent a
> new structure — the structure is fixed on purpose (see "Why" below).

---

## 0. TL;DR — how to design a new paywall

1. **Find the closest reference** in [`preview/samples/README.md`](./preview/samples/README.md)
   (by vertical: love / marriage / career / general).
2. **Copy it** to `preview/samples/<your-name>.sample.mjs`. Keep the import of
   `SKELETON_CSS` and the HTML contract (`tz-template → tz-shell → tz-scroll + tz-footer`).
3. **Re-author** the `html` (content) and the `skin` (the CSS string appended
   after `SKELETON_CSS`). Touch only content + skin. Never re-define the
   skeleton primitives (sizing, scaling, safe-area, CTA size).
4. **Preview** with `npm run preview` (from repo root) and open
   `templates/preview/index.html`. Verify the paywall on **all four device
   frames** (SE 320, iPhone 14 390, 16 Pro Max 430, iPad) — nothing under the
   red dashed safe-area lines, CTA always visible, no clipped content.
5. **Ship**: host/inline the assets, compute integrity, and push to the backend
   spec (see §6). The live app picks it up at runtime — no app update needed.

---

## 1. Why the structure is fixed (read this before you change anything)

In a desktop browser you see your raw HTML. **In the app, the SDK wraps your
document before the WebView renders it.** It injects:

| Variable | What it is |
|---|---|
| `--tz-vw`, `--tz-vh` | the live viewport size, in real device px |
| `--tz-safe-top/-bottom/-left/-right` | the device safe-area insets (notch, home indicator, rounded corners) |
| `--tz-scale` | a device-size scale factor |

CSS units like `vh`/`vw` resolve against the **real device**, not your desktop
window. So a layout that looks perfect at desktop size will, in-app:

- **pool all its slack into one gap** (sparse upper half) when the column is
  taller than the content;
- **slide its top row under the notch** or its **CTA under the home indicator**
  because it never consumed `--tz-safe-*`;
- **clip or overflow** on small phones (SE) or stretch ugly on tablets because
  nothing scaled or capped width.

The **SKELETON** ([`preview/samples/_skeleton.mjs`](./preview/samples/_skeleton.mjs))
owns exactly those concerns — viewport-locked height, the single scroll region,
the pinned footer, safe-area consumption, the tablet width-cap, the commanding
CTA, and the dismiss-corner reserve — so that **you only author content + skin
and the layout cannot drift or break across devices.** This is the "v-final"
primitive set; every responsive paywall inherits it identically.

---

## 2. The HTML contract (do not deviate)

Every paywall is one `tz-template` root → one `tz-shell` → exactly one
`tz-scroll` (the only scroller) + one `tz-footer` (the pinned CTA band):

```html
<main class="tz-template" style="height:100svh;height:var(--tz-vh,100svh)" aria-label="…">
  <div class="tz-shell">
    <div class="tz-scroll">
      <!-- ALL value content: headline, proof, media, testimonials, plan card… -->
    </div>
    <footer class="tz-footer">
      <button class="cta" type="button" data-tranzmit-action="cta" data-product-id="…">
        <span class="cta-label">…</span><span class="arrow" aria-hidden="true">&#8594;</span>
      </button>
      <div class="footer"><!-- legal / reassurance line --></div>
    </footer>
  </div>
</main>
```

**Why each piece exists:**

- **`tz-template`** is viewport-locked (`height: var(--tz-vh)`), a flex column,
  and consumes `--tz-safe-top` / `--tz-safe-bottom`. The inline
  `style="height:100svh;height:var(--tz-vh,100svh)"` is the fallback for the raw
  browser preview (before the SDK injects `--tz-vh`).
- **`tz-scroll`** is the **only** scroll region. Its children are
  `flex-shrink: 0` (content-sized, never squished → no clip), and auto top/bottom
  margins **center** the content when it fits and **collapse to scroll-from-top**
  when it doesn't. This is what fixes the "sparse upper half" at every height.
- **`tz-footer`** is `flex: 0 0 auto` — the CTA + legal are always pinned and
  visible regardless of how much content scrolls.

**Required slots:** `.cta` (in the footer) and at least a headline in the scroll.
Everything else is optional and collapses cleanly when omitted.

---

## 3. What the SKELETON gives you (never re-define these)

`SKELETON_CSS` from `_skeleton.mjs` bakes in:

- **Viewport-locked flex column** — `height: var(--tz-vh, 100svh)` so the inner
  region scrolls and the footer pins (no clip).
- **One scroll region + pinned footer** — structural sticky CTA, no SDK
  DOM-restructuring required.
- **The commanding CTA primitive** — `.cta` is `min-height: clamp(60px,7.5vh,72px)`,
  generous padding, `font-weight: 900`, +20% type. **Skins set ONLY the
  `background` / `border-radius` / `color` on `.cta`** — never its size, padding,
  or font (those live in the skeleton and mirror the SDK's `phoneArtboardCss`).
- **Safe-area insets** consumed via `--tz-safe-*` (top/bottom padding on the
  template, left/right padding on the shell).
- **Tablet width-cap** — `.tz-shell` is `max-width: 412px`, centered, so wide
  screens show a centered column instead of stretching.
- **Dismiss-corner reserve** — on screens ≤380px wide, `.tz-scroll` gets
  `padding-top: 34px` so the SDK's native dismiss (×) overlay (drawn top-left in
  the safe area) never covers content. On wider screens the × sits in the side
  margin, so no reserve is needed.

If you find yourself writing `height: 100vh`, `justify-content: space-between` on
the root, your own safe-area padding, or your own CTA sizing — **stop**, you are
re-implementing the skeleton and will reintroduce the bugs it fixes.

---

## 4. What YOU author — the skin layer

Each sample is `SKELETON_CSS + skin`. The `skin` is a CSS string you fully own:
colors, fonts, backgrounds, and the per-section layout of your content. Patterns
that recur across the reference samples (copy these — they are battle-tested):

### Plan / price card — price as a GRID column, never absolute

The #1 recurring bug in the original artboards was the **price overlapping the
feature list**. The fix used in every sample: lay the plan card out as a CSS
grid with named areas, so the price occupies its own column and cannot collide:

```css
.plan-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;   /* features | price */
  grid-template-areas: "title price" "features price";
  column-gap: 12px; align-items: start;
}
.plan-title { grid-area: title; }
.features   { grid-area: features; }
.price      { grid-area: price; white-space: nowrap; }
```

Decorative card art (zodiac watermark, plan art) goes **absolute with a low
`z-index`** behind the grid (`z-index: 1`), the grid sits at `z-index: 2`,
ribbons/badges at `z-index: 3`. Use `overflow: hidden` on the card so the
watermark bleeds cleanly.

### Carousels → static rows

Original artboards often used swipe carousels (testimonials). In the responsive
template, render them as a **static 3-up grid**
(`grid-template-columns: repeat(3, minmax(0, 1fr))`) so nothing depends on JS or
horizontal scroll.

### Decorative background art

Mark it `aria-hidden="true"`, position it `absolute` inside a
`position: relative` `.tz-shell` (or card), give it a low `z-index`,
`pointer-events: none`, and usually `mix-blend-mode: multiply` + reduced
`opacity`. Then bump `.tz-scroll` to `position: relative; z-index: 1` so content
sits above it.

### Typography & sizing

Samples use fixed px sizes tuned for the 390px reference width; the skeleton's
scale + the tablet cap keep them proportional. Headlines ~22–28px/`font-weight:
900`, body ~9–13px. Use `min(<px>, 100%)` or `min(<px>, <vw>)` widths to keep
clusters from stretching on wider frames. Match the **original artboard's**
colors, fonts, and copy faithfully — the responsive re-author changes the
**layout mechanics**, not the brand.

---

## 5. The CTA / action bridge contract

The SDK wires WebView elements to native callbacks by `data-tranzmit-action`:

| Attribute | Behavior |
|---|---|
| `data-tranzmit-action="cta"` + `data-product-id="<id>"` | fires `onCTA` with that product (primary purchase). The `data-product-id` **must** match a product `id` in the spec's `products[]`. |
| `data-tranzmit-action="dismiss"` | closes the paywall (secondary action). |
| `data-tranzmit-action="open_url" href="…"` | opens a URL (terms, privacy). |

The native dismiss (×) is drawn by the SDK (`PaywallHost` / `ModalPresenter`,
`fullscreenCloseStyle`: top-left safe-area, dark scrim, white ×) — it is **not**
part of your document, which is why the skeleton reserves the top-left corner on
narrow screens. Do not draw your own × in that corner.

---

## 6. Assets & shipping to production

**During authoring/preview**, samples reference assets as local absolute paths:

```js
const A = "file:///Users/<you>/paywalls-hires/<design>-done/assets";
// …src="${A}/hero.png"
```

`file://` paths are **local-preview-only** — they only resolve on the machine
that has those files. They make the preview show real images; they are **not**
what ships.

**For production**, asset references must be self-contained — either hosted
`https://…` URLs or inlined `data:` URIs. The repo's push tooling does this for
you:

- **`push-hiastro.mjs`** — resizes each referenced asset (max 512px longest
  side, sharp), PNG/JPEG-optimizes, **base64-inlines as `data:` URIs**, computes
  **SHA-256 integrity** over the final HTML, and `PUT`s the updated document to
  the backend spec (`/admin/specs/<id>`). The live app picks it up at runtime.
- **`bake-flatten.mjs`** — the legacy "option A" hotfix path for **artboard**
  exports (`.device/.screen/.content`): bakes the full-bleed flatten directly
  into the document CSS so it renders correctly without depending on the SDK
  version. `--prod` leaves asset refs as-is (host/inline them yourself);
  without it, relative `assets/` refs are rewritten to local `file://` for
  preview.

> **Integrity is load-bearing.** The document HTML/CSS is hashed into
> `spec.document.integrity`. After **any** edit you must recompute it
> (`sha256Integrity()` in the push scripts, or `sha256Integrity()` from
> `@tranzmit/shared`) or the SDK fails closed with `integrity_failed`. The push
> scripts handle this automatically; if you hand-edit a live spec, you own it.

---

## 7. Preview harness (verify before you ship)

```bash
npm run preview          # from repo root: builds the SDK, composes every sample, writes index.html
open templates/preview/index.html
```

The harness ([`preview/build-preview.mjs`](./preview/build-preview.mjs)) renders
every `*.sample.mjs` through the SDK's **real** `renderDocument()` composer, so
the preview is byte-identical to the app. For each sample it shows:

- **Raw (browser)** — your document with no SDK wrapping (as designed).
- **Before** — the previous app render (`flattenArtboards: false`).
- **After** — the current app render (the fix on).

…across four device frames (SE 320×568, iPhone 14 390×844, 16 Pro Max 430×932,
iPad 768×1024), each drawn with the **status-bar / home-indicator zones**, a
**red dashed safe-area edge**, and the **native × overlay** in its real
position. Anything past a red line can be clipped by the notch / home indicator.

**Acceptance checklist for a new paywall** (check on every frame):

- [ ] CTA fully visible and tappable — never under the home indicator.
- [ ] Top content never under the notch / status bar / dismiss ×.
- [ ] No clipped or squished cards on SE (320). No ugly stretch on iPad.
- [ ] Price never overlaps features (grid layout).
- [ ] Content centers when it fits; scrolls from top when it doesn't.

---

## 8. File map

| Path | What it is |
|---|---|
| [`AUTHORING.md`](./AUTHORING.md) | **This file** — the canonical authoring guide. |
| [`README.md`](./README.md) | Overview + the two supported layout idioms. |
| [`preview/samples/_skeleton.mjs`](./preview/samples/_skeleton.mjs) | **The template.** The v-final SKELETON_CSS primitives every responsive paywall inherits. |
| [`preview/samples/README.md`](./preview/samples/README.md) | Catalog of reference paywalls by vertical — start here to find one to clone. |
| `preview/samples/_phase2-*.sample.mjs` | The reference responsive paywalls (love / marriage / career / general). |
| [`preview/build-preview.mjs`](./preview/build-preview.mjs) | The app-faithful preview harness. |
| `push-hiastro.mjs` | Inline assets + integrity + push a document to a live backend spec. |
| `bake-flatten.mjs` | Bake the full-bleed flatten into a legacy artboard export. |
| `paywall.html` / `paywall.css` | The earlier three-band reference skeleton (superseded by the SKELETON for new work; see README §"Two supported layouts"). |
| `translations.example.json` | Localization map covering the template tokens. |

---

## 9. The two supported layout idioms

1. **SKELETON / responsive (recommended for all new paywalls)** — the
   `tz-template → tz-shell → tz-scroll + tz-footer` structure in this guide. You
   own content + skin; the skeleton owns spacing, centering, scaling, safe-area,
   and the CTA. This is the "Phase 2" / "v-final" path.

2. **Phone artboard (legacy exports)** — the exported "phone mockup" layout
   (`.device → .screen → .content`). The SDK **auto-detects** this idiom and, in
   app, flattens it to full-bleed (removes the bezel, sizes `.screen` to the real
   viewport, centers `.content`, consumes safe-area, lets the screen scroll). The
   flatten lives in `phoneArtboardCss()` in
   `packages/react-native/src/renderer/compose.ts`. Keep the
   `.device/.screen/.content` class names so the SDK recognizes it. For a runtime
   hotfix without an SDK bump, bake the flatten in with `bake-flatten.mjs`.

Both consume `--tz-safe-*` for you. **Use the SKELETON for anything new.** Use
the artboard path only to ship an existing exported design unchanged.
