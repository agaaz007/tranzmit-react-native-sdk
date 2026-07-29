import { describe, expect, it } from "vitest";
import {
  KNOWN_UPI_APPS,
  checkoutAnalyticsAppId,
  resolveDefaultApp,
  sanitizeCheckoutApps,
  sanitizeCheckoutUi,
} from "../src/checkout.js";

describe("sanitizeCheckoutApps", () => {
  it("maps known packageNames to registry ids and display names", () => {
    const apps = sanitizeCheckoutApps([
      { packageName: "net.one97.paytm", name: "Device Paytm Label" },
      { packageName: "com.phonepe.app" },
      { packageName: "com.google.android.apps.nbu.paisa.user", name: "GPay India" },
      { packageName: "in.org.npci.upiapp" },
      { packageName: "in.amazon.mShop.android.shopping" },
      { packageName: "com.dreamplug.androidapp" },
    ]);

    expect(apps).toEqual([
      { id: "paytm", name: "Paytm", packageName: "net.one97.paytm" },
      { id: "phonepe", name: "PhonePe", packageName: "com.phonepe.app" },
      { id: "gpay", name: "Google Pay", packageName: "com.google.android.apps.nbu.paisa.user" },
      { id: "bhim", name: "BHIM", packageName: "in.org.npci.upiapp" },
      { id: "amazonpay", name: "Amazon Pay", packageName: "in.amazon.mShop.android.shopping" },
      { id: "cred", name: "CRED", packageName: "com.dreamplug.androidapp" },
    ]);
  });

  it("keeps unknown apps with a valid packageName and uses it as the id", () => {
    const apps = sanitizeCheckoutApps([{ packageName: "com.example.upi", name: "Example UPI" }]);
    expect(apps).toEqual([{ id: "com.example.upi", name: "Example UPI", packageName: "com.example.upi" }]);
  });

  it("drops unknown apps whose packageName violates the charset or length", () => {
    const apps = sanitizeCheckoutApps([
      { packageName: "com.bad app", name: "Spaced" },
      { packageName: "com.bad<script>", name: "Injected" },
      { packageName: "a".repeat(65), name: "Too Long" },
      { packageName: "", name: "Empty" },
      { packageName: "com.ok.app", name: "Ok" },
    ]);
    expect(apps.map((app) => app.id)).toEqual(["com.ok.app"]);
  });

  it("drops malformed entries without throwing", () => {
    expect(sanitizeCheckoutApps(undefined)).toEqual([]);
    expect(sanitizeCheckoutApps("nope")).toEqual([]);
    expect(sanitizeCheckoutApps([null, 42, "x", { name: "no package" }, { packageName: 7 }])).toEqual([]);
  });

  it("strips control and bidi characters from device-reported names", () => {
    const apps = sanitizeCheckoutApps([
      { packageName: "com.example.one", name: "\u0007My\u202E UPI \u200EApp\u2066\u0000" },
    ]);
    expect(apps[0].name).toBe("My UPI App");
  });

  it("collapses whitespace, trims, and caps names at 48 chars", () => {
    const apps = sanitizeCheckoutApps([
      { packageName: "com.example.two", name: "  Pay \t\n  Fast  " },
      { packageName: "com.example.three", name: "x".repeat(80) },
    ]);
    expect(apps[0].name).toBe("Pay Fast");
    expect(apps[1].name).toBe("x".repeat(48));
  });

  it("drops apps whose name becomes empty after sanitizing", () => {
    const apps = sanitizeCheckoutApps([
      { packageName: "com.example.blank", name: " \u202A\u202B \u0000 " },
      { packageName: "com.example.noname" },
    ]);
    expect(apps).toEqual([]);
  });

  it("drops unknown apps spoofing a registry display name", () => {
    const apps = sanitizeCheckoutApps([
      { packageName: "com.evil.gpay", name: "Google Pay" },
      { packageName: "com.evil.gpay2", name: "  g o o g l e p a y  " },
      { packageName: "com.evil.paytm", name: "PAYTM" },
      { packageName: "com.evil.cred", name: "Cred" },
      { packageName: "com.honest.app", name: "Honest Pay" },
    ]);
    expect(apps.map((app) => app.id)).toEqual(["com.honest.app"]);
  });

  it("strips invisible format characters so they cannot bypass the anti-spoof drop", () => {
    const apps = sanitizeCheckoutApps([
      { packageName: "com.evil.zwsp", name: "Google​Pay" }, // zero-width space
      { packageName: "com.evil.zwj", name: "Pay‍tm" }, // zero-width joiner
      { packageName: "com.evil.shy", name: "Cr­ed" }, // soft hyphen
      { packageName: "com.evil.bom", name: "﻿PhonePe⁠" }, // BOM + word joiner
      { packageName: "com.honest.zw", name: "My​Wallet" },
    ]);
    expect(apps.map((app) => app.id)).toEqual(["com.honest.zw"]);
    expect(apps[0].name).toBe("MyWallet");
  });

  it("drops unknown apps whose packageName collides with a registry id", () => {
    const apps = sanitizeCheckoutApps([
      { packageName: "paytm", name: "Evil Wallet" },
      { packageName: "net.one97.paytm" },
    ]);
    expect(apps).toEqual([{ id: "paytm", name: "Paytm", packageName: "net.one97.paytm" }]);
  });

  it("never leaves a lone surrogate when the 48-char cap splits an emoji", () => {
    const apps = sanitizeCheckoutApps([
      { packageName: "com.example.emoji", name: `${"x".repeat(47)}\u{1F4B8}extra` },
    ]);
    expect(apps[0].name).toBe("x".repeat(47));
    expect(apps[0].name.length).toBeLessThanOrEqual(48);
  });

  it("keeps at most 16 entries", () => {
    const input = Array.from({ length: 24 }, (_, i) => ({
      packageName: `com.example.app${i}`,
      name: `App ${i}`,
    }));
    const apps = sanitizeCheckoutApps(input);
    expect(apps).toHaveLength(16);
    expect(apps[15].id).toBe("com.example.app15");
  });

  it("dedups by id with the first entry winning", () => {
    const apps = sanitizeCheckoutApps([
      { packageName: "net.one97.paytm" },
      { packageName: "net.one97.paytm" },
      { packageName: "com.example.dup", name: "First" },
      { packageName: "com.example.dup", name: "Second" },
    ]);
    expect(apps.map((app) => app.id)).toEqual(["paytm", "com.example.dup"]);
    expect(apps[1].name).toBe("First");
  });
});

