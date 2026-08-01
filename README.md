# tranzmit-react-native-sdk

Client React Native SDK for Tranzmit server-driven WebView paywalls. The SDK fetches remote placement config, renders hosted paywall documents, assigns users through server-side experiments, and sends impression / CTA / dismissal / conversion events back to Tranzmit.

The Git repository is named `tranzmit-react-native-sdk`. The npm package customers install and import is the published package `@tranzmit/react-native`.

## What Customers Need

To integrate Tranzmit, a customer app needs:

- The `@tranzmit/react-native` package.
- A Tranzmit public key from the dashboard, for example `pk_live_...` or `pk_test_...`.
- A placement trigger configured in the dashboard, usually `upgrade_pro`.
- A Billing Product ID configured on each paywall variant in the Tranzmit dashboard.
- A stable app user id when the user is logged in.
- A native purchase implementation in the host app: StoreKit, Google Play Billing, RevenueCat, Razorpay, Stripe, or another billing provider.

Once the public key and placement are configured in the dashboard, paywall changes and experiment splits flow remotely. The customer should not hardcode paywall UI in their app.

Tranzmit does **not** process purchases. Tranzmit owns paywall presentation, experimentation, and analytics. The customer app owns billing, entitlements, refunds, restore purchases, and subscription-provider integration.

The billing provider is the source of truth for prices, free trials, subscription periods, eligibility, and final checkout terms. Dashboard product fields are paywall presentation data and must stay aligned with StoreKit, Google Play Billing, RevenueCat, Razorpay, Stripe, or the customer backend. At checkout time, the host app must use `product.id` to start billing and must trust the billing provider's returned product details over dashboard copy.

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

Only the product identifier is authoritative in Tranzmit. Product titles, display prices, trial labels, and billing periods should either be generated from the billing provider upstream or treated as display copy that QA must compare against the provider's checkout sheet.

### Step 3: Add The React Native Dependency

For production customer apps, install the published npm package from the public npm registry:

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

Distribution note: this repository is a source workspace containing `packages/react-native` and `packages/shared`. Customers install only `@tranzmit/react-native`; npm resolves its internal `@tranzmit/shared` dependency. Do not install `@tranzmit/react-native` directly from the GitHub workspace URL. For local SDK development, use this repo's `example/` app or local `file:` dependencies.

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
  apiBaseUrl="https://api.tranzmitai.com"
  userId={currentUser?.id}
>
  <RootNavigator />
