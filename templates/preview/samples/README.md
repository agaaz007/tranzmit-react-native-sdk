# Reference paywalls — clone the closest one

These are the **reference responsive paywalls**. Every one inherits the same
template ([`_skeleton.mjs`](./_skeleton.mjs)) and follows the HTML contract in
[`../../AUTHORING.md`](../../AUTHORING.md). To design a new paywall, **copy the
closest match below and re-skin it** — don't start from scratch.

## How a sample is shaped

```js
import { SKELETON_CSS } from "./_skeleton.mjs";   // the template — never edit it
const A = "file:///…/assets";                     // local-preview-only asset base (see AUTHORING §6)
const html = `<main class="tz-template" …> … </main>`;   // content (the contract)
const skin = `…`;                                 // YOUR colors/fonts/layout, appended after SKELETON_CSS
export default {
  id: "phase2-…",                                 // unique; used for output filenames
  name: "✨ … — Phase 2 (responsive)",            // shown in the preview index
  presentation: "fullscreen",                     // or sheet / modal / inline
  spec: {
    renderer: "webview",
    products: [{ id: "…", name: "…", isDefault: true, price: { amount: 4900, currency: "INR" } }],
    document: { html, css: SKELETON_CSS + skin }, // ← skeleton first, skin second
  },
};
```

- The `document.css` is **always** `SKELETON_CSS + skin` — the template first,
  your skin appended.
- Each button's `data-product-id` must match a `products[].id` in the same spec.
- Files named `_*.sample.mjs` / `_*.mjs` starting with `_` that are not
  `*.sample.mjs` (like `_skeleton.mjs`) are **not** loaded as samples by the
  harness — `_skeleton.mjs` is a shared import, not a paywall.

## Catalog (by vertical)

| Sample | Vertical | Product | Notable patterns to reuse |
|---|---|---|---|
| `_phase2-love-01.sample.mjs` | Love | `love_clarity` | stats row (3-up), 3-up testimonial cards, grid plan card with ribbon + plan art watermark |
| `_phase2-love-02.sample.mjs` | Love | `love_clarity` | trial-reminder variant |
| `_phase2-love-04.sample.mjs` | Love | `love_clarity` | urgency/countdown variant |
| `_phase2-love-responsive.sample.mjs` | Love | `love_clarity` | "trusted" variant — simplest responsive form |
| `_phase2-marriage-01.sample.mjs` | Marriage | `marriage_clarity` | richest layout: absolute decor mandalas behind scroll, countdown timer pill, trust pills, hero art, grid plan card with zodiac watermark |
| `_phase2-marriage-02.sample.mjs` | Marriage | `marriage_clarity` | contextual-unlock variant |
| `_phase2-marriage-03.sample.mjs` | Marriage | `marriage_clarity` | discount-reading variant |
| `_phase2-career-01.sample.mjs` | Career | `career_growth` | career-growth layout |
| `_phase2-career-02.sample.mjs` | Career | `career_growth` | career-progress variant |
| `_phase2-general-01.sample.mjs` | General (HiAstro) | `hiastro_premium` | expert-predictions layout |
| `_phase2-general-02.sample.mjs` | General (HiAstro) | `hiastro_premium` | life-guide layout |
| `_phase2-general-03.sample.mjs` | General (HiAstro) | `hiastro_premium` | content-light: pill feature rows + big-price card with absolute badge/art (good minimal starting point) |

> All re-author the **original artboard faithfully** (same assets, colors,
> fonts, copy) — the responsive pass changes the **layout mechanics** (one
> scroll region, pinned CTA, grid price column), not the brand.

## Other files in this folder

- `_skeleton.mjs` — **the template.** Read it, import it, never edit it per-paywall.
- `real-hiastro.sample.mjs` — loads exported paywalls from `TZ_REAL_DIR`
  (defaults to local Downloads; no-ops if absent).
- `_control-*.sample.mjs`, `_live-prod-*.sample.mjs` — large **auto-generated**
  dumps of live specs, used as the "before" control in the preview. They are
  regenerable and not part of the template itself.

## Preview

From the repo root:

```bash
npm run preview
open templates/preview/index.html
```

See [`../../AUTHORING.md` §7](../../AUTHORING.md) for the acceptance checklist.