describe("sanitizeCheckoutUi", () => {
  it("applies defaults for missing or non-object input", () => {
    expect(sanitizeCheckoutUi(undefined)).toEqual({
      enabled: true,
      showToggle: true,
      maxVisibleApps: 5,
      iconStyle: "tile",
      fallbackToPlainCta: true,
    });
    expect(sanitizeCheckoutUi("bogus")).toEqual(sanitizeCheckoutUi(undefined));
  });

  it("preserves explicit booleans and iconStyle", () => {
    const ui = sanitizeCheckoutUi({ enabled: false, showToggle: false, fallbackToPlainCta: false, iconStyle: "circle" });
    expect(ui.enabled).toBe(false);
    expect(ui.showToggle).toBe(false);
    expect(ui.fallbackToPlainCta).toBe(false);
    expect(ui.iconStyle).toBe("circle");
  });

  it("clamps maxVisibleApps to 1..12 and defaults everything else to 5", () => {
    expect(sanitizeCheckoutUi({ maxVisibleApps: 0 }).maxVisibleApps).toBe(5);
    expect(sanitizeCheckoutUi({ maxVisibleApps: -1 }).maxVisibleApps).toBe(5);
    expect(sanitizeCheckoutUi({ maxVisibleApps: NaN }).maxVisibleApps).toBe(5);
    expect(sanitizeCheckoutUi({ maxVisibleApps: 13 }).maxVisibleApps).toBe(12);
    expect(sanitizeCheckoutUi({ maxVisibleApps: "7" }).maxVisibleApps).toBe(5);
    expect(sanitizeCheckoutUi({ maxVisibleApps: 2.5 }).maxVisibleApps).toBe(5);
    expect(sanitizeCheckoutUi({ maxVisibleApps: 1 }).maxVisibleApps).toBe(1);
    expect(sanitizeCheckoutUi({ maxVisibleApps: 7 }).maxVisibleApps).toBe(7);
  });

  it("drops appPriority charset violations and keeps at most 32 ids", () => {
    const ui = sanitizeCheckoutUi({
      appPriority: ["gpay", "bad id", 7, "a".repeat(65), ...Array.from({ length: 40 }, (_, i) => `app${i}`)],
    });
    expect(ui.appPriority).toHaveLength(32);
    expect(ui.appPriority![0]).toBe("gpay");
    expect(ui.appPriority).not.toContain("bad id");
  });

  it("validates defaultApp against the id charset", () => {
    expect(sanitizeCheckoutUi({ defaultApp: "gpay" }).defaultApp).toBe("gpay");
    expect(sanitizeCheckoutUi({ defaultApp: "bad app!" }).defaultApp).toBeUndefined();
    expect(sanitizeCheckoutUi({ defaultApp: 3 }).defaultApp).toBeUndefined();
  });

  it("drops unknown keys", () => {
    const ui = sanitizeCheckoutUi({ enabled: true, surprise: "value" });
    expect("surprise" in ui).toBe(false);
  });
});

describe("resolveDefaultApp", () => {
  const apps = sanitizeCheckoutApps([
    { packageName: "com.phonepe.app" },
    { packageName: "com.google.android.apps.nbu.paisa.user" },
    { packageName: "net.one97.paytm" },
  ]);

  it("prefers defaultApp when it is installed", () => {
    const ui = sanitizeCheckoutUi({ defaultApp: "paytm", appPriority: ["gpay"] });
    expect(resolveDefaultApp(apps, ui)?.id).toBe("paytm");
  });

  it("falls back to the first appPriority match", () => {
    const ui = sanitizeCheckoutUi({ defaultApp: "cred", appPriority: ["bhim", "gpay", "phonepe"] });
    expect(resolveDefaultApp(apps, ui)?.id).toBe("gpay");
  });

  it("falls back to the first detected app", () => {
    const ui = sanitizeCheckoutUi({ defaultApp: "cred", appPriority: ["bhim"] });
    expect(resolveDefaultApp(apps, ui)?.id).toBe("phonepe");
  });

  it("returns undefined when no apps are detected", () => {
    expect(resolveDefaultApp([], sanitizeCheckoutUi(undefined))).toBeUndefined();
  });
});

describe("checkoutAnalyticsAppId", () => {
  it("passes registry ids through and normalizes everything else to other", () => {
    for (const { id } of Object.values(KNOWN_UPI_APPS)) {
      expect(checkoutAnalyticsAppId(id)).toBe(id);
    }
    expect(checkoutAnalyticsAppId("com.example.upi")).toBe("other");
    expect(checkoutAnalyticsAppId("")).toBe("other");
  });
});