</TranzmitProvider>
```

By default the SDK fails over automatically: if the primary host is unreachable (for example, a mobile carrier blocking its DNS), config, hosted document, and event requests retry against built-in fallback hosts. Setting `apiBaseUrl` explicitly disables the built-in fallbacks so a staging URL never silently falls back to production; pass `fallbackApiBaseUrls` to combine a custom primary with failover.

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

Always wire `onFallback` to the app's current paywall. That keeps monetization available if Tranzmit config is still loading, the placement is missing or disabled, integrity validation fails, the paywall definition is invalid, the bridge version is unsupported, or the WebView renderer reports an error.

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

1. `not_ready`: the SDK has not loaded a valid config yet. This includes no network connectivity, configuration fetch failures, and startup before cache/network init completes.
2. `placement_not_found`: the trigger has no enabled placement in config.
3. `integrity_failed`: the hosted document did not match its SHA-256 integrity metadata.
4. `invalid_paywall`: the placement has no renderable document or products.
5. `unsupported_version`: the placement uses an unsupported WebView bridge version.
6. `render_error`: the hosted document or WebView failed after showing began.

### Step 9: Keep Billing In The Host App

When the paywall CTA is tapped:

1. Read `product.id`; this is the dashboard **Billing Product ID**.
2. Start the app's native purchase flow using `product.id`.
3. Let the billing provider return the authoritative localized title, price, free trial, billing period, and checkout terms.
4. Grant the entitlement in the app's existing entitlement system.
5. Call `reportConversion()` only after the purchase succeeds.
6. In the provider-driven `gate()` flow, the SDK dismisses the paywall before `onCTA` runs. If you render `TranzmitPaywall` declaratively, hide your own `visible` state after checkout or cancellation.

Tranzmit does not call StoreKit, Google Play Billing, RevenueCat, Razorpay, Stripe, restore purchases, or grant entitlements.

Do not use dashboard price strings as the billing source of truth. If the hosted paywall displays prices or trial language, QA must verify that the visible copy matches the provider checkout for every locale and product.

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
9. Confirm the checkout sheet price, free trial, and billing period match the paywall copy.
10. Temporarily return a hosted document with a bad `sha256` integrity value and confirm fallback opens instead of rendering.
11. Change paywall copy, product ID, or variants in the Tranzmit dashboard.
12. Call `await refreshConfig()` in QA.
13. Present the paywall again and confirm the dashboard change appears.

If the integration uses the [embedded UPI checkout (pay-bar)](#embedded-upi-checkout-pay-bar), also verify:

14. On an Android device with at least one UPI app installed, confirm the "PAY USING" selector renders next to the CTA and lists the detected apps.
15. Pick a different app in the drawer and confirm a `checkout_app_selected` analytics event is tracked.
16. Tap the CTA and confirm `onCTA` receives `checkout.paymentApp` with the picked app's `id`, `name`, and `packageName`, and that `cta_click` carries `payment_app`.
17. Cancel or fail the UPI mandate and confirm the paywall stays up (`dismissOnCTA: false`) and the CTA can be tapped again.
18. Authorize a test mandate and confirm `reportConversion()` runs only after backend verification, then `result.dismiss()` closes the paywall.
19. On iOS, confirm the plain full-width CTA renders and the Standard Checkout fallback starts from `onCTA`.
20. On an Android device or emulator with zero UPI apps, confirm the plain CTA renders and the classic billing flow runs.
21. Set `checkout.ui.enabled: false` in the dashboard, call `await refreshConfig()`, and confirm the plain CTA returns and `cta_click` carries no `payment_app`.

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

## Embedded UPI checkout (pay-bar)

Available from `@tranzmit/react-native` 0.4.0 (`@tranzmit/shared` 0.4.0).

The pay-bar is an optional band inside the hosted paywall document: a "PAY USING \<app\>" selector next to the primary CTA that lists the UPI apps installed on the user's device. The host app detects the installed apps and passes them to the SDK; the SDK injects the detected-app list into the WebView; when the user taps the CTA, the SDK returns the user's chosen app to the host app as a second `onCTA` argument.

The billing boundary from [Step 9](#step-9-keep-billing-in-the-host-app) is unchanged:

1. Tranzmit never processes purchases. The SDK never bundles Razorpay.
2. Tranzmit owns the selector UI, experimentation, and analytics.
3. The host app owns UPI app detection, the mandate/payment flow, backend verification, and entitlements.
4. The WebView never receives a `packageName` field and can never open apps. The injected list is `{ id, name }` only; the six registry apps are identified by a Tranzmit alias id, while a non-registry app is identified by its package name as its id. The document can only echo an id back; the SDK resolves it natively. Every payment action runs in the host app's native code.

### Android-only, with an iOS fallback

The in-paywall app selector and direct mandate flow are **Android-only**. Razorpay does not support UPI Autopay intent through Custom Checkout or server-to-server integration on iOS for any UPI app.

On iOS the pay-bar degrades to the plain full-width CTA automatically. For iOS subscriptions, run Razorpay Standard Checkout with a `subscription_id` via `react-native-razorpay` inside `onCTA`. Note the open issue [razorpay/react-native-razorpay#506](https://github.com/razorpay/react-native-razorpay/issues/506): opening Standard Checkout with a `subscription_id` on iOS can leave a white screen on close — QA the close path explicitly. Subscriptions-product UPI (`plan`/`subscription_id`) is early access at Razorpay, and its only documented client path is Standard Checkout.

Do not build a UPI Collect fallback: UPI Collect is deprecated for new Autopay registrations since 28 Feb 2026.

### Integration steps

**Prerequisite:** have Tranzmit configure `spec.checkout` on the paywall variant(s) in the dashboard — its presence is the master opt-in. Without it the pay-bar never renders and `onCTA`'s second argument is `undefined` (see the [`spec.checkout` dashboard reference](#speccheckout-dashboard-reference)).

1. **Install `react-native-customui` in your app.** This is Razorpay's custom-checkout React Native package, and it belongs in the customer app; the Tranzmit SDK never depends on it. Its Android artifact ships the `<queries>` UPI intent block, so no host manifest edit is needed for app detection. It is a native module: Expo apps need a development client / prebuild. If the app also ships the [iOS subscription fallback](#android-only-with-an-ios-fallback), additionally install `react-native-razorpay` in the customer app (also never in the SDK).
2. **Detect installed UPI apps** on Android with `Razorpay.getAppsWhichSupportUPI(cb)` and map each detected entry to `CheckoutAppInput { packageName, name }`. Do not pass detected apps on iOS.
3. **Pass the list as `checkoutApps` to `TranzmitProvider`.** The SDK sanitizes it once (see [App list sanitization](#app-list-sanitization)).
4. **Call `gate()` with `dismissOnCTA: false`** and the widened `onCTA(product, checkout)`. `checkout.paymentApp` is the user's selected app (`{ id, name, packageName }`); `checkout.provider` is the dashboard-configured passthrough config, delivered verbatim.
5. **Run the Razorpay charge-at-will mandate flow** from `onCTA` (see [the mandate flow](#razorpay-charge-at-will-mandate-flow)).
6. **On success, call `reportConversion()` then `result.dismiss()`. On failure, return without dismissing.** The paywall stays up so the user can retry — that is why `dismissOnCTA: false` exists.

The types involved:

```ts
// Host app → TranzmitProvider:
interface CheckoutAppInput {
  packageName: string; // Android package name from detection
  name?: string;       // device-reported display label
  id?: string;
}

// SDK → host app, inside CheckoutContext:
interface ResolvedCheckoutApp {
  id: string;          // registry id (e.g. "phonepe") or the package name for unknown apps
  name: string;
  packageName: string;
}

// Second onCTA argument. undefined exactly when the variant has no spec.checkout.
interface CheckoutContext {
  paymentApp?: ResolvedCheckoutApp;   // undefined when no app was selected/resolved
  provider?: Record<string, unknown>; // spec.checkout.provider, verbatim
}
```

### Complete example

Provider wiring:

```tsx
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import Razorpay from "react-native-customui";
import { TranzmitProvider, type CheckoutAppInput } from "@tranzmit/react-native";

