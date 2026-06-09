# tranzmit-react-native-sdk

Client React Native SDK for Tranzmit server-driven WebView paywalls. The SDK fetches remote placement config, renders hosted paywall documents, assigns users through server-side experiments, and sends impression / CTA / dismissal / conversion events back to Tranzmit.

The Git repository is named `tranzmit-react-native-sdk`. The npm package customers import is `@tranzmit/react-native`.

## What Customers Need

To integrate Tranzmit, a customer app needs:

- The `@tranzmit/react-native` package.
- A Tranzmit public key from the dashboard, for example `pk_live_...` or `pk_test_...`.
- A placement trigger configured in the dashboard, usually `upgrade_pro`.
- A Billing Product ID configured on each paywall variant in the Tranzmit dashboard.
- A stable app user id when the user is logged in.
- A native purchase implementation in the host app: StoreKit, Google Play Billing, RevenueCat, Razorpay, Stripe, or another billing provider.

Once the public key and placement are configured in the dashboard, paywall changes and experiment splits flow remotely. The customer should not hardcode paywall UI in their app.

Tranzmit does **not** process purchases. Tranzmit owns paywall presentation and analytics. The customer app owns billing, entitlements, refunds, restore purchases, and subscription-provider integration.

## Client Integration Steps

Use this checklist as the source of truth for customer engineers and AI coding agents.

### Step 1: Get The Tranzmit Inputs

Before editing the app, collect these values from the Tranzmit team:

1. `publicKey`: the dashboard client key, for example `pk_live_...`.
2. `placementTrigger`: the dashboard trigger to present, for example `upgrade_pro`.
3. Optional `apiBaseUrl`: only needed if Tranzmit gives you a non-default API URL.
4. Billing Product ID for each paywall variant. This must match the app's StoreKit, Play Billing, RevenueCat, Razorpay, Stripe, or internal billing product/package ID.
5. The app's purchase API and entitlement flow.
6. Where the app's logged-in user ID is available.

If `publicKey` or `placementTrigger` is missing, stop and ask. Do not invent them.

### Step 2: Configure Billing Product IDs In Tranzmit

In the Tranzmit dashboard, open each paywall variant and set **Billing Product ID**.

Examples:

1. StoreKit: `com.customer.app.pro.yearly`.
2. Google Play Billing: `pro_yearly`.
3. RevenueCat: the product/package ID passed into the customer's RevenueCat purchase call.
4. Razorpay: the Razorpay `plan_id`, `item_id`, or internal SKU that the customer app maps to a Razorpay order on its backend.
5. Stripe: the Stripe price ID or app SKU the customer backend maps to a Stripe checkout/session.

This value is saved as `spec.products[0].id`. When the user taps the hosted paywall CTA, the React Native SDK receives the matching `ProductSpec` and passes it to the host app as `product.id`.

If the dashboard product ID does not match the billing provider, the paywall can still open, but the app may start the wrong plan or fail to start checkout.

### Step 3: Add The React Native Dependency

For production customer apps, install the published npm packages:

```bash
npm install @tranzmit/react-native
npm install @react-native-async-storage/async-storage react-native-webview react-native-safe-area-context
```

For Yarn:

```bash
yarn add @tranzmit/react-native @react-native-async-storage/async-storage react-native-webview react-native-safe-area-context
```

For Expo apps, rebuild the development client if the app is not using Expo Go and these native modules are newly added.

```bash
npx expo prebuild
# or rebuild your EAS development client
```

Distribution note: this repository is a source workspace containing `packages/react-native` and `packages/shared`. The npm install commands above work after `@tranzmit/react-native` and `@tranzmit/shared` are published. npm cannot install `@tranzmit/react-native` directly from the GitHub workspace URL. For local SDK development, use this repo's `example/` app or local `file:` dependencies.

### Step 4: Import The SDK

Import from the npm package name:

```tsx
import { TranzmitProvider, useTranzmit } from "@tranzmit/react-native";
```

Do not import `tranzmit-react-native-sdk`; that is the GitHub repo name, not the package name.

### Step 5: Wrap The Root App

Place `TranzmitProvider` above every screen that may show a paywall.

```tsx
import { TranzmitProvider } from "@tranzmit/react-native";

export default function App() {
  const currentUser = useCurrentUserOrNull();

  return (
    <TranzmitProvider
      publicKey="pk_live_REPLACE_WITH_CUSTOMER_PUBLIC_KEY"
      userId={currentUser?.id}
      userTraits={currentUser ? { plan: currentUser.plan, country: currentUser.country } : undefined}
      onError={(error) => console.warn("[Tranzmit]", error)}
    >
      <RootNavigator />
    </TranzmitProvider>
  );
}
```

