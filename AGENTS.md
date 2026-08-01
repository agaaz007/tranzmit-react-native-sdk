# Agent Guide: tranzmit-react-native-sdk

This file is for Claude, Codex, Cursor agents, and other coding agents integrating the Tranzmit React Native SDK into a customer app.

## Agent Integration Runbook

Follow these steps in order. Do not skip ahead unless the app already has that exact step completed.

### Step 1: Confirm Inputs

Ask the human or project owner for:

1. `publicKey`: the Tranzmit dashboard public key.
2. `placementTrigger`: the dashboard trigger, usually `upgrade_pro`.
3. Optional `apiBaseUrl`: only if Tranzmit provided a non-default API URL.
4. Billing Product ID for each paywall variant. This must match the host app's StoreKit, Play Billing, RevenueCat, Razorpay, Stripe, or custom billing product/package ID.
5. The app's purchase API: RevenueCat, StoreKit, Google Play Billing, Razorpay, Stripe, or a custom billing wrapper.
6. The app's logged-in user model: where the real app user ID is available.

If `publicKey` or `placementTrigger` is missing, stop and ask. Do not invent them.

### Step 2: Confirm Dashboard Product IDs

Before wiring billing, confirm each Tranzmit paywall variant has **Billing Product ID** set in the dashboard.

Examples:

1. StoreKit: `com.customer.app.pro.yearly`.
2. Google Play Billing: `pro_yearly`.
3. RevenueCat: the product/package ID passed into the customer's RevenueCat purchase call.
4. Razorpay: the Razorpay `plan_id`, `item_id`, or internal SKU mapped by the customer's backend.
5. Stripe: the Stripe price ID or app SKU mapped by the customer's backend.

This dashboard value becomes `spec.products[0].id`. On CTA, the SDK calls `onCTA(product)` and `product.id` is the value the app must use for billing.

If the product ID is missing or wrong, stop and ask the human to fix the dashboard config. Do not hardcode a different billing product ID in the app.

Only the Billing Product ID is authoritative in Tranzmit. StoreKit, Google Play Billing, RevenueCat, Razorpay, Stripe, or the customer's backend is the source of truth for product titles, localized prices, free trials, billing periods, eligibility, and checkout terms. Dashboard title/price/trial fields are display copy and must be QA-checked against the billing provider.

### Step 3: Add The Dependency

For customer apps, install the published npm packages and peer dependencies:

```bash
npm install @tranzmit/react-native
npm install @react-native-async-storage/async-storage react-native-webview react-native-safe-area-context
```

Distribution note: this repository is a source workspace. The npm install commands above work after `@tranzmit/react-native` and `@tranzmit/shared` are published. npm cannot install `packages/react-native` directly from the GitHub repo URL as `@tranzmit/react-native`. For local SDK development, use this repo's `example/` app because it installs `@tranzmit/react-native` and `@tranzmit/shared` via file paths.

### Step 4: Import The SDK

Add this import in the app entrypoint or screen that shows paywalls:

```tsx
import { TranzmitProvider, useTranzmit } from "@tranzmit/react-native";
```

Use `@tranzmit/react-native` for imports. `tranzmit-react-native-sdk` is only the GitHub repo name.

### Step 5: Wrap The App

Place `TranzmitProvider` above routes/screens that can show a paywall:

```tsx
<TranzmitProvider
  publicKey="pk_live_REPLACE_WITH_CUSTOMER_PUBLIC_KEY"
  userId={currentUser?.id}
  userTraits={currentUser ? { plan: currentUser.plan } : undefined}
  onError={(error) => console.warn("[Tranzmit]", error)}
>
  <App />
</TranzmitProvider>
```

If a Tranzmit engineer provides a custom API URL, pass it explicitly:

```tsx
<TranzmitProvider
  publicKey="pk_live_REPLACE_WITH_CUSTOMER_PUBLIC_KEY"
  apiBaseUrl="https://api-production-2146.up.railway.app"
>
  <App />
</TranzmitProvider>
```

If the app has a current user at startup, pass the real app user ID. If the user is logged out, omit `userId`. The SDK generates `stableID`; do not generate a fake user ID.

### Step 6: Present The Placement

At the upgrade point, call `gate()`:

```tsx
const { gate, reportConversion } = useTranzmit();

const result = gate("upgrade_pro", {
  onCTA: async (product) => {
    // product.id is the Billing Product ID configured in Tranzmit.
    const success = await purchaseProduct(product.id);
    if (!success) return;

    reportConversion({
      trigger: "upgrade_pro",
      variantId: result.variantId,
      productId: product.id,
      revenue: 999,
      currency: "INR",
    });

    // In the provider-driven React Native gate() flow, the SDK dismisses
    // the paywall before onCTA runs. No extra dismiss call is required.
  },
  onFallback: (event) => {
    console.warn("Tranzmit fallback", event.reason);
    openExistingInAppPaywall();
  },
});

if (!result.shown) {
  return; // onFallback already handled the route to the existing paywall.
}
```

