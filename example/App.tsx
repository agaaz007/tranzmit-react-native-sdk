import { useState } from "react";
import {
  Alert,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { TranzmitProvider, TranzmitPaywall, useTranzmit, type FallbackEvent } from "@tranzmit/react-native";

const API_BASE_URL = process.env.EXPO_PUBLIC_TRANZMIT_API_BASE_URL;
const PUBLIC_KEY = process.env.EXPO_PUBLIC_TRANZMIT_PUBLIC_KEY || "pk_test_320da03ab659ffc56d58acd2";
const TRIGGER = process.env.EXPO_PUBLIC_TRANZMIT_TRIGGER || "upgrade_pro";
const DEFAULT_USER_ID = process.env.EXPO_PUBLIC_TRANZMIT_USER_ID || "react-native-sdk-harness";

const INTENTS: Array<{ label: string; value: string }> = [
  { label: "Marriage", value: "marriage" },
  { label: "Love & Relationship", value: "love_and_relationship" },
  { label: "Career & Education", value: "career_education" },
  { label: "General", value: "general" },
];

function DemoControls({ activeUserId }: { activeUserId?: string }) {
  const { gate, getPlacement, isReady, refreshConfig, reportConversion, setTraits, track, user } = useTranzmit();
  const [showInline, setShowInline] = useState(false);
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const [activeIntent, setActiveIntent] = useState<string | null>(null);
  const [routing, setRouting] = useState(false);
  const placement = getPlacement(TRIGGER);

  const chooseIntent = async (intent: string) => {
    setRouting(true);
    try {
      await setTraits({ intent });
      setActiveIntent(intent);
      record(`Intent set: ${intent} (config refetched)`);
    } catch (error) {
      record(`Intent routing failed: ${String(error)}`);
    } finally {
      setRouting(false);
    }
  };

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
      presentation: "fullscreen",
      onCTA: async (product) => {
        record(`CTA tapped: ${product.id}`);
        track("expo_demo_cta", { productId: product.id });
        reportConversion({
          trigger: TRIGGER,
          variantId: result.variantId,
          productId: product.id,
          ...priceForConversion(product.price),
        });
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
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>SDK status</Text>
          <StatusRow label="Ready" value={isReady ? "yes" : "loading"} />
          <StatusRow label="API" value={API_BASE_URL || "default"} />
          <StatusRow label="Public key" value={PUBLIC_KEY} />
          <StatusRow label="Trigger" value={TRIGGER} />
          <StatusRow label="User ID" value={activeUserId || "(none — stableID only)"} />
          <StatusRow label="Resolved ID" value={user?.id || "-"} />
          <StatusRow label="Stable ID" value={user?.stableID || "-"} />
          {lastEvent ? <StatusRow label="Last event" value={lastEvent} /> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.eyebrow}>Intent (routing)</Text>
          <Text style={styles.note}>
            Pick an intent to set the routing trait and refetch the routed paywall. Then tap Present.
          </Text>
          <View style={styles.intentGrid}>
            {INTENTS.map((item) => {
              const selected = activeIntent === item.value;
              return (
                <Text
                  key={item.value}
                  onPress={routing || !isReady ? undefined : () => void chooseIntent(item.value)}
                  style={[styles.intentChip, selected && styles.intentChipActive, (routing || !isReady) && styles.intentChipDisabled]}
                >
                  {item.label}
                </Text>
              );
            })}
          </View>
          <StatusRow label="Active intent" value={activeIntent || "(none — default paywall)"} />
          {routing ? <StatusRow label="Status" value="Routing…" /> : null}
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
    </View>
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
  const [userIdDraft, setUserIdDraft] = useState(DEFAULT_USER_ID);
  const [activeUserId, setActiveUserId] = useState<string | undefined>(DEFAULT_USER_ID || undefined);

  const applyUserId = () => {
    const next = userIdDraft.trim();
    setActiveUserId(next || undefined);
  };

  const clearUserId = () => {
    setUserIdDraft("");
    setActiveUserId(undefined);
  };

  return (
    <SafeAreaProvider>
      <TranzmitProvider
        key={activeUserId ?? "__anonymous__"}
        publicKey={PUBLIC_KEY}
        apiBaseUrl={API_BASE_URL}
        userId={activeUserId}
        onError={(error) => console.warn("[Tranzmit]", error)}
      >
        <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
          <View style={styles.userBar}>
            <Text style={styles.userBarLabel}>Custom user ID</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="e.g. user_12345"
              style={styles.userInput}
              value={userIdDraft}
              onChangeText={setUserIdDraft}
              onSubmitEditing={applyUserId}
              returnKeyType="done"
            />
            <View style={styles.userActions}>
              <View style={styles.userActionButton}>
                <Button title="Apply" onPress={applyUserId} />
              </View>
              <View style={styles.userActionButton}>
                <Button title="Clear (logged out)" onPress={clearUserId} />
              </View>
            </View>
            <Text style={styles.userHint}>
              Active: {activeUserId || "(none — SDK uses stableID)"}. Applying re-inits Tranzmit with the new identity.
            </Text>
          </View>
          <DemoControls activeUserId={activeUserId} />
        </SafeAreaView>
      </TranzmitProvider>
    </SafeAreaProvider>
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
  userBar: {
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: "#fff",
    borderBottomColor: "#e5e7eb",
    borderBottomWidth: 1,
  },
  userBarLabel: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "700",
  },
  userInput: {
    borderColor: "#d1d5db",
    borderRadius: 10,
    borderWidth: 1,
    color: "#111827",
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  userActions: {
    flexDirection: "row",
    gap: 12,
  },
  userActionButton: {
    flex: 1,
  },
  userHint: {
    color: "#6b7280",
    fontSize: 12,
    lineHeight: 18,
  },
  intentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  intentChip: {
    overflow: "hidden",
    borderColor: "#d1d5db",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: "#374151",
    fontSize: 13,
    fontWeight: "600",
    backgroundColor: "#fff",
  },
  intentChipActive: {
    borderColor: "#e9650c",
    backgroundColor: "#fdebd9",
    color: "#b8470a",
  },
  intentChipDisabled: {
    opacity: 0.5,
  },
});
