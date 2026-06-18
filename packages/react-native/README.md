# @tranzmit/react-native

React Native SDK for [Tranzmit](https://github.com/agaaz007/tranzmit-react-native-sdk) server-driven WebView paywalls. Fetch remote placement config, render hosted paywall documents, run server-side experiments, and send impression / CTA / conversion analytics — without shipping a new app build for every paywall change.

> Tranzmit owns paywall presentation, experimentation, and analytics. Your app owns billing and entitlements. Tranzmit does **not** process purchases.

## Install

```bash
npm install @tranzmit/react-native
npm install @react-native-async-storage/async-storage react-native-webview react-native-safe-area-context
```

Expo (non–Expo Go): rebuild the dev client after adding the native modules (`npx expo prebuild` or an EAS dev build).

## Quick start

```tsx
import { useEffect } from "react";
import { TranzmitProvider, useTranzmit } from "@tranzmit/react-native";

export default function App() {
  return (
    <TranzmitProvider publicKey="pk_live_YOUR_KEY" userId={currentUser?.id}>
      <RootNavigator />
    </TranzmitProvider>
  );
}

function UpgradeButton() {
  const { isReady, gate, preloadPlacement, reportConversion } = useTranzmit();

  useEffect(() => {
    if (!isReady) return;
    void preloadPlacement("upgrade_pro");
  }, [isReady, preloadPlacement]);

  return (
    <Button
      title="Upgrade"
      onPress={() => {
        const result = gate("upgrade_pro", {
          onCTA: async (product) => {
            const ok = await purchaseProduct(product.id); // your billing
            if (!ok) return;
            reportConversion({
              trigger: "upgrade_pro",
              variantId: result.variantId,
              productId: product.id,
              revenue: 999,
              currency: "INR",
            });
          },
          onFallback: () => openExistingInAppPaywall(),
        });
      }}
    />
  );
}
```

## Documentation

Full integration guide, billing rules, category routing, localization, security model, and API reference:

https://github.com/agaaz007/tranzmit-react-native-sdk#readme

## License

UNLICENSED — proprietary. See [LICENSE](./LICENSE).