Replace `upgrade_pro` with the dashboard trigger if Tranzmit supplied a different trigger.

### Step 7: Wire Billing Safely

`onCTA` receives a Tranzmit `ProductSpec`.

1. Read `product.id`; this is the dashboard **Billing Product ID**.
2. Use `product.id` to start the host app's billing flow.
3. Wait for billing success.
4. Let the host app grant entitlements.
5. Call `reportConversion()` only after success.
6. In the provider-driven `gate()` flow, the SDK dismisses the paywall before `onCTA` runs. If you render `TranzmitPaywall` declaratively, hide your own `visible` state after checkout or cancellation.

Never call `reportConversion()` before the purchase provider confirms the transaction.

For Razorpay, put checkout inside `onCTA`:

```tsx
const result = gate("upgrade_pro", {
  onCTA: async (product) => {
    const success = await startRazorpayCheckout(product.id);
    if (!success) return;

    await grantPaidEntitlement();

    reportConversion({
      trigger: "upgrade_pro",
      variantId: result.variantId,
      productId: product.id,
      revenue: 999,
      currency: "INR",
    });

    // gate() already dismissed the paywall before onCTA ran.
  },
  onFallback: () => openExistingInAppPaywall(),
});
```

CTA taps are callbacks, not WebView redirects. Do not navigate the hosted paywall to Razorpay, Stripe, or `about:blank`; keep checkout in React Native `onCTA`.

### Step 8: Fallback To The Existing App Paywall

Always wire `onFallback` to the app's current paywall. That keeps monetization available if Tranzmit config is still loading, the placement is missing or disabled, or the WebView renderer reports an error.

Fallback reasons:

1. `not_ready`: the SDK has not loaded a valid config yet, including offline startup or config fetch failure.
2. `placement_not_found`: the trigger has no enabled placement in config.
3. `integrity_failed`: the hosted document failed SHA-256 integrity validation.
4. `invalid_paywall`: the placement has no renderable document or products.
5. `unsupported_version`: the placement uses an unsupported WebView bridge version.
6. `render_error`: the hosted document or WebView failed after showing began.

### Step 9: Verify Locally

For SDK maintenance, run from the repo root:

```bash
npm install --legacy-peer-deps
npm run build
npm test
```

For the example harness:

```bash
cd example
npm install --legacy-peer-deps
EXPO_PUBLIC_TRANZMIT_TRIGGER=missing_trigger npm run start
```

Verify that tapping Present opens the fallback dialog with reason `placement_not_found`.

### Step 10: Customer App Acceptance Criteria

The task is done only when:

1. The app has `@tranzmit/react-native`, AsyncStorage, WebView, and safe-area peer dependencies installed.
2. The app imports from `@tranzmit/react-native`.
3. `TranzmitProvider` wraps the relevant screen tree.
4. The provided `publicKey` is passed to `TranzmitProvider`.
5. Logged-in users pass a real `userId`; logged-out users do not pass a fake ID.
6. Each dashboard paywall variant has a **Billing Product ID** matching the host app's billing provider.
7. The app calls `gate()` with the dashboard trigger.
8. `onCTA` starts native billing with `product.id`.
9. `onFallback` opens the app's existing paywall.
10. `reportConversion()` is called only after billing succeeds.
11. No hardcoded paywall UI is added to the host app.
12. The integration has a manual QA path that proves the remote paywall renders, opens the right billing product, shows billing-provider-authoritative checkout terms, and falls back safely.
13. Hosted paywalls have config-side SHA-256 integrity metadata and fail closed if validation fails.

## Pay-Bar Runbook: Embedded UPI Checkout

Use this runbook when the task is wiring the embedded UPI checkout ("pay-bar") into a customer app. It requires `@tranzmit/react-native` 0.4.0 and `@tranzmit/shared` 0.4.0. The full customer documentation is the README section "Embedded UPI checkout (pay-bar)"; this is the condensed agent path. Document-side work (selector markup, tokens, icons) is governed by the authoring contract in `templates/paybar/` (`CONTRACT.md` is normative; `AUTHORING.md` is the author guide) — this runbook covers only the host-app integration.

The boundary is unchanged: the SDK renders the selector inside the hosted document and reports the chosen app; the customer app executes the Razorpay flow. Never add Razorpay dependencies to the SDK packages.

### Pay-Bar Step 1: Confirm Inputs

Ask the human or project owner for:

1. Razorpay account state: whether token-based recurring ("charge-at-will") is enabled on the merchant account. Go-live for recurring involves a Razorpay support touchpoint per merchant account. If unconfirmed, stop and ask.
2. The Razorpay `key_id`, and which backend endpoints implement the mandate flow (customer create, order with `token{}`, recurring UPI payment).
3. Whether `spec.checkout` is configured on the paywall variant(s) in the Tranzmit dashboard. If it is not, `onCTA` receives `undefined` as its second argument and the pay-bar never renders. Stop and ask for the dashboard config.
4. Whether the app is Expo-managed. `react-native-customui` is a native module: Expo apps need a development client / prebuild.

### Pay-Bar Step 2: Integrate

1. Install `react-native-customui` in the customer app, never in this SDK. Its Android artifact ships the `<queries>` UPI intent block, so no host manifest edit is needed for detection.
2. On Android, detect apps with `Razorpay.getAppsWhichSupportUPI(cb)` and map each entry to `CheckoutAppInput { packageName, name }`. Do not pass detected apps on iOS.
3. Pass the list as `checkoutApps` on `TranzmitProvider`.
4. Call `gate()` with `dismissOnCTA: false` and `onCTA: async (product, checkout) => { ... }`.
5. When `checkout?.paymentApp` is present, run the Razorpay charge-at-will mandate flow. Backend: `POST /v1/customers`, then `POST /v1/orders` with `token: { max_amount, frequency, expire_at }` (keep `max_amount` at or below ₹15,000 so subsequent debits need no additional factor auth), then `POST /v1/payments/create/upi` with `recurring: "1"` and `upi: { flow: "intent" }` — the response contains an intent link. Client-side alternative: `Razorpay.open({ key_id, amount, currency, method: "upi", upi_app_package_name: checkout.paymentApp.packageName, "_[flow]": "intent", ... })`. The ₹1 authorization charge is captured — that is the "₹1 today" trial charge; the backend then schedules each recurring debit with the 24-hour pre-debit notification.
6. On success: `reportConversion()` only after backend verification, then `result.dismiss()`. On failure or abandonment: return without dismissing; the paywall stays up for retry.
7. On iOS: run Razorpay Standard Checkout with a `subscription_id` via `react-native-razorpay` from `onCTA`. QA the close path — open issue razorpay/react-native-razorpay#506 reports a white screen on close with `subscription_id` on iOS.
8. Do not build a UPI Collect fallback. UPI Collect is deprecated for new Autopay registrations since 28 Feb 2026.
9. Treat `checkout.provider` as untrusted input: validate every URL-valued field against an allowlist compiled into the app binary before use.

### Pay-Bar Step 3: Acceptance Criteria

The pay-bar task is done only when:

1. The paywall stays up through a failed or abandoned mandate (`dismissOnCTA: false`) and the CTA can be retried without re-gating.
2. `reportConversion()` is called only after the mandate is authorized and verified on the backend, never on intent launch.
3. The plain-CTA fallback is verified on iOS and on an Android device with zero UPI apps, and the classic `onCTA` billing path still works there.
4. `cta_click` carries `payment_app` when an app was selected, and `checkout_app_selected` events are tracked (non-registry apps report as `"other"`).
5. `react-native-customui` is a dependency of the customer app only; nothing Razorpay-related was added to the SDK packages.
6. No pay-bar UI is hardcoded in the host app; the selector is document content delivered by Tranzmit.

## Product Rules

- Tranzmit does not process purchases.
- Dashboard Billing Product IDs are the source of truth for `product.id`.
- Billing providers are the source of truth for prices, free trials, billing periods, and entitlements.
- WebView paywalls are the supported rendering path.
- Hosted WebView documents must pass SHA-256 integrity validation before rendering.
- WebView navigation and external URL opens must stay allowlisted through the SDK bridge.
- Do not reintroduce native renderer layout/block trees unless there is an explicit compatibility requirement.
- Localize paywalls with one design: reference text as `{{key}}` tokens in the hosted document and supply per-locale strings in `spec.localization.translations`. Pass the active language via the `locale` prop on `TranzmitProvider`. The same document hash serves all languages, so integrity is unaffected. Only serve a separate per-locale document when a language needs a different layout (for example RTL). Localize display copy only; billing providers remain authoritative for prices, trials, and billing periods.
- Route paywalls by session-derived signals with `setTraits(traits)`: the host app resolves the signal (for example a `category`) from its own endpoint, calls `await setTraits({ category })` to refetch and warm the routed paywall, then calls `gate(trigger)` to present. Experiment/multi-armed-bandit assignment stays server-side (bucketed on `stableID`); the SDK only renders the assigned variant and emits impression/CTA/conversion signals. The trigger must return a default/holdout paywall before the routing trait is set, since that is the fallback if the routing call is slow or fails.
- Keep customer-facing docs in this repo aligned with `tranzmit-flutter-sdk`.