export default function App() {
  const currentUser = useCurrentUserOrNull();
  const [checkoutApps, setCheckoutApps] = useState<CheckoutAppInput[]>([]);

  useEffect(() => {
    if (Platform.OS !== "android") return; // the pay-bar is Android-only
    Razorpay.getAppsWhichSupportUPI((apps) => {
      setCheckoutApps(
        apps.map((app) => ({
          packageName: app.packageName,
          name: app.appName,
        }))
      );
    });
  }, []);

  return (
    <TranzmitProvider
      publicKey="pk_live_REPLACE_WITH_CUSTOMER_PUBLIC_KEY"
      userId={currentUser?.id}
      checkoutApps={checkoutApps}
      onError={(error) => console.warn("[Tranzmit]", error)}
    >
      <RootNavigator />
    </TranzmitProvider>
  );
}
```

Gate handler:

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
          dismissOnCTA: false, // keep the paywall up until the mandate succeeds
          onCTA: async (product, checkout) => {
            if (!checkout) {
              // The variant has no spec.checkout: run the classic Step 9 flow,
              // then dismiss manually because dismissOnCTA is false.
              const success = await purchaseProduct(product.id);
              if (!success) return;
              reportConversion({
                trigger: "upgrade_pro",
                variantId: result.variantId,
                productId: product.id,
                revenue: 999,
                currency: "INR",
              });
              result.dismiss();
              return;
            }

            // checkout.paymentApp: the user's selected UPI app
            //   ({ id, name, packageName }), or undefined on iOS, with zero
            //   detected apps, or with checkout.ui.enabled: false. On iOS,
            //   run Razorpay Standard Checkout with a subscription_id here.
            // checkout.provider: the dashboard-configured passthrough config,
            //   delivered verbatim. Validate before use (see Security notes).
            const authorized = await startUpiAutopayMandate(product.id, checkout);
            if (!authorized) {
              return; // Mandate failed or abandoned. The paywall stays up for retry.
            }

            reportConversion({
              trigger: "upgrade_pro",
              variantId: result.variantId,
              productId: product.id,
              revenue: 1, // the captured ₹1 authorization charge
              currency: "INR",
            });
            result.dismiss(); // Host-driven dismissal replaces the automatic one.
          },
          onFallback: (event) => {
            console.warn("Tranzmit fallback", event.reason);
            openExistingInAppPaywall();
          },
        });
      }}
    />
  );
}
```

`startUpiAutopayMandate(product.id, checkout)` is host-app code. Implement it with the mandate flow below and return `true` only after your backend verifies the authorization.

### Razorpay charge-at-will mandate flow

The recommended server model is token-based recurring — "charge-at-will" (CAW) — which Razorpay officially supports for custom UIs:

1. `POST /v1/customers` — create or look up the Razorpay customer.
2. `POST /v1/orders` with `token: { max_amount, frequency, expire_at }`. Keep `max_amount` at or below ₹15,000 so subsequent debits need no additional factor auth (UPI PIN).
3. `POST /v1/payments/create/upi` with `recurring: "1"` and `upi: { flow: "intent" }`. The response contains an intent link that launches the user's UPI app.
4. The ₹1 authorization charge is **captured** — that is the "₹1 today" trial charge. Your backend then schedules each recurring debit, with the mandatory 24-hour pre-debit notification.
5. Verify the payment on your backend before treating the mandate as authorized and calling `reportConversion()`.

Client-side alternative: after your backend creates the order, open the payment directly with `react-native-customui`, routing to the app the user picked in the pay-bar:

```tsx
Razorpay.open({
  key_id: RAZORPAY_KEY_ID,
  amount: amountInPaise,
  currency: "INR",
  method: "upi",
  upi_app_package_name: checkout.paymentApp.packageName,
  "_[flow]": "intent",
  // order_id and customer fields from your backend
});
```

Go-live for recurring involves a Razorpay support touchpoint per merchant account. Confirm the account is enabled for token-based recurring before shipping.

### `spec.checkout` dashboard reference

`spec.checkout` is configured per paywall variant in the Tranzmit dashboard. Its presence is the master opt-in: without it, the SDK injects an empty object into the WebView and `onCTA` keeps the exact legacy single-argument behavior.

`checkout.provider` is an opaque JSON object passed verbatim to the host app as `checkout.provider` on CTA. The SDK never interprets it and never injects it into the WebView. Typical use: Razorpay key id, plan reference, mandate cap, order endpoint. Do not put secrets in it — it is delivered to the client.

`checkout.ui` controls the in-document bar:

| Field | Type | Default | Effect |
|---|---|---|---|
| `enabled` | boolean | `true` | `false`: the SDK injects `{}` into the WebView and strips `paymentApp` from `cta` messages. The document renders the plain CTA. |
| `showToggle` | boolean | `true` | `false`: the document renders plain CTA visuals with no selector, but the resolved default app is still attached to the `cta` message silently. |
| `appPriority` | string[] | device order | Ordered app ids. Max 32 entries; each must match `^[A-Za-z0-9._-]{1,64}$` (violating entries are dropped, not truncated). |
| `defaultApp` | string | unset | Preselected app id. Selection resolution: `defaultApp` → first `appPriority` match → first detected app. |
| `maxVisibleApps` | number | `5` | Drawer rows before internal scrolling. A finite integer ≥ 1 is clamped to 1..12; any other value falls back to the default 5. |
| `iconStyle` | `"tile"` \| `"circle"` | `"tile"` | Icon frame shape for app glyphs. |
| `fallbackToPlainCta` | boolean | `true` | `false`: with zero detected apps the document renders an inert generic-UPI badge instead of the plain CTA, keeping the band height stable. |

