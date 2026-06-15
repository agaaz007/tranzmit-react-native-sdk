import { describe, expect, it } from "vitest";
import { sha256Integrity, verifyDocumentIntegrity } from "@tranzmit/shared";

describe("paywall integrity", () => {
  it("verifies SHA-256 integrity using the standard base64 digest", () => {
    const integrity = "sha256-LPJNul+wow4m6DsqxbninhsWHlwfp0JecwQzYpOLmCQ=";

    expect(sha256Integrity("hello")).toBe(integrity);
    expect(verifyDocumentIntegrity({ html: "hello", integrity }, "hello")).toEqual({ ok: true });
    expect(verifyDocumentIntegrity({ html: "hello", integrity }, "HELLO")).toEqual({
      ok: false,
      failure: {
        code: "integrity_mismatch",
        message: "Paywall document integrity validation failed",
      },
    });
  });
});
