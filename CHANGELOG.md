# Changelog

All notable changes to the Tranzmit React Native SDK packages (`@tranzmit/react-native`, `@tranzmit/shared`) are documented here. Dates are UTC and correspond to the npm publish time.

## [react-native 0.2.3] - 2026-06-24

### Changed

- **Bigger, more commanding CTA inside flattened artboard paywalls.** The flatten layer now enlarges `.cta` to `min-height: clamp(60px, 7.5vh, 72px)`, `font-size: clamp(16px, 4.4vw, 19px)`, and `padding: clamp(16px, 2vh, 22px) clamp(20px, 5vw, 28px)`, with the same overrides applied to a nested `.cta-label`. Resolves to ~60px / 16px on iPhone SE, ~63px / 17px on iPhone 14, ~70px / 19px on 16 Pro Max, capped at 72px / 19px on tablets. Improves tap target reach and perceived importance; each design's colors/radius/gradient are preserved.
- Same overrides baked into `templates/bake-flatten.mjs` so a Railway document hotfix carries the CTA upgrade independent of SDK version.

## [react-native 0.2.2] - 2026-06-24

### Added

- **Deterministic full-bleed rendering for imported phone artboards.** Documents authored as a `.device` → `.screen` → `.content` "phone mockup" (e.g. the exported HiAstro / Love Clarity paywalls) are now auto-detected and, in-app, flattened to full-bleed: the bezel is removed, `.screen` is sized to the real viewport and scrolls instead of clipping, the value content is centered above a CTA anchored to the bottom thumb zone (so the CTA stays reachable and there is no dead space below it on tall devices), and the `--tz-safe-*` insets are consumed. This fixes the previous divergence where such documents rendered correctly in a browser but, in the app, showed a centered bezel mockup on devices wider than 390px (e.g. iPhone 16 Pro Max, iPad) — because the document's own `@media (max-width: 390px)` full-bleed rule never fired — and clipped the CTA / left a sparse gap on other sizes. Detection and rules live in `phoneArtboardCss()` / `isPhoneArtboard()`.
- **`tz-template`** standard paywall structure (`templates/paywall.css` + `paywall.html`): a three-band layout that fills the viewport with a centered, evenly-spaced value region, scales via `clamp()` + `--tz-scale`, consumes safe-area, and compacts gracefully on short screens.
- **App-faithful preview harness** (`templates/preview/`, `npm run preview`): renders any paywall through the SDK's real composer at multiple device viewports plus a raw-browser view, so the preview matches the app.

### Changed

- Extracted the platform-agnostic document composition pipeline into `packages/react-native/src/renderer/compose.ts` (`renderDocument`, viewport/safe-area/artboard CSS, personalization, localization wiring). `SpecRenderer.tsx` now resolves the React Native viewport and delegates to it; composed output is unchanged for existing documents. This is what lets the preview harness compose through the exact same code the app runs.

## [react-native 0.2.1] - 2026-06-23

### Fixed

- Hosted documents that size a shell to the full viewport (`min-height: 100svh` / `100dvh` / `100vh`) no longer receive document-level `body` safe-area padding. Previously the rigid full-height shell would overflow the viewport by the inset amount and clip its own footer/CTA below the fold. Such documents are now expected to consume the `--tz-safe-*` variables inside their own `border-box` layout (detected via `FULL_VIEWPORT_HEIGHT_PATTERN`).
- Increased the hosted-document bottom safe-area inset by a responsive `clamp(10px, 3vw, 16px)` so CTAs keep a comfortable, device-scaled gap above the home indicator.

## [react-native 0.2.0 / shared 0.2.0] - 2026-06-23

### Added

- Generic WebView safe-area handling: hosted (unmanaged) documents receive native status-bar / notch / home-indicator insets via the `--tz-safe-*` CSS variables and `env(safe-area-inset-*)`, while managed containers (`.tranzmit-paywall` / `.tz-paywall`) continue to manage insets themselves.
- Shared localization utilities (`localizeHtml`, `resolveLocalizedStrings`, and token extraction) supporting `{{token}}`-based client-side localization driven by the `locale` prop and `spec.localization.translations`.

## [react-native 0.1.1 / shared 0.1.1] - 2026-06-18

- Documented the npm publishing workflow and aligned customer-facing docs.

## [react-native 0.1.0 / shared 0.1.0] - 2026-06-17

- Initial public npm releases of `@tranzmit/react-native` and `@tranzmit/shared`.
