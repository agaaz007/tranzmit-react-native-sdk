# tranzmit-react-native-sdk

Standalone React Native SDK for Tranzmit server-driven WebView paywalls.

The Git repository is named `tranzmit-react-native-sdk`. The npm package customers import is `@tranzmit/react-native`.

Tranzmit fetches remote placement config, renders hosted paywall documents in a native WebView, assigns users through server-side experiments, and sends impression / CTA / dismissal / conversion events back to Tranzmit.

## What Customers Need

To integrate Tranzmit, a customer app needs:

- The `@tranzmit/react-native` package.
- A Tranzmit public key from the dashboard, for example `pk_live_...` or `pk_test_...`.
- A placement trigger configured in the dashboard, usually `upgrade_pro`.
- A Billing Product ID configured on each paywall variant in the Tranzmit dashboard.
- A stable app user id when the user is logged in.
- A native purchase implementation in the host app: StoreKit, Google Play Billing, RevenueCat, Stripe, or another billing provider.

Tranzmit does **not** process purchases. The SDK shows the paywall and tells your app which product the customer tapped. Your app owns billing, entitlements, refunds, and restore purchases.

## Install

Install the React Native SDK package and its peer dependencies:

```bash
npm install @tranzmit/react-native
npm install @react-native-async-storage/async-storage react-native-webview react-native-safe-area-context
```

For local development against this repository, use workspace or file dependencies from the `example/` app. npm git installs do not install packages from workspace subdirectories directly; publish `packages/react-native` and `packages/shared` or use local file paths while developing.

## Basic Integration

Wrap your app with `TranzmitProvider`:

```tsx
import { TranzmitProvider } from "@tranzmit/react-native";

export default function App() {
  return (
    <TranzmitProvider
      publicKey="pk_live_REPLACE_WITH_CUSTOMER_PUBLIC_KEY"
      userId={currentUser?.id}
      onError={(error) => console.warn("[Tranzmit]", error)}
    >
      <RootNavigator />
    </TranzmitProvider>
  );
}
```

If the user is logged out, omit `userId`. The SDK generates a stable anonymous ID. Do not invent fake user IDs.

## Present A Placement

Call `gate()` exactly where your app wants to show the paywall. The SDK never shows a paywall automatically.

```tsx
import { useTranzmit } from "@tranzmit/react-native";

function UpgradeButton() {
  const { gate, reportConversion } = useTranzmit();

  return (
    <Button
      title="Upgrade"
      onPress={() => {
        const result = gate("upgrade_pro", {
          onCTA: async (product) => {
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
          },
          onFallback: (event) => {
            openExistingInAppPaywall({
              trigger: event.trigger,
              reason: event.reason,
            });
          },
        });

        if (!result.shown) {
          console.log("Tranzmit placement was not shown; fallback handled it.");
        }
      }}
    />
  );
}
```

## Fallback Contract

Always provide `onFallback` in production. It is the safety net that keeps monetization working if a remote paywall cannot be shown.

Fallback reasons:

- `not_ready`: SDK config has not loaded yet.
- `placement_not_found`: the trigger is missing, disabled, or not assigned.
- `render_error`: the hosted WebView document failed to render.

A good fallback opens the app's existing native/in-app paywall or pricing screen.

## Billing Product IDs

In the Tranzmit dashboard, set the Billing Product ID on every paywall variant. This becomes `product.id` in `onCTA(product)`.

Examples:

- StoreKit: `com.customer.app.pro.yearly`
- Google Play Billing: `pro_yearly`
- RevenueCat: the product/package ID passed into RevenueCat purchase APIs

Do not hardcode a different product ID in the app. Fix the dashboard value instead.

## Presentation Modes

Tranzmit supports `sheet`, `modal`, `fullscreen`, and `inline` presentation modes. If app code passes `presentation` to `gate()`, that local value wins. Otherwise, the SDK uses the server-provided presentation mode and falls back to `sheet`.

```tsx
gate("upgrade_pro", { presentation: "fullscreen", onCTA, onFallback });
```

## Declarative Paywall

For custom screens and previews, use `TranzmitPaywall` directly:

```tsx
<TranzmitPaywall
  trigger="upgrade_pro"
  visible={visible}
  presentation="inline"
  onCTA={purchaseProduct}
  onDismiss={() => setVisible(false)}
/>
```

Most production apps should use `gate()` because it handles presentation, tracking, and fallback in one flow.

## Local Development

```bash
npm install
npm run build
npm test
```

Run the Expo harness:

```bash
cd example
npm install
EXPO_PUBLIC_TRANZMIT_TRIGGER=missing_trigger npm run start
```

Tap **Present**. For `missing_trigger`, the example should open the fallback dialog with reason `placement_not_found`.

## Repository Layout

```text
tranzmit-react-native-sdk/
├── packages/
│   ├── shared/          # HTTP client, identity, config, event batching, shared types
│   └── react-native/    # React Native provider, hook, WebView paywall presentation
└── example/             # Expo harness for local QA
```

`tranzmit-mobile-webview` remains the server and admin/dashboard codebase. This repository is the customer-facing React Native SDK.
