# Agent Guide: tranzmit-react-native-sdk

This file is for coding agents integrating or maintaining the Tranzmit React Native SDK.

## Integration Runbook

1. Confirm inputs before editing a customer app:
   - `publicKey`
   - `placementTrigger`, usually `upgrade_pro`
   - optional `apiBaseUrl`
   - Billing Product IDs configured in the Tranzmit dashboard
   - the host app's purchase API, for example RevenueCat, StoreKit, Google Play Billing, or custom billing
   - where the logged-in app user ID is available

2. Install the package:

```bash
npm install @tranzmit/react-native
npm install @react-native-async-storage/async-storage react-native-webview react-native-safe-area-context
```

For local SDK development, use this repo's `example/` app because it installs `@tranzmit/react-native` and `@tranzmit/shared` via file paths.

3. Wrap the app with `TranzmitProvider`.

```tsx
<TranzmitProvider
  publicKey="pk_live_REPLACE_WITH_CUSTOMER_PUBLIC_KEY"
  userId={currentUser?.id}
  onError={(error) => console.warn("[Tranzmit]", error)}
>
  <App />
</TranzmitProvider>
```

4. Present placements with `useTranzmit().gate()` at the host app's upgrade point.

5. Wire billing only in `onCTA(product)`:
   - use `product.id` as the Billing Product ID
   - wait for the billing provider to confirm success
   - grant entitlements in the host app
   - call `reportConversion()` only after success
   - call `result.dismiss()` when the host app wants to close the paywall

6. Always wire `onFallback` in production. Open the host app's existing in-app paywall when the SDK reports:
   - `not_ready`
   - `placement_not_found`
   - `render_error`

7. Do not hardcode paywall UI in the app. Tranzmit paywall content comes from hosted WebView documents.

## SDK Maintenance Checks

Run these from the repository root:

```bash
npm install
npm run build
npm test
```

Run the example harness:

```bash
cd example
npm install
EXPO_PUBLIC_TRANZMIT_TRIGGER=missing_trigger npm run start
```

Verify that tapping Present opens the fallback dialog with reason `placement_not_found`.

## Product Rules

- Tranzmit does not process purchases.
- Dashboard Billing Product IDs are the source of truth for `product.id`.
- WebView paywalls are the supported rendering path.
- Do not reintroduce native renderer layout/block trees unless there is an explicit compatibility requirement.
- Keep customer-facing docs in this repo aligned with `tranzmit-flutter-sdk`.
