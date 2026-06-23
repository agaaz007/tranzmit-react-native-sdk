# Changelog

All notable changes to the Tranzmit React Native SDK packages (`@tranzmit/react-native`, `@tranzmit/shared`) are documented here. Dates are UTC and correspond to the npm publish time.

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