All `checkout.ui` fields are config data delivered outside the document integrity hash: dashboard edits apply without re-hashing or redeploying the document.

### Known-app registry

The SDK maps detected package names to a fixed registry of app ids. Use these ids in `checkout.ui.appPriority` and `checkout.ui.defaultApp`:

| Android package | App id | Display name |
|---|---|---|
| `net.one97.paytm` | `paytm` | Paytm |
| `com.phonepe.app` | `phonepe` | PhonePe |
| `com.google.android.apps.nbu.paisa.user` | `gpay` | Google Pay |
| `in.org.npci.upiapp` | `bhim` | BHIM |
| `in.amazon.mShop.android.shopping` | `amazonpay` | Amazon Pay |
| `com.dreamplug.androidapp` | `cred` | CRED |

Any other detected app keeps its package name as its id and its device-reported label as its display name, and renders with a generic UPI glyph.

### App list sanitization

The SDK sanitizes `checkoutApps` once, before anything reaches the WebView:

1. At most 16 entries are kept.
2. A known package name maps to its registry id and registry display name; the device-reported name is ignored.
3. An unknown package name must match `^[A-Za-z0-9._-]{1,64}$` or the entry is dropped; its id is the package name. An unknown package name that equals one of the six registry ids (for example a bare `paytm`) is dropped — real Android package names contain a dot.
4. Device-reported names for unknown apps are sanitized: C0/C1 control characters and every Unicode format character (category `Cf` — bidi controls, zero-width characters, soft hyphens, and similar invisibles) are stripped, whitespace is collapsed and trimmed, and the result is capped at 48 characters (never splitting a surrogate pair). A name that is empty after sanitizing drops the entry.
5. Anti-spoofing: an unknown app whose sanitized name — lowercased with all whitespace removed — equals a registry display name (paytm, phonepe, googlepay, bhim, amazonpay, cred) is dropped entirely.
6. Duplicate ids are deduplicated; the first entry wins.

### Fallback matrix

The second `onCTA` argument is `undefined` only when `spec.checkout` is absent from the variant. In every other degraded row the host still receives a `CheckoutContext` (with the `provider` passthrough); only `paymentApp` is missing.

| Condition | Paywall renders | `onCTA` second argument |
|---|---|---|
| Old SDK (< 0.4.0) + pay-bar document | Plain full-width CTA (the document defaults to plain until the SDK activates it) | Not passed (old one-argument signature) |
| New SDK + old document (no pay-bar markup) | Unchanged | `CheckoutContext` without `paymentApp` when the variant sets `spec.checkout`; `undefined` otherwise |
| `spec.checkout` absent on the variant | Plain CTA | `undefined` — exact legacy behavior |
| `checkout.ui.enabled: false` | Plain CTA; the SDK injects `{}` and strips `paymentApp` from `cta` messages | `CheckoutContext` with `paymentApp` undefined |
| Zero UPI apps detected, or `checkoutApps` not passed | Plain CTA (inert generic-UPI badge instead if `fallbackToPlainCta: false`) | `CheckoutContext` with `paymentApp` undefined |
| iOS | Plain CTA | `CheckoutContext` with `paymentApp` undefined |
| `checkout.ui.showToggle: false` | Plain CTA visuals, no selector | `CheckoutContext` with the silently resolved default app in `paymentApp` |

### Analytics

The paywall impression is still tracked once per `gate()`. Two things change:

1. `cta_click` now carries `payment_app` — the resolved app id — when the CTA included a selected app. With `dismissOnCTA: false`, each CTA attempt tracks its own `cta_click`.
2. New `checkout_app_selected` event, tracked whenever the user picks an app in the drawer. Its `app` property is the registry id for the six known apps; any other app is reported as `"other"`.

### Security notes

1. **`checkout.provider` is untrusted input.** It is delivered on the config channel, outside the document integrity hash. Host apps MUST validate every URL-valued field (for example an order endpoint) against an allowlist compiled into the app binary before using it. Never eval it, and never interpolate its values into native UI templates. On the dashboard side, never put secrets in it — it is delivered to the client.
2. **The WebView never receives a `packageName` field.** The injected list contains only `{ id, name }` pairs — for the six registry apps the id is a Tranzmit alias, while a non-registry app is identified by its package name as its id. The document echoes an app id back on the `cta` message; the SDK resolves it natively against the sanitized list, a forged or unknown id resolves to no `paymentApp`, and the WebView can never open apps.
3. **The WebView can never open apps.** Intent launches, mandate creation, and every Razorpay call run in the host app's native code. As in [Paywall Security](#paywall-security), hosted paywalls must not navigate to checkout pages.
4. The document authoring contract for pay-bar paywalls lives in `templates/paybar/`.

## API Reference

### `TranzmitProvider`