`apiBaseUrl` is optional for production because the SDK defaults to the hosted Tranzmit API. If a Tranzmit engineer gives you a custom API URL, pass it explicitly:

```tsx
<TranzmitProvider
  publicKey="pk_live_REPLACE_WITH_CUSTOMER_PUBLIC_KEY"
  apiBaseUrl="https://api-production-2146.up.railway.app"
  userId={currentUser?.id}
>
  <RootNavigator />
</TranzmitProvider>
```

### Step 6: Pass User Identity Correctly

If the user is logged out, omit `userId`. The SDK creates and persists a `stableID` automatically.

```tsx
<TranzmitProvider publicKey="pk_live_REPLACE_WITH_CUSTOMER_PUBLIC_KEY">
  <RootNavigator />
</TranzmitProvider>
```

If the user is logged in, pass the real app user ID. Do not generate fake logged-out user IDs.

```tsx
<TranzmitProvider
  publicKey="pk_live_REPLACE_WITH_CUSTOMER_PUBLIC_KEY"
  userId={currentUser.id}
  userTraits={{ plan: currentUser.plan }}
>
  <RootNavigator />
</TranzmitProvider>
```

Tranzmit always sends an install-level `stableID`. When the user is logged in, the request includes both the app `userId` and the same stable install ID. For paywall experiments, configure Statsig to bucket on the custom ID `stableID`. This keeps a user's paywall assignment consistent before and after login.

The SDK stores the stable ID in AsyncStorage per Tranzmit public key. It remains stable across app launches, but can reset if the user uninstalls the app, clears app data, or AsyncStorage is unavailable.

### Step 7: Present The Paywall At The Upgrade Moment

Call `gate()` where the app normally starts an upgrade flow. The SDK never shows a paywall automatically.

```tsx
import { Button } from "react-native";
import { useTranzmit } from "@tranzmit/react-native";

function UpgradeButton() {
  const { gate, reportConversion } = useTranzmit();

  return (
    <Button
      title="Upgrade"
      onPress={() => {
        const result = gate("upgrade_pro", {
          onCTA: async (product) => {
            // product.id is the Billing Product ID configured in the Tranzmit dashboard.
            // Tranzmit owns paywall UI. The host app owns billing and entitlements.
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
          // onFallback already routed to the existing in-app paywall.
          return;
        }
      }}
    />
  );
}
```

Replace `upgrade_pro` with the dashboard trigger if Tranzmit supplied a different trigger.

### Step 8: Fallback To The Existing App Paywall

Always wire `onFallback` to the app's current paywall. That keeps monetization available if Tranzmit config is still loading, the placement is missing or disabled, or the WebView renderer reports an error.

```tsx
const result = gate("upgrade_pro", {
  onCTA: (product) => purchaseProduct(product.id),
  onFallback: (event) => {
    console.warn("Tranzmit fallback", event.reason);
    openExistingInAppPaywall();
  },
});

if (!result.shown) {
  return; // onFallback already handled not_ready / placement_not_found.
}
```

Fallback reasons:

1. `not_ready`: the SDK has not loaded a valid config yet.
2. `placement_not_found`: the trigger has no enabled placement in config.
3. `render_error`: the hosted document or WebView failed after showing began.

### Step 9: Keep Billing In The Host App

When the paywall CTA is tapped:

1. Read `product.id`; this is the dashboard **Billing Product ID**.
2. Start the app's native purchase flow using `product.id`.
3. Wait for the purchase provider to confirm success.
4. Grant the entitlement in the app's existing entitlement system.
5. Call `reportConversion()` only after the purchase succeeds.
6. In the provider-driven `gate()` flow, the SDK dismisses the paywall before `onCTA` runs. If you render `TranzmitPaywall` declaratively, hide your own `visible` state after checkout or cancellation.

Tranzmit does not call StoreKit, Google Play Billing, RevenueCat, Razorpay, Stripe, restore purchases, or grant entitlements.

For Razorpay, put the checkout flow inside `onCTA`. The SDK callback is the handoff point from the hosted paywall to the customer app:

```tsx
const result = gate("upgrade_pro", {
  onCTA: async (product) => {
    // product.id comes from the dashboard Billing Product ID field.
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

`startRazorpayCheckout(product.id)` should be implemented by the host app. A common flow is: send `product.id` to the app backend, create or look up the Razorpay order/subscription there, open Razorpay checkout in React Native, verify the payment on the backend, then return success only after verification.

The SDK dismisses the Tranzmit paywall before calling `onCTA` in the provider-driven `gate()` flow. If the app needs a different UX, present the app's own checkout UI from `onCTA` and reopen or route as needed. For declarative `TranzmitPaywall` usage, the parent component owns `visible` and must hide it when appropriate.

### Step 10: Use Presentation Modes Carefully

Tranzmit supports `sheet`, `modal`, `fullscreen`, and `inline` presentation modes. If app code passes `presentation` to `gate()`, that local value wins. Otherwise, the SDK uses the server-provided presentation mode and falls back to `sheet`.

```tsx
gate("upgrade_pro", {
  presentation: "fullscreen",
  onCTA: purchaseProduct,
  onFallback: openExistingInAppPaywall,
});
```

Use `inline` only when rendering inside an existing screen layout. Most production upgrade flows should use `sheet`, `modal`, or `fullscreen`.

### Step 11: Declarative Paywall For Previews Or Custom Screens

For custom screens and previews, use `TranzmitPaywall` directly:

```tsx
<TranzmitPaywall
  trigger="upgrade_pro"
  visible={visible}
  presentation="inline"
  onCTA={(product) => purchaseProduct(product.id)}
  onDismiss={() => setVisible(false)}
  onError={(error) => {
    console.warn("Tranzmit paywall render error", error);
    setVisible(false);
    openExistingInAppPaywall();
  }}
/>
```

Most production apps should use `gate()` because it handles presentation, tracking, and fallback in one flow.

### Step 12: Verify The Integration

Run this QA checklist before shipping:

1. Launch the app and confirm there are no `onError` logs.
2. Confirm `useTranzmit().isReady` becomes `true`.
3. Confirm `getPlacement('upgrade_pro')` returns a placement for the configured trigger.
4. Confirm the dashboard paywall variant has the right **Billing Product ID**.
5. Temporarily use a missing trigger and confirm `onFallback` opens the existing app paywall.
6. Call `gate('upgrade_pro')` and confirm the remote WebView paywall renders.
7. Tap the CTA and confirm the host purchase flow starts for the matching billing product.
8. Complete a test purchase and confirm `reportConversion()` runs only after success.
9. Change paywall copy, product ID, or variants in the Tranzmit dashboard.
10. Call `await refreshConfig()` in QA.
11. Present the paywall again and confirm the dashboard change appears.

### Step 13: AI Agent Acceptance Criteria

If Claude, Codex, Cursor, or another coding agent implements this SDK, the task is done only when:

1. The app has `@tranzmit/react-native`, `@react-native-async-storage/async-storage`, `react-native-webview`, and `react-native-safe-area-context` installed.
2. The app imports from `@tranzmit/react-native`.
3. `TranzmitProvider` wraps the screens that may show a paywall.
4. The provided `publicKey` is passed to `TranzmitProvider`.
5. Logged-in users pass a real `userId`; logged-out users do not pass a fake ID.
6. Each dashboard paywall variant has a **Billing Product ID** matching the host app's billing provider.
7. The app calls `gate()` with the dashboard trigger.
8. `onCTA` starts native billing with `product.id`.
9. `onFallback` opens the app's existing paywall.
10. `reportConversion()` is called only after billing succeeds.
11. No hardcoded paywall UI is added to the host app.
12. The integration has a manual QA path that proves the remote paywall renders, opens the right billing product, and falls back safely.

## API Reference

### `TranzmitProvider`

```tsx
<TranzmitProvider
  publicKey="pk_live_..."
  userId={currentUser?.id}
  identifiers={{ accountID: account.id }}
  userTraits={{ plan: "free" }}
  privateTraits={{ internalSegment: "beta" }}
  apiBaseUrl="https://api-production-2146.up.railway.app"
  onError={(error) => console.warn(error)}
  debug={false}
>
  <App />
