# Changelog

## Unreleased

- Adds per-user paywall personalization: exposes the resolved user id (`window.Tranzmit.user`) to the WebView and resolves `data-tranzmit-src` token templates (`{id}`, `{userId}`, `{stableID}`) into a baked `src` at compose time, so personalized images (for example from a customer API) load at the earliest possible moment without breaking document integrity.
- Adds `data-tranzmit-fallback-src` so personalized images fall back to a default image on load error (network failure, 404, missing identity), with self-clearing `onerror` to avoid retry loops.
- Adds paywall localization: a `locale` prop on `TranzmitProvider` plus `spec.localization` translations, substituted into `{{key}}` document tokens at compose time with base-language and default-locale fallbacks. One design and one integrity hash serve all languages.
- Adds `setTraits(traits, options?)` (on the context and shared client) to update user traits after init and refetch config in place, so the backend can re-route a trigger to the right experiment/multi-armed bandit (for example by a session-derived `category`). It resolves after document hydration and does not flip `isReady`, so paywalls can be warmed mid-session and presented instantly.
- Enforces SHA-256 integrity validation for hosted WebView paywall documents before caching or rendering.
- Restricts WebView navigation, file access, mixed content, cookies, popup windows, and external URL opens.
- Adds explicit fallback reasons for integrity failures, invalid paywalls, and unsupported bridge versions.
- Documents billing-provider authority for prices, trials, billing periods, and checkout terms.
- Documents semantic versioning and release expectations for customer-facing SDK releases.

## 0.1.0

- Initial standalone React Native SDK workspace extracted from `tranzmit-mobile-webview`.
- Ships `@tranzmit/react-native` and `@tranzmit/shared` together in one source workspace.
- Uses hosted WebView paywalls as the supported rendering path.
- Documents fallback behavior for `not_ready`, `placement_not_found`, and `render_error`.
