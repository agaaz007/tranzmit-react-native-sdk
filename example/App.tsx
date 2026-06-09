import { useState } from "react";
import { Alert, Button, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { TranzmitProvider, TranzmitPaywall, useTranzmit, type FallbackEvent } from "@tranzmit/react-native";

const API_BASE_URL = process.env.EXPO_PUBLIC_TRANZMIT_API_BASE_URL;
const PUBLIC_KEY = process.env.EXPO_PUBLIC_TRANZMIT_PUBLIC_KEY || "pk_test_2a8a5f07d4b9fcf1cc77e024";
const TRIGGER = process.env.EXPO_PUBLIC_TRANZMIT_TRIGGER || "upgrade_pro";
const USER_ID = process.env.EXPO_PUBLIC_TRANZMIT_USER_ID || "react-native-sdk-harness";

function DemoControls() {
  const { gate, getPlacement, isReady, refreshConfig, reportConversion, track } = useTranzmit();
  const [showInline, setShowInline] = useState(false);
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const placement = getPlacement(TRIGGER);

  const record = (message: string) => {
    setLastEvent(message);
    console.log(`[Tranzmit Example] ${message}`);
  };

  const openFallback = (event: FallbackEvent) => {
    record(`Fallback opened: ${event.reason}`);
    Alert.alert(
      "Existing paywall fallback",
      `A production app should open its original in-app paywall here.\n\nTrigger: ${event.trigger}\nReason: ${event.reason}`,
    );
  };

  const present = () => {
    const result = gate(TRIGGER, {
      presentation: "sheet",
      onCTA: async (product) => {
        record(`CTA tapped: ${product.id}`);
        track("expo_demo_cta", { productId: product.id });
        reportConversion({
          trigger: TRIGGER,
          variantId: result.variantId,
          productId: product.id,
          ...priceForConversion(product.price),
        });
        result.dismiss();
      },
      onDismiss: () => record("Paywall dismissed"),
      onFallback: openFallback,
      onImpression: () => record(`Impression tracked for ${TRIGGER}`),
    });

    if (!result.shown) {
      record("Paywall was not shown; fallback handled it");
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>SDK status</Text>
          <StatusRow label="Ready" value={isReady ? "yes" : "loading"} />
          <StatusRow label="API" value={API_BASE_URL || "default"} />
          <StatusRow label="Public key" value={PUBLIC_KEY} />
          <StatusRow label="Trigger" value={TRIGGER} />
          <StatusRow label="User" value={USER_ID} />
          {lastEvent ? <StatusRow label="Last event" value={lastEvent} /> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.eyebrow}>Remote placement</Text>
          <StatusRow label="Placement" value={placement?.placementId || placement?.placement_id || "not loaded"} />
          <StatusRow label="Variant" value={placement?.variantId || "-"} />
          <StatusRow label="Renderer" value={placement?.spec.renderer || "-"} />
          <StatusRow label="Presentation" value={placement?.spec.presentation?.mode || "sheet"} />
          <StatusRow label="Document URL" value={placement?.spec.document?.url || "-"} />
          <StatusRow label="HTML hydrated" value={placement?.spec.document?.html ? "yes" : "no"} />
        </View>

        <Text style={styles.note}>
          This harness contains no hardcoded paywall UI. Paywall content comes from Tranzmit config and hosted WebView documents.
        </Text>

        <Button title={`Present "${TRIGGER}"`} disabled={!isReady} onPress={present} />
        <Button title="Refresh config from server" disabled={!isReady} onPress={() => void refreshConfig()} />
        <Button
          title={showInline ? "Hide inline paywall" : "Show inline paywall"}
          disabled={!isReady}
          onPress={() => setShowInline((visible) => !visible)}
        />

        <TranzmitPaywall
          trigger={TRIGGER}
          visible={showInline}
          presentation="inline"
          onCTA={(product) => {
            record(`Inline CTA tapped: ${product.id}`);
            setShowInline(false);
          }}
          onDismiss={() => setShowInline(false)}
          onError={(error) => openFallback({ trigger: TRIGGER, reason: "render_error", error })}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function priceForConversion(price: string | { amount: number; currency: string }) {
  return typeof price === "string"
    ? {}
    : { revenue: price.amount, currency: price.currency };
}

export default function App() {
  return (
    <TranzmitProvider
      publicKey={PUBLIC_KEY}
      apiBaseUrl={API_BASE_URL}
      userId={USER_ID}
      onError={(error) => console.warn("[Tranzmit]", error)}
    >
      <DemoControls />
    </TranzmitProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f7f8fa",
  },
  content: {
    gap: 16,
    padding: 20,
  },
  card: {
    gap: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderColor: "#e5e7eb",
    borderWidth: 1,
  },
  eyebrow: {
    color: "#6b7280",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  label: {
    width: 96,
    color: "#9ca3af",
    fontSize: 13,
  },
  value: {
    flex: 1,
    color: "#111827",
    fontSize: 13,
  },
  note: {
    color: "#6b7280",
    lineHeight: 20,
  },
});
