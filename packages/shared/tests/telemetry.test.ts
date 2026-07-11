import { describe, expect, it } from "vitest";
import {
  DurableTelemetryQueue,
  deterministicReplaySample,
  exposureContextFromPlacement,
  parseSemanticBridgeMessage,
  sanitizeTelemetryProperties,
  type IdentityStorage,
} from "../src/index.js";

function memoryStorage(seed?: Map<string, string>): IdentityStorage {
  const values = seed ?? new Map<string, string>();
  return {
    get: async (key) => values.get(key) ?? null,
    set: async (key, value) => {
      values.set(key, value);
    },
  };
}

describe("DurableTelemetryQueue", () => {
  it("restores an unacknowledged batch with the same event and batch UUIDs", async () => {
    const values = new Map<string, string>();
    const first = new DurableTelemetryQueue("pk_test", memoryStorage(values), () => "11111111-1111-4111-8111-111111111111");
    await first.load();
    await first.enqueue({ event: "paywall_rendered", timestamp: 10, properties: {} });

    const original = await first.beginBatch();
    const reloaded = new DurableTelemetryQueue("pk_test", memoryStorage(values), () => "22222222-2222-4222-8222-222222222222");
    await reloaded.load();
    const retry = await reloaded.beginBatch();

    expect(retry?.batchId).toBe(original?.batchId);
    expect(retry?.events[0]?.eventId).toBe(original?.events[0]?.eventId);
  });

  it("deduplicates caller-provided event UUIDs and removes only acknowledged events", async () => {
    const queue = new DurableTelemetryQueue("pk_test", memoryStorage(), () => "33333333-3333-4333-8333-333333333333");
    await queue.load();
    await queue.enqueue({ eventId: "44444444-4444-4444-8444-444444444444", event: "cta_click", timestamp: 10, properties: {} });
    await queue.enqueue({ eventId: "44444444-4444-4444-8444-444444444444", event: "cta_click", timestamp: 11, properties: {} });

    const batch = await queue.beginBatch();
    expect(batch?.events).toHaveLength(1);
    await queue.acknowledge(batch?.batchId ?? "");
    expect(await queue.beginBatch()).toBeNull();
  });

  it("rejects malformed event identifiers at the persistence boundary", async () => {
    const queue = new DurableTelemetryQueue("pk_test", memoryStorage());
    await queue.load();
    await expect(queue.enqueue({ eventId: "not-a-uuid", event: "cta_click", timestamp: 10, properties: {} }))
      .rejects.toThrow("eventId must be a UUID");
  });
});

describe("exact exposure telemetry", () => {
  const placement = {
    trigger: "upgrade_pro",
    enabled: true,
    variantId: "variant-a",
    variantKey: "annual",
    paywallId: "paywall-1",
    creativeId: "creative-1",
    decisionId: "decision-1",
    snapshotId: "snapshot-1",
    experimentId: "experiment-1",
    experimentSnapshotId: "experiment-snapshot-1",
    decisionToken: "signed-token",
    spec: { cta: "Buy", products: [] },
  };

  it("freezes every server identifier behind a client-generated exposure UUID", () => {
    expect(exposureContextFromPlacement(placement, "session-1", () => "exposure-1")).toEqual({
      exposureId: "exposure-1",
      sessionId: "session-1",
      trigger: "upgrade_pro",
      paywallId: "paywall-1",
      variantId: "variant-a",
      variantKey: "annual",
      creativeId: "creative-1",
      decisionId: "decision-1",
      snapshotId: "snapshot-1",
      experimentId: "experiment-1",
      experimentSnapshotId: "experiment-snapshot-1",
      decisionToken: "signed-token",
    });
  });

  it("accepts semantic bridge events only when the nonce and exposure match", () => {
    const expected = { bridgeNonce: "nonce-1", exposureId: "exposure-1" };
    const valid = parseSemanticBridgeMessage(JSON.stringify({
      type: "telemetry",
      event: "scroll_depth",
      bridge_nonce: "nonce-1",
      exposure_id: "exposure-1",
      properties: { depth_percent: 75 },
    }), expected);
    const spoofed = parseSemanticBridgeMessage(JSON.stringify({
      type: "telemetry",
      event: "cta_click",
      bridge_nonce: "wrong",
      exposure_id: "exposure-1",
      properties: { dom_html: "<main>secret</main>" },
    }), expected);

    expect(valid).toEqual({ event: "scroll_depth", properties: { depth_percent: 75 } });
    expect(spoofed).toBeNull();
  });

  it("rejects raw DOM and invalid semantic values", () => {
    const expected = { bridgeNonce: "nonce-1", exposureId: "exposure-1" };
    expect(parseSemanticBridgeMessage(JSON.stringify({
      type: "telemetry",
      event: "price_visible",
      bridge_nonce: "nonce-1",
      exposure_id: "exposure-1",
      properties: { visible_percent: 101, text: "Rs 999" },
    }), expected)).toBeNull();
    expect(parseSemanticBridgeMessage(JSON.stringify({
      type: "telemetry",
      event: "rage_click",
      bridge_nonce: "nonce-1",
      exposure_id: "exposure-1",
      properties: { click_count: 4, selector: "#phone-number" },
    }), expected)).toBeNull();
  });

  it("samples replay deterministically without exposing identity material", () => {
    expect(deterministicReplaySample("exposure-a", 10)).toBe(
      deterministicReplaySample("exposure-a", 10)
    );
    expect(deterministicReplaySample("exposure-a", 0)).toBe(false);
    expect(deterministicReplaySample("exposure-a", 100)).toBe(true);
  });

  it("removes raw DOM and direct-identity properties at the telemetry boundary", () => {
    expect(sanitizeTelemetryProperties({
      product_id: "annual",
      depth_percent: 75,
      dom_html: "<main>secret</main>",
      phone_number: "+91 99999",
      nested: { email: "person@example.test" },
    })).toEqual({ product_id: "annual", depth_percent: 75 });
  });
});
