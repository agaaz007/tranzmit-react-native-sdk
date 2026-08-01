# Changelog

All notable changes to the Tranzmit React Native SDK packages (`@tranzmit/react-native`, `@tranzmit/shared`) are documented here. Dates are UTC and correspond to the npm publish time.

## [react-native 0.4.0, shared 0.4.0] - 2026-07-29

### Added

- **Embedded UPI checkout ("pay-bar").** Hosted paywall documents can render a "PAY USING \<app\>" selector next to the CTA, listing the UPI apps installed on the device. The host app detects the apps and passes them in; the SDK injects the sanitized list into the WebView and returns the user's choice to the host on CTA. Android-only; on iOS, with zero detected apps, or with checkout disabled, the document renders the existing plain full-width CTA. The billing boundary is unchanged: the host app executes payment and the SDK never bundles Razorpay. See the README section "Embedded UPI checkout (pay-bar)".
- `checkoutApps` prop on `TranzmitProvider`: detected UPI apps as `CheckoutAppInput[]` (`{ packageName, name?, id? }`). Sanitized once: max 16 entries, known package names mapped to a six-app registry (Paytm, PhonePe, Google Pay, BHIM, Amazon Pay, CRED), untrusted device-reported names stripped of C0/C1 control characters and all Unicode format characters (category `Cf`: bidi controls, zero-width characters, soft hyphens, BOM) and capped at 48 characters without splitting a surrogate pair, brand-spoofing entries dropped, unknown package names colliding with a registry id dropped, deduplicated by id.
- `spec.checkout` on `PaywallSpec` (new `CheckoutSpec` / `CheckoutUiConfig` types in `@tranzmit/shared`; additive, `bridge.version` stays 1): an opaque `provider` object passed verbatim to the host on CTA (never injected into the WebView) and a `ui` block (`enabled`, `showToggle`, `appPriority`, `defaultApp`, `maxVisibleApps`, `iconStyle`, `fallbackToPlainCta`) delivered outside the document integrity hash, so dashboard edits apply without re-hashing the document.
- `onCTA` gains an optional second argument on every surface (`GateOptions`, `PaywallHost`, `TranzmitPaywall`): `CheckoutContext { paymentApp?: { id, name, packageName }, provider? }`. It is `undefined` exactly when the variant has no `spec.checkout`.
- `GateOptions.dismissOnCTA` (default `true`). Set `false` to keep the paywall up through `onCTA` so a failed UPI mandate can be retried; dismiss with `result.dismiss()` after success.
- Analytics: `cta_click` now carries `payment_app` when the CTA included a selected app; new `checkout_app_selected` event whose `app` property is the registry id, or `"other"` for non-registry apps. The impression is still tracked once per `gate()`; each CTA attempt tracks its own `cta_click`.
- `templates/paybar/` authoring artifacts: the pay-bar markup, base CSS, and document JS contract for hosted documents.

### Backward compatibility

- The `onCTA` widening is an optional argument: existing one-argument callbacks compile and run unchanged, and the second argument stays `undefined` until a variant configures `spec.checkout`.
- Default lifecycle is unchanged: without `dismissOnCTA: false`, the SDK still dismisses the paywall before `onCTA` runs.
- Old documents render unchanged on the new SDK. New pay-bar documents degrade to the plain CTA on old SDKs (no injection, so the selector never activates). `bridge.version` stays 1, so no placement falls back with `unsupported_version`.

## [react-native 0.3.1, shared 0.3.1] - 2026-07-11

### Fixed

- Hosted paywall hydration now downloads each content-addressed document once, single-flights the same document across overlapping refreshes, and fetches unique documents serially. Multiple placements that resolve to the same immutable document no longer compete for bandwidth by downloading the same 188 KB payload in parallel.
- Hosted documents now have a dedicated 20-second mobile timeout that covers response-body consumption; config and analytics retain their 8-second timeout. After a host switch, later documents use the healthy sticky host first instead of waiting on the failed origin again.
- Superseded background config refreshes can no longer overwrite a newer trait-routed config or cache entry.
- Vercel system mitigation responses (`403` with `x-vercel-mitigated`) can fall back to the preserved Railway host instead of failing as a terminal application-level 403.

No renderer, presentation, product, HTML, CSS, JavaScript, localization, integrity, or billing behavior changed in this release.

## [react-native 0.3.0, shared 0.3.0] - 2026-07-07

### Changed

- **Default API host is now `https://api.tranzmitai.com`.** The previous Railway-provided host (`api-production-2146.up.railway.app`) is blocked at the DNS level by some mobile carriers (notably Indian ISPs such as Jio), which made config fetches fail on cellular data with "Failed host lookup" while WiFi worked. The Railway host remains active server-side and ships as the built-in fallback.

### Added

- **Automatic host failover.** `/v1/config`, hosted paywall document fetches, and `/v1/events` now retry across a host list: network-level failures (DNS, timeout) advance to the next host immediately, 5xx gets one same-host retry (350ms), 4xx never falls back. Hosted document URLs pinned to a blocked origin are rebased onto live hosts. The winning host is sticky per client; switches emit an `sdk_host_fallback` analytics event and a recoverable `api_host_fallback` error via `onError`.
- `fallbackApiBaseUrls` prop on `TranzmitProvider` (and `InitConfig`). An explicit `apiBaseUrl` without `fallbackApiBaseUrls` disables failover so staging setups never silently hit production.
- Timeouts on document and event requests (previously unbounded; config already had one).

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