</TranzmitProvider>
```

| Prop | Required | Description |
|---|---:|---|
| `publicKey` | yes | Dashboard public key, usually `pk_live_...` or `pk_test_...`. |
| `userId` | no | Real logged-in app user ID. Omit for logged-out users. |
| `identifiers` | no | Extra stable IDs, such as `accountID` or `companyID`. |
| `userTraits` | no | Non-sensitive analytics/targeting traits. |
| `privateTraits` | no | Private traits sent to Tranzmit but not intended for client-side display. |
| `apiBaseUrl` | no | Override only when Tranzmit gives you a custom API URL. |
| `onError` | no | Receives SDK config/network errors. |
| `debug` | no | Enables SDK debug metadata/logging where supported. |

### `useTranzmit()`

```tsx
const {
  isReady,
  ready,
  gate,
  track,
  reportConversion,
  refreshConfig,
  flush,
  getPlacement,
} = useTranzmit();
```

| Field | Description |
|---|---|
| `isReady` / `ready` | True after valid config is loaded. |
| `gate(trigger, options)` | Presents a placement and returns `GateResult`. |
| `track(event, properties)` | Queues a custom analytics event. |
| `reportConversion(data)` | Sends a purchase/conversion event. |
| `refreshConfig()` | Refetches dashboard config. Use during QA after dashboard edits. |
| `flush()` | Flushes queued analytics events. |
| `getPlacement(trigger)` | Returns the current placement config or `null`. |

### `gate(trigger, options)`

```tsx
const result = gate("upgrade_pro", {
  presentation: "sheet",
  onCTA: (product) => {},
  onDismiss: () => {},
  onFallback: (event) => {},
  onImpression: () => {},
});
```

`GateResult`:

| Field | Description |
|---|---|
| `shown` | `true` when the Tranzmit paywall opened. `false` when fallback was used. |
| `variantId` | Assigned variant ID when available. |
| `dismiss()` | Dismisses the active provider-driven paywall. In the current RN `gate()` CTA flow the SDK already dismisses before `onCTA`, so this is mainly useful for host-driven cancellation or duplicate cleanup. |

`GateOptions`:

| Option | Description |
|---|---|
| `onCTA(product)` | Called when the hosted paywall CTA is tapped. Start billing here. |
| `onDismiss()` | Called when the user dismisses the paywall. |
| `onFallback(event)` | Called when Tranzmit cannot show the paywall. Open the existing app paywall here. |
| `onImpression()` | Called after the paywall impression is tracked. |
| `presentation` | Optional local override: `sheet`, `modal`, `fullscreen`, or `inline`. |

### `ProductSpec`

Important fields passed to `onCTA(product)`:

| Field | Description |
|---|---|
| `id` | Billing Product ID from the Tranzmit dashboard. Use this for native billing. |
| `name` | Product display name. |
| `description` | Optional product copy. |
| `price` | Either a formatted string or `{ amount, currency, interval? }`. |
| `metadata` | Optional dashboard metadata. |

### `FallbackEvent`

```ts
type FallbackReason = "not_ready" | "placement_not_found" | "render_error";

interface FallbackEvent {
  trigger: string;
  reason: FallbackReason;
  error?: Error;
  placement?: PlacementConfig;
  variantId?: string;
}
```

## Local Development

Install and validate the SDK workspace:

```bash
npm install --legacy-peer-deps
npm run build
npm test
```

Run the Expo harness:

```bash
cd example
npm install --legacy-peer-deps
EXPO_PUBLIC_TRANZMIT_TRIGGER=missing_trigger npm run start
```

Tap **Present**. For `missing_trigger`, the example should open the fallback dialog with reason `placement_not_found`.

## Troubleshooting

### The paywall does not show

Check these in order:

1. `isReady` is `true`.
2. The trigger passed to `gate()` exactly matches the dashboard placement trigger.
3. The placement is active and has at least one active variant.
4. The app is using the correct `publicKey`.
5. `onFallback` logs the reason.

### CTA taps but purchase does not start

The SDK does not process billing. Confirm `onCTA(product)` is wired and that `product.id` matches the billing provider's product/package ID.

### Wrong product opens

Fix the dashboard **Billing Product ID**. Do not map to a different product in app code unless the customer's billing backend intentionally owns that mapping.

### Dashboard edits do not appear during QA

Call `await refreshConfig()` after saving in the dashboard, then present the paywall again. Production apps also refresh using the server TTL.

### WebView render error falls back

If `onFallback` receives `render_error`, the hosted document or WebView failed after presentation began. The app should open the existing paywall and log the error for Tranzmit support.

## Repository Layout

```text
tranzmit-react-native-sdk/
├── packages/
│   ├── shared/          # HTTP client, identity, config, event batching, shared types
│   └── react-native/    # React Native provider, hook, WebView paywall presentation
└── example/             # Expo harness for local QA
```

`tranzmit-mobile-webview` remains the server and admin/dashboard codebase. This repository is the customer-facing React Native SDK.
