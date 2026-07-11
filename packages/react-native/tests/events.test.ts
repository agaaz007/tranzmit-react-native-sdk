import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTranzmitClient, type PlatformAdapter } from "@tranzmit/shared";
import { mockConfig } from "./fixtures.js";

function memoryAdapter(): PlatformAdapter {
  const storage = new Map<string, string>();
  const backgroundCallbacks = new Set<() => void>();

  return {
    storage: {
      get: async (key) => storage.get(key) || null,
      set: async (key, value) => {
        storage.set(key, value);
      },
      remove: async (key) => {
        storage.delete(key);
      },
    },
    lifecycle: {
      onBackground(cb) {
        backgroundCallbacks.add(cb);
        return () => backgroundCallbacks.delete(cb);
      },
      onForeground() {
        return () => {};
      },
    },
  };
}

describe("shared RN event batching", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockConfig),
      })
    );
  });

  it("flushes when the queue reaches ten events", async () => {
    const client = createTranzmitClient(memoryAdapter(), {
      platform: "react-native",
      os: "ios",
      sdkVersion: "1.0.0",
    });

    await client.init({ publicKey: "pk_test_demo" });
    vi.mocked(fetch).mockClear();

    for (let i = 0; i < 10; i++) {
      client.track("feature_clicked", { i });
    }

    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    expect(body.events).toHaveLength(10);
    expect(body.events[0].properties.platform).toBe("react-native");
    expect(body.events[0].properties.os).toBe("ios");
  });

  it("flushes conversions immediately", async () => {
    const client = createTranzmitClient(memoryAdapter(), { platform: "react-native" });
    await client.init({ publicKey: "pk_test_demo" });
    vi.mocked(fetch).mockClear();

    client.reportConversion({ productId: "pro_monthly", revenue: 9.99, currency: "USD" });

    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    const conversion = body.events.find((event: any) => event.event === "conversion");
    expect(conversion).toBeTruthy();
    expect(conversion.properties.productId).toBe("pro_monthly");
  });

  it("retries an idempotent durable batch without leaking traits", async () => {
    const client = createTranzmitClient(memoryAdapter(), { platform: "react-native" });
    await client.init({
      publicKey: "pk_test_demo",
      apiBaseUrl: "https://preview.example.test",
      userTraits: { category: "love" },
      privateTraits: { email: "person@example.test" },
    });
    vi.mocked(fetch).mockReset();
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ ok: true, status: 202 } as Response);

    client.track("scroll_depth", { depth_percent: 75, dom_html: "<main>private</main>" });
    await client.flush();
    await client.flush();

    const first = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    const retry = JSON.parse(String(vi.mocked(fetch).mock.calls[1]?.[1]?.body));
    expect(first.batch_id).toBeTypeOf("string");
    expect(first.events[0].event_id).toBeTypeOf("string");
    expect(retry.batch_id).toBe(first.batch_id);
    expect(retry.events[0].event_id).toBe(first.events[0].event_id);
    expect(retry.events[0].properties).not.toHaveProperty("dom_html");
    expect(first).not.toHaveProperty("traits");
    expect(first).not.toHaveProperty("privateTraits");
  });

  it("propagates checkout outcome against the original exposure", async () => {
    const client = createTranzmitClient(memoryAdapter(), { platform: "react-native" });
    await client.init({ publicKey: "pk_test_demo" });
    vi.mocked(fetch).mockClear();

    client.reportExposureOutcome({
      exposure: {
        exposureId: "exposure-1",
        sessionId: "session-1",
        trigger: "upgrade_pro",
        variantId: "var_a",
        variantKey: "annual",
        paywallId: "paywall_1",
        decisionId: "decision_1",
      },
      outcome: {
        status: "purchase_client_confirmed",
        productId: "pro_monthly",
        transactionId: "transaction-1",
      },
    });

    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    const outcome = body.events.find((event: { event: string }) => event.event === "checkout_outcome");
    expect(outcome).toMatchObject({
      event: "checkout_outcome",
      properties: {
        exposure_id: "exposure-1",
        decision_id: "decision_1",
        outcome_status: "purchase_client_confirmed",
        product_id: "pro_monthly",
        transaction_id: "transaction-1",
      },
    });
  });
});
