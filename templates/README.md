# Tranzmit paywall template + preview

A **fixed structure** for authoring paywalls and a **preview harness** that
renders your HTML exactly the way the app's WebView does — so you stop hitting
"looks right in the browser, breaks in the app."

## Why paywalls render differently in the app

In a desktop browser you see your raw HTML. In the app, the SDK *wraps* your
document before the WebView renders it: it injects the live viewport size
(`--tz-vw` / `--tz-vh`), the device **safe-area insets** (`--tz-safe-*`), a
device-size **scale** factor (`--tz-scale`), and full-screen sizing rules. CSS
units like `vh`/`vw` resolve against the real device, not your desktop window.
So a layout that looks fine at desktop size can:

- pool all its slack into one gap (sparse upper half) because the column was
  taller than the content;
- slide its top row under the notch or its CTA under the home indicator,
  because it never consumed `--tz-safe-*`;
- shrink or overflow on small phones because nothing scaled.

The `tz-template` structure owns exactly those concerns so you only author
content and skin.

## Files

| File | What it is |
|---|---|
| `paywall.css` | The layout + scaling engine. Design-agnostic. Do not edit per paywall. |
| `paywall.html` | Reference skeleton — copy it, keep the structure, fill the `{{tokens}}`, add your skin. |
| `translations.example.json` | Localization map covering every token in `paywall.html` (see the SDK README "Localization"). |
| `preview/` | The app-faithful preview harness (see below). |

## The structure

```html
<main class="tz-template">
  <header class="tz-band tz-band--top">    <!-- promo, eyebrow, headline, subhead -->
  <section class="tz-band tz-band--focus">  <!-- media, value, offer, proof (CENTERED) -->
  <footer class="tz-band tz-band--bottom">  <!-- guarantee, CTA, legal -->
</main>
```

- **`tz-band--top`** and **`tz-band--bottom`** are pinned to the top and bottom.
- **`tz-band--focus`** is the only band that grows; it centers its content, so
  free space splits evenly above and below the value cluster instead of pooling
  into one gap. This is what fixes the sparse upper half at any height.
- **Required slots:** `.tz-headline` and `.tz-cta`. Everything else is optional
  and collapses cleanly when omitted (no phantom gaps).

Slot classes: `tz-promo`, `tz-eyebrow`, `tz-headline`, `tz-subhead`, `tz-media`,
`tz-value`, `tz-offer`, `tz-proof`, `tz-guarantee`, `tz-cta`, `tz-legal`.

## Rules for authoring

1. **Keep the three bands.** Do not put `justify-content: space-between` on the
   root — that is the failure mode the template replaces.
2. **CTA is a button** with `data-tranzmit-action="cta"` and `data-product-id`
   so the SDK bridge fires `onCTA` with the right product. Secondary actions use
   `data-tranzmit-action="dismiss"`; links use `data-tranzmit-action="open_url"
   href="…"`.
3. **Read the SDK variables, don't redefine them:** `--tz-vw`, `--tz-vh`,
   `--tz-safe-top/-bottom/-left/-right`, `--tz-scale`. The template already
   consumes the safe-area insets; your skin shouldn't add its own.
4. **No relative asset paths.** Use `https://…` or `data:` URIs. Personalize
   images with `data-tranzmit-src` / `data-tranzmit-fallback-src`.
5. **Recompute integrity after every edit.** The document HTML/CSS is hashed
   (`spec.document.integrity`). Use `sha256Integrity()` from `@tranzmit/shared`
   and update the dashboard, or the SDK fails closed (`integrity_failed`).

## Two supported layouts

You can author a paywall two ways and the SDK renders both correctly in-app:

1. **`tz-template`** (recommended for new paywalls) — the three-band structure
   above. You own content + skin; the template owns spacing, centering, scaling,
   and safe-area.

2. **Phone artboard** (`.device` → `.screen` → `.content`) — the exported
   "phone mockup" layout. The SDK **auto-detects** this idiom and, in-app,
   flattens it to full-bleed: it removes the bezel, sizes `.screen` to the real
   viewport, centers `.content`, consumes the safe-area insets, and lets the
   screen scroll instead of clipping. This is what makes the existing HiAstro /
   Love Clarity exports render correctly on every device with **no per-file
   edits** — including phones wider than 390px (16 Pro Max) and tablets, where
   the document's own `@media (max-width: 390px)` full-bleed rule never fires.

   For an artboard, keep the `.device` / `.screen` / `.content` class names so
   the SDK recognizes it. The flatten is handled by `phoneArtboardCss()` in
   `packages/react-native/src/renderer/compose.ts`.

Both paths consume `--tz-safe-*` for you. Use `tz-template` when you want the
content auto-centered and evenly spaced; use the artboard when you are shipping
the existing exported designs unchanged.

## Preview harness

Renders every sample through the SDK's **real composer** at four device sizes
(320×568, 390×844, 430×932, iPad) plus a raw-browser view, so the preview is
byte-identical to the app.

```bash
npm run preview          # builds the SDK, composes all samples, writes index.html
# then open templates/preview/index.html in a browser
```

Add a paywall to preview by dropping a file in `preview/samples/` named
`*.sample.mjs` that exports:

```js
export default {
  name: "My paywall",
  presentation: "fullscreen",          // or sheet / modal / inline
  spec: { renderer: "webview", products: [{ id: "pro_monthly", name: "...", price: { amount: 4900, currency: "INR" } }],
          document: { html: "<main class=\"tz-template\">…</main>", css: "…" } },
};
```

The harness draws the status-bar and home-indicator zones and a red dashed
safe-area edge, so content that would hide under the notch or home indicator is
obvious. The two bundled samples (`astro-intro-offer` and `astro-template`) show
the same content authored the old way vs. on `tz-template` — compare them across
the device frames.
