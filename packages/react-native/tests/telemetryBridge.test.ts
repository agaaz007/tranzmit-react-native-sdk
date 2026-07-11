import { describe, expect, it } from "vitest";
import { buildSemanticTelemetryScript } from "../src/renderer/telemetryBridge.js";

describe("semantic WebView telemetry injection", () => {
  it("binds the script to the exposure and nonce without serializing raw DOM", () => {
    const script = buildSemanticTelemetryScript({
      exposureId: "exposure-1",
      bridgeNonce: "nonce-1",
    });

    expect(script).toContain('"exposure_id":"exposure-1"');
    expect(script).toContain('"bridge_nonce":"nonce-1"');
    expect(script).toContain("scroll_depth");
    expect(script).toContain("plan_toggle");
    expect(script).toContain("price_visible");
    expect(script).toContain("rage_click");
    expect(script).toContain("render_confirmed");
    expect(script).not.toContain("outerHTML");
    expect(script).not.toContain("innerHTML");
  });
});