```tsx
<TranzmitProvider
  publicKey="pk_live_..."
  userId={currentUser?.id}
  identifiers={{ accountID: account.id }}
  userTraits={{ plan: "free" }}
  privateTraits={{ internalSegment: "beta" }}
  apiBaseUrl="https://api.tranzmitai.com"
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
| `checkoutApps` | no | Detected UPI apps (`CheckoutAppInput[]`) for the [embedded UPI checkout (pay-bar)](#embedded-upi-checkout-pay-bar). Android-only; omit or pass `[]` on iOS. |
| `apiBaseUrl` | no | Override only when Tranzmit gives you a custom API URL. |
| `onError` | no | Receives SDK config/network errors. |
| `debug` | no | Enables SDK debug metadata/logging where supported. |

### `useTranzmit()`

```tsx
const {
  isReady,
  ready,
  gate,
  preloadPlacement,
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
| `preloadPlacement(trigger, options?)` | Mounts a hidden WebView for a placement and resolves when the document is ready. |
| `track(event, properties)` | Queues a custom analytics event. |
| `reportConversion(data)` | Sends a purchase/conversion event. |
| `refreshConfig()` | Refetches dashboard config. Use during QA after dashboard edits. |
| `setTraits(traits, options?)` | Updates user traits and refetches config so the backend can re-route the placement. Resolves after the paywall document is hydrated. See [Routing by category](#routing-by-category-dynamic-traits). |
| `flush()` | Flushes queued analytics events. |
| `getPlacement(trigger)` | Returns the current placement config or `null`. |

### `preloadPlacement(trigger, options?)`

```tsx
function UpgradeScreen() {
  const { isReady, preloadPlacement, gate } = useTranzmit();

  useEffect(() => {
    if (!isReady) return;
    void preloadPlacement("upgrade_pro", { presentation: "sheet" });
  }, [isReady, preloadPlacement]);

  return (
    <Button
      title="Upgrade"
      onPress={() => {
        gate("upgrade_pro", {
          presentation: "sheet",
          onCTA: (product) => purchaseProduct(product.id),
          onFallback: () => openExistingInAppPaywall(),
        });
      }}
    />
  );
}
```

`preloadPlacement()` does not track an impression and does not call `onCTA` / `onDismiss`; it only warms the hosted WebView slot inside `TranzmitProvider`. The impression is tracked when `gate()` reveals that warmed slot. The preload key includes trigger, variant ID, document cache key/revision, and presentation mode, so changing config, identity, traits, or presentation invalidates stale hidden slots.

`PreloadResult`:

| Field | Description |
|---|---|
| `ok` | `true` when the hidden WebView reached ready state. |
| `status` | `ready`, `loading`, or `failed`. Awaited calls normally resolve as `ready` or `failed`. |
| `reason` | Fallback-style reason when preload cannot start or render. |
| `variantId` | Assigned variant ID when a placement was found. |

### `gate(trigger, options)`

```tsx
const result = gate("upgrade_pro", {
  presentation: "sheet",
  onCTA: (product, checkout) => {},
  onDismiss: () => {},
  onFallback: (event) => {},
  onImpression: () => {},
  dismissOnCTA: true,
});
```

`GateResult`:

| Field | Description |
|---|---|
| `shown` | `true` when the Tranzmit paywall opened. `false` when fallback was used. |
| `variantId` | Assigned variant ID when available. |
| `dismiss()` | Dismisses the active provider-driven paywall. In the default `gate()` CTA flow the SDK already dismisses before `onCTA`, so this is mainly useful for host-driven cancellation or duplicate cleanup. With `dismissOnCTA: false`, call this after checkout succeeds. |

`GateOptions`:

| Option | Description |
|---|---|
| `onCTA(product, checkout?)` | Called when the hosted paywall CTA is tapped. Start billing here. `checkout` is a [`CheckoutContext`](#embedded-upi-checkout-pay-bar) when the variant configures `spec.checkout`; `undefined` otherwise. |
| `onDismiss()` | Called when the user dismisses the paywall. |
| `onFallback(event)` | Called when Tranzmit cannot show the paywall. Open the existing app paywall here. |
| `onImpression()` | Called after the paywall impression is tracked. |
| `presentation` | Optional local override: `sheet`, `modal`, `fullscreen`, or `inline`. |
| `dismissOnCTA` | Optional, default `true`: the SDK dismisses the paywall before `onCTA` runs (existing behavior). Set `false` to keep the paywall up through `onCTA` — required for the [pay-bar mandate flow](#embedded-upi-checkout-pay-bar) — then dismiss with `result.dismiss()` after success. |

### `ProductSpec`

Important fields passed to `onCTA(product)`:

| Field | Description |
|---|---|
| `id` | Billing Product ID from the Tranzmit dashboard. Use this for native billing. |
| `name` | Product display name. |
| `description` | Optional product copy. |
| `price` | Display copy from Tranzmit. The billing provider remains authoritative for checkout price, trial, and period. |
| `metadata` | Optional dashboard metadata. |

### `FallbackEvent`

```ts
type FallbackReason =
  | "not_ready"
  | "placement_not_found"
  | "render_error"
  | "integrity_failed"
  | "invalid_paywall"
  | "unsupported_version";

interface FallbackEvent {
  trigger: string;
  reason: FallbackReason;
  error?: Error;
  placement?: PlacementConfig;
  variantId?: string;
}
```

## Paywall Security

Hosted WebView documents fail closed before rendering:

1. Hosted document responses must include config-side SHA-256 integrity metadata in `spec.document.integrity`.
2. The SDK downloads the hosted HTML payload, computes SHA-256, and compares it with the configured integrity value.
3. If integrity is missing, unsupported, or mismatched, the SDK does not cache or render the document.
4. Provider-driven `gate()` calls surface `integrity_failed` through `onFallback` when the readiness failure is caused by integrity validation. The provider `onError` also receives a `TranzmitError` with code `paywall_integrity_failed`.

WebView capabilities are intentionally narrow:

1. JavaScript is enabled because hosted paywalls use the Tranzmit bridge.
2. DOM storage, file access, universal file URL access, mixed content, third-party cookies, shared cookies, and automatic JS windows are disabled.
3. Top-level navigation is limited to inline document URLs and exact `security.allowedOrigins`.
4. `postMessage` payloads must be JSON objects with allowed bridge actions.
5. CTA messages can only select products already present in `spec.products`.
6. External URL opens are blocked unless the spec sets `security.externalUrlHosts`; allowed schemes default to `https`.

CTA taps are callbacks into React Native. Hosted paywalls should not redirect to Razorpay, Stripe, StoreKit, Play Billing, `about:blank`, or arbitrary checkout pages.

## Personalized Paywall Resources

Hosted paywalls can render per-user resources (for example a personalized hero image served from your own API) without breaking document integrity. The SDK exposes the resolved user identity to the WebView and resolves URL templates at runtime, so the hosted HTML stays static and hash-stable.

The bridge injects `window.Tranzmit.user`:

```ts
window.Tranzmit.user = {
  id?: string;       // resolved id: userId when logged in, otherwise stableID
  userId?: string;   // app-provided user id, present only for logged-in users
  stableID?: string; // SDK-generated anonymous id
};
```

Only these resolved id fields are exposed. Traits, private traits, and the raw identifier map are not sent into the WebView.

Add a `data-tranzmit-src` attribute with `{token}` placeholders:

```html
<img data-tranzmit-src="https://api.yourapp.com/paywall-image?uid={userId}" alt="" />
```

Available tokens are `{id}`, `{userId}`, and `{stableID}`. Unknown or missing values resolve to an empty string. You can also call `window.Tranzmit.fillTemplate("...{id}...")` directly from your paywall JS.

### Fallback image

Add `data-tranzmit-fallback-src` to supply a default image that is shown if the personalized image fails to load (network error, 404, missing user, etc.):

```html
<img
  data-tranzmit-src="https://api.yourapp.com/paywall-image?uid={userId}"
  data-tranzmit-fallback-src="https://cdn.yourapp.com/paywall/default.png"
  alt=""
/>
```

How it works:

1. The SDK wires an `onerror` handler at compose time. On the first load failure it swaps `src` to the resolved `data-tranzmit-fallback-src` value.
2. The fallback URL also supports `{id}` / `{userId}` / `{stableID}` tokens.
3. The handler clears itself before swapping, so if the fallback also fails there is no retry loop. Use a reliably available URL for the fallback (for example a CDN asset, not another personalized endpoint).
4. The fallback is opt-in per image. Images without `data-tranzmit-fallback-src` are left untouched on error.

### Latency

The SDK composes the WebView document on-device with the user context already in hand, so it resolves `data-tranzmit-src` into a real `src` **before** the markup reaches the WebView. The image fetch therefore starts as soon as the tag is parsed (preload-scanner friendly), with no WebView-side JavaScript on the critical path. The bridge also re-resolves these templates at runtime, which covers nodes a hosted paywall inserts dynamically.

Notes:

1. Personalization has no measurable latency cost. Token substitution is a microsecond-scale string replace; the only real cost is the network fetch of the image itself, which is identical however the `src` is set. Integrity validation is a one-time hash of the document at config-load time and does not run per image or at render time.
2. Because only the id value is substituted and the host is baked into the integrity-checked document, the document hash does not change per user, so caching and integrity both hold.
3. `<img>` loads are subresources and do not require CORS on your API. They must be HTTPS (`mixedContentMode` is `never`).
4. If you need the backend to choose the entire URL, your paywall JS can `fetch()` your API for the URL, but that path requires your API to send `Access-Control-Allow-Origin` because the WebView origin is `about:blank`.

## Routing by language and intent (dynamic traits)

Use this when the paywall a user should see depends on something you learn **during the session** — for example the user's `language` and purchase `intent` from an onboarding chat or quiz. You keep **one** dashboard trigger (e.g. `upgrade_pro`) and let Tranzmit re-route it to the right Statsig experiment or paywall based on traits you set at runtime with `setTraits`.

Key idea: **initializing the SDK is not the same as showing a paywall.** The provider mounts once at launch and renders nothing until you call `gate()`. So the flow is three distinct moments:

| Moment | You call | What happens |
|---|---|---|
| App launch | mount `<TranzmitProvider>` | One bootstrap fetch. The trigger resolves to a **default/holdout** paywall. Nothing is shown. |
| Mid-session (language and intent known) | `await setTraits({ language, intent })` | Refetches config with the traits so the backend re-routes the trigger, then warms (hydrates) the routed paywall. |
| Upgrade moment | `gate("upgrade_pro", …)` | Presents the warmed paywall instantly — no spinner. |

### Part A — Tranzmit dashboard / backend setup (one time)

You (the Tranzmit team) do this once; the customer app does not touch it.

1. **Create one trigger** (e.g. `upgrade_pro`). Do not create a separate trigger per language or intent.
2. **Add a default/holdout paywall** that the trigger returns when routing traits are absent. This is what the app shows if the classification call is slow, fails, or hasn't run yet — so it must be a real, sellable paywall.
3. **Add targeting rules** so `/v1/config` reads `traits.language` and `traits.intent`, then selects the matching Statsig experiment / multi-armed bandit (e.g. `{ language: "hi", intent: "wealth" }` → `paywall_hi_wealth`).
4. **Bucket assignment on the custom ID `stableID`** so a user keeps the same variant across sessions and across login/logout.
5. **Set a Billing Product ID on every variant** in every bandit (see [Step 2](#step-2-configure-billing-product-ids-in-tranzmit)).

Assignment stays server-side. The app never talks to Statsig and never picks a variant — it only renders the assigned `spec` and emits the impression / CTA / conversion signals (tagged with `variantId`) that the bandit uses as its reward loop.

### Part B — Customer app setup (step by step)

**Step 1 — Mount the provider at launch (already done in [Step 5](#step-5-wrap-the-root-app)).** No language/intent routing traits yet; the trigger resolves to the default paywall in the background.

**Step 2 — When your app knows the language and intent, call `setTraits`.** This is *your* classification flow (Tranzmit does not call your endpoint). Awaiting `setTraits` means "the routed paywall is now warm in cache."

```tsx
const { setTraits, gate } = useTranzmit();

// Example: fired ~30s into the onboarding chat, as soon as you can classify.
async function onRoutingTraitsResolved() {
  const { language, intent } = await classifyUserIntent(); // e.g. "hi", "wealth"
  await setTraits({ language, intent });
}
```

**Step 3 — At the upgrade moment, present from the warm cache.** Instant render, no network wait.

```tsx
function onPaywallMoment() {
  const result = gate("upgrade_pro", {
    onCTA: async (product) => {
      const ok = await purchaseProduct(product.id);
      if (!ok) return;
      reportConversion({
        trigger: "upgrade_pro",
        variantId: result.variantId, // ties the conversion back to the bandit arm
        productId: product.id,
        revenue: 999,
        currency: "INR",
      });
    },
    onFallback: () => openExistingInAppPaywall(),
  });
}
```

**Step 4 — Handle the slow/failed classification path.** You do not need extra error handling: if classification is slow or fails, just call `gate()` anyway. It shows whatever the trigger currently resolves to (the launch-time default), and if no placement exists at all it calls `onFallback`. Optionally wrap the call so a slow classification step never blocks the paywall:

```tsx
try {
  await Promise.race([
    onRoutingTraitsResolved(),
    new Promise((r) => setTimeout(r, 1500)), // cap the wait; fall back to default
  ]);
} catch {
  /* default paywall is already warm */
}
onPaywallMoment();
```

### Behavior and guarantees

1. `setTraits(traits, options?)` **merges** into existing traits by default; pass `{ merge: false }` to replace them entirely. Traits go on the `/v1/config` request (so the backend can route) and on analytics events (so conversions are attributed).
2. It refetches and hydrates **in place without flipping `isReady`**, so an already-presented paywall is never torn down.
3. Calling `setTraits` again with new `language` or `intent` values re-routes and re-warms; the latest call wins.
4. Traits set via `setTraits` **persist across internal re-initialization** (for example when the `userId` or `userTraits` props change).
5. If `setTraits` fails (network), the previously hydrated config is left intact so `gate()` still works.

## Localization

Localize one paywall design instead of building one paywall per language. The hosted document keeps a **single layout** and marks each piece of text with a `{{key}}` token; the translations for every language ship on the spec, and the SDK substitutes the right language on-device before the WebView renders.

This means: same document, same integrity hash, all languages — and switching language needs no network call.

### Part A — Tranzmit dashboard setup (one time)

**Step 1 — Tokenize the hosted document.** Replace every user-visible string with a `{{key}}` token. Tokens work in text *and* in attributes like `alt` or `aria-label`.

For reusable localized paywalls, ship this as a file named `paywall.html`. Use one layout only. Token names must use word characters only (`snake_case` is recommended), because SDKs resolve tokens with the `{{token_name}}` form.

```html
<!-- paywall.html -->
<main aria-label="{{paywall_aria_label}}">
  <h1>{{headline_prefix}} <span>{{headline_highlight}}</span></h1>
  <p>{{subtitle}}</p>
  <img data-tranzmit-src="https://cdn.yourapp.com/hero.png" alt="{{hero_alt}}" />
  <button data-tranzmit-action="cta" data-product-id="pro_monthly">{{cta}}</button>
</main>
```

Do not leave local relative image paths such as `assets/hero.png` in production HTML. Use embedded `data:` URIs or public `https://...` URLs so the hosted WebView can load the asset.

**Step 2 — Add translations.** In the dashboard, upload `paywall.html` plus a `translations.json` file. The dashboard stores the strings on `spec.localization`, delivered in the normal `/v1/config` payload. Provide a `defaultLocale` and a `translations` map keyed by locale, with one entry per token.

```jsonc
// translations.json
{
  "name": "HiAstro Expert Predictions Paywall",
  "defaultLocale": "hi-en",
  "translations": {
    "hi-en": {
      "paywall_aria_label": "HiAstro expert predictions paywall",
      "headline_prefix": "Apni Kundli ke Experts se",
      "headline_highlight": "Sahi Predictions Paayein",
      "subtitle": "50 Lakh+ logon ka bharosa - zindagi ke har sawaal ka jawaab",
      "hero_alt": "Astrology expert illustration",
      "cta": "Abhi Premium Shuru Karein"
    },
    "en": {
      "paywall_aria_label": "HiAstro expert predictions paywall",
      "headline_prefix": "Get Accurate Predictions from",
      "headline_highlight": "Expert Astrologers",
      "subtitle": "Trusted by 50L+ users for cosmic clarity and life decisions",
      "hero_alt": "Astrology expert illustration",
      "cta": "Unlock HiAstro Premium"
    }
  },
  "products": [
    {
      "id": "pro_monthly",
      "name": "Pro Monthly",
      "price": "₹49 trial",
      "description": "then ₹499/month"
    }
  ],
  "templateId": "hiastro_expert_predictions_paywall",
  "presentation": { "mode": "sheet" }
}
```

Every key used as a `{{token}}` in `paywall.html` must exist in every locale map. At minimum, every key must exist in `defaultLocale` so there is always a safe fallback. The dashboard validates missing tokens before save.

For automation, the admin API can send the same shape as a single JSON payload by including `html` and `localization`:

```jsonc
{
  "name": "Localized Paywall",
  "html": "<main><h1>{{headline}}</h1></main>",
  "localization": {
    "defaultLocale": "hi-en",
    "translations": {
      "hi-en": { "headline": "Premium shuru karein" },
      "en": { "headline": "Start Premium" }
    }
  },
  "products": [{ "id": "pro_monthly", "name": "Pro Monthly", "price": "₹49 trial" }]
}
```

### Part B — Customer app setup

**Step 3 — Pass the active language as the `locale` prop.** That is the only app change. Use whatever locale your app already tracks (user setting or device locale resolved by your app).

```tsx
<TranzmitProvider publicKey="pk_live_..." locale="es">
  <App />
</TranzmitProvider>
```

To switch language at runtime, just change the prop — no refetch, no flash, because all translations are already in the cached config.

```tsx
const [locale, setLocale] = useState(deviceLocale());
<TranzmitProvider publicKey="pk_live_..." locale={locale}>...</TranzmitProvider>
```

### How resolution works

1. The active language is the `locale` prop. The SDK looks up `translations[locale]`, then falls back to the base language (`es-MX` → `es`), then to `defaultLocale`. A **missing individual key** falls back per-key to `defaultLocale`, then to an empty string.
2. Substitution happens at **compose time** (before the WebView paints), so there is no untranslated flash. Translated strings are **HTML-escaped**.
3. **Integrity is preserved.** The hashed document contains the `{{...}}` tokens, so its hash is identical for every language. Translations are config data, not part of the document hash.
4. **Offline-capable.** All translations ship inside the cached config, so changing `locale` needs no refetch.
5. **Localize copy only.** Prices, currencies, free trials, and billing periods stay authoritative from the billing provider. Do not put checkout terms in translation strings.

### When a language needs a different layout

For scripts that need a genuinely different layout (for example right-to-left languages), don't tokenize a shared document — serve a per-locale document instead. Send `locale` as a trait (via `userTraits` or `setTraits`) and return a different `spec.document` from config. This reuses the same server-side trait routing described in [Routing by category](#routing-by-category-dynamic-traits) and needs no extra client code.

## Versioning And Releases

The SDK follows semantic versioning for published npm packages:

1. Patch releases fix bugs, security hardening, and documentation without changing public APIs.
2. Minor releases add backwards-compatible APIs, renderer capabilities, or optional spec fields.
3. Major releases are reserved for breaking public API changes, unsupported bridge version removals, or migration-required behavior changes.

Every published release should update `CHANGELOG.md` with customer-visible changes, migration notes for breaking changes, and any security or fallback behavior changes. Because Tranzmit sits in revenue-critical flows, customer apps should pin a tested version and upgrade through their normal purchase-flow QA checklist.

### NPM distribution

The customer-facing npm package is published as `@tranzmit/react-native`. It depends on `@tranzmit/shared`, which is an internal workspace package that must also be published and publicly visible for customer installs to resolve.

Verify the currently published versions:

```bash
npm view @tranzmit/react-native version
npm view @tranzmit/shared version
```

If either command returns `404`, fix npm package access before announcing the release. For a scoped public package, an npm owner can run:

```bash
npm access public @tranzmit/shared
npm access public @tranzmit/react-native
```

### Publishing a release

Publish from the repository root with an npm account that has publish access to the `@tranzmit` scope.

```bash
npm login
npm whoami
```

Before publishing, bump both workspace package versions and keep `packages/react-native/package.json` pointed at the matching `@tranzmit/shared` version. Then validate the workspace:

```bash
npm install --legacy-peer-deps
npm run build
npm test
```

Dry-run both tarballs:

```bash
npm publish --workspace packages/shared --access public --dry-run
npm publish --workspace packages/react-native --access public --dry-run
```

Publish in dependency order:

```bash
npm publish --workspace packages/shared --access public
npm publish --workspace packages/react-native --access public
```

Do not publish `@tranzmit/react-native` before `@tranzmit/shared`; the React Native package depends on the shared package. Do not reuse a version number after npm accepts it. If npm requires two-factor authentication, complete the passkey/security-key prompt or publish with a properly scoped granular access token that is allowed to publish packages.

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
