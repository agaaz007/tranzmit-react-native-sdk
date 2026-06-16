import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { sha256Integrity } from "@tranzmit/shared";
import { TranzmitProvider, TranzmitPaywall, useTranzmit } from "../src/index.js";
import { baseSpec, mockConfig } from "./fixtures.js";

const localizedSpec = {
  ...baseSpec,
  document: { html: "<main><h1>{{headline}}</h1></main>" },
  localization: {
    defaultLocale: "en",
    translations: {
      en: { headline: "Unlock Pro" },
      es: { headline: "Desbloquea Pro" },
    },
  },
};

const localizedConfig = {
  ...mockConfig,
  placements: {
    upgrade_pro: {
      ...mockConfig.placements.upgrade_pro!,
      spec: localizedSpec,
    },
  },
};

function GateHarness({ onCTA, onDismiss }: { onCTA?: any; onDismiss?: any }) {
  const { isReady, gate } = useTranzmit();

  useEffect(() => {
    if (isReady) {
      gate("upgrade_pro", {
        presentation: "modal",
        onCTA,
        onDismiss,
      });
    }
  }, [gate, isReady, onCTA, onDismiss]);

  return <div>{isReady ? "ready" : "loading"}</div>;
}

function ImmediateFallbackHarness({ onFallback }: { onFallback?: any }) {
  const { gate } = useTranzmit();

  useEffect(() => {
    gate("upgrade_pro", { onFallback });
  }, [gate, onFallback]);

  return null;
}

function MissingPlacementHarness({ onFallback }: { onFallback?: any }) {
  const { isReady, gate } = useTranzmit();

  useEffect(() => {
    if (isReady) {
      gate("missing_trigger", { onFallback });
    }
  }, [gate, isReady, onFallback]);

  return null;
}

function CategoryHarness() {
  const { isReady, setTraits, gate } = useTranzmit();

  useEffect(() => {
    if (!isReady) return;
    let cancelled = false;
    void (async () => {
      await setTraits({ category: "love" });
      if (!cancelled) gate("upgrade_pro", { presentation: "inline" });
    })();
    return () => {
      cancelled = true;
    };
  }, [gate, isReady, setTraits]);

  return <div>{isReady ? "ready" : "loading"}</div>;
}

const baselineRoute = {
  ...mockConfig,
  placements: {
    upgrade_pro: {
      ...mockConfig.placements.upgrade_pro!,
      spec: { ...baseSpec, document: { html: "<main><h1>Baseline Paywall</h1></main>" } },
    },
  },
};

const loveRoute = {
  ...mockConfig,
  placements: {
    upgrade_pro: {
      ...mockConfig.placements.upgrade_pro!,
      variantId: "love_arm",
      spec: {
        ...baseSpec,
        document: { html: "<main><h1>Love Arm Paywall</h1></main>" },
      },
    },
  },
};

describe("TranzmitProvider", () => {
  beforeEach(() => {
    (AsyncStorage as any).clear();
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockConfig),
      })
    );
  });

  it("fetches config and exposes ready state", async () => {
    const { getByText } = render(
      <TranzmitProvider publicKey="pk_test_demo">
        <GateHarness />
      </TranzmitProvider>
    );

    await waitFor(() => expect(getByText("ready")).toBeTruthy());
    expect(fetch).toHaveBeenCalledWith(
      "https://api-production-2146.up.railway.app/v1/config",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("renders a paywall from gate and invokes CTA callback", async () => {
    const onCTA = vi.fn();
    const { getByText } = render(
      <TranzmitProvider publicKey="pk_test_demo">
        <GateHarness onCTA={onCTA} />
      </TranzmitProvider>
    );

    await waitFor(() => expect(getByText("Unlock Pro")).toBeTruthy());
    fireEvent.click(getByText("Start Free Trial").closest("button")!);

    expect(onCTA).toHaveBeenCalledWith(expect.objectContaining({ id: "pro_monthly" }));
  });

  it("localizes a gated paywall using the provider locale", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(localizedConfig),
      })
    );

    const { getByText } = render(
      <TranzmitProvider publicKey="pk_test_demo" locale="es">
        <GateHarness />
      </TranzmitProvider>
    );

    await waitFor(() => expect(getByText("Desbloquea Pro")).toBeTruthy());
  });

  it("localizes a declarative TranzmitPaywall using the provider locale", async () => {
    const { getByText } = render(
      <TranzmitProvider publicKey="pk_test_demo" locale="es">
        <TranzmitPaywall spec={localizedSpec as any} visible presentation="inline" />
      </TranzmitProvider>
    );

    await waitFor(() => expect(getByText("Desbloquea Pro")).toBeTruthy());
  });

  it("re-routes config via setTraits and presents the warmed paywall on gate", async () => {
    const seenTraits: any[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: any) => {
        if (String(url).endsWith("/v1/config")) {
          const body = init?.body ? JSON.parse(init.body) : {};
          seenTraits.push(body.traits);
          const routed = body?.traits?.category === "love" ? loveRoute : baselineRoute;
          return { ok: true, json: () => Promise.resolve(routed) } as any;
        }
        return { ok: true, json: () => Promise.resolve({}) } as any;
      })
    );

    const { getByText } = render(
      <TranzmitProvider publicKey="pk_test_demo">
        <CategoryHarness />
      </TranzmitProvider>
    );

    await waitFor(() => expect(getByText("Love Arm Paywall")).toBeTruthy());
    expect(seenTraits.some((traits) => traits?.category === "love")).toBe(true);
    expect(getByText("ready")).toBeTruthy();
  });

  it("calls fallback when gate is requested before Tranzmit is ready", async () => {
    const onFallback = vi.fn();
    render(
      <TranzmitProvider publicKey="pk_test_demo">
        <ImmediateFallbackHarness onFallback={onFallback} />
      </TranzmitProvider>
    );

    await waitFor(() => expect(onFallback).toHaveBeenCalledWith({
      trigger: "upgrade_pro",
      reason: "not_ready",
    }));
  });

  it("calls fallback when a placement is missing", async () => {
    const onFallback = vi.fn();
    render(
      <TranzmitProvider publicKey="pk_test_demo">
        <MissingPlacementHarness onFallback={onFallback} />
      </TranzmitProvider>
    );

    await waitFor(() => expect(onFallback).toHaveBeenCalledWith({
      trigger: "missing_trigger",
      reason: "placement_not_found",
    }));
  });

  it("tracks dismissals from the rendered paywall", async () => {
    const onDismiss = vi.fn();
    const { getByText } = render(
      <TranzmitProvider publicKey="pk_test_demo">
        <GateHarness onDismiss={onDismiss} />
      </TranzmitProvider>
    );

    await waitFor(() => expect(getByText("Unlock Pro")).toBeTruthy());
    fireEvent.click(getByText("Maybe later").closest("button")!);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("re-inits when userId changes from anonymous to logged-in", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockConfig),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { rerender, getByText } = render(
      <TranzmitProvider publicKey="pk_test_demo">
        <GateHarness />
      </TranzmitProvider>
    );

    await waitFor(() => expect(getByText("ready")).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(1);

    rerender(
      <TranzmitProvider publicKey="pk_test_demo" userId="user_123">
        <GateHarness />
      </TranzmitProvider>
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(getByText("ready")).toBeTruthy());
    const configBody = JSON.parse(fetchMock.mock.calls[1][1]!.body as string);
    expect(configBody.identity.userId).toBe("user_123");
  });

  it("hydrates hosted WebView documents before rendering", async () => {
    const hostedHtml = "<main><h1>Hosted Upgrade</h1><button data-tranzmit-action=\"cta\" data-product-id=\"pro_monthly\">Buy Hosted</button></main>";
    const hostedConfig = {
      ...mockConfig,
      placements: {
        upgrade_pro: {
          ...mockConfig.placements.upgrade_pro,
          spec: {
            ...mockConfig.placements.upgrade_pro.spec,
            cacheKey: "hosted:test-1",
            document: {
              url: "https://example.test/v1/paywall-documents/pl_1/var_a/hosted%3Atest-1.json?key=pk_test_demo",
              integrity: sha256Integrity(hostedHtml),
            },
          },
        },
      },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/v1/paywall-documents/")) {
          return {
            ok: true,
            headers: { get: () => "application/json" },
            text: () => Promise.resolve(JSON.stringify({
              html: hostedHtml,
              css: "body{font-family:sans-serif}",
            })),
          };
        }
        return {
          ok: true,
          json: () => Promise.resolve(hostedConfig),
        };
      })
    );

    const onCTA = vi.fn();
    const { getByText } = render(
      <TranzmitProvider publicKey="pk_test_demo" apiBaseUrl="https://example.test">
        <GateHarness onCTA={onCTA} />
      </TranzmitProvider>
    );

    await waitFor(() => expect(getByText("Hosted Upgrade")).toBeTruthy());
    fireEvent.click(getByText("Buy Hosted").closest("button")!);
    expect(onCTA).toHaveBeenCalledWith(expect.objectContaining({ id: "pro_monthly" }));
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/paywall-documents/"),
    );
  });

  it("rejects hosted WebView documents with invalid integrity", async () => {
    const hostedConfig = {
      ...mockConfig,
      placements: {
        upgrade_pro: {
          ...mockConfig.placements.upgrade_pro,
          spec: {
            ...mockConfig.placements.upgrade_pro.spec,
            document: {
              url: "https://example.test/v1/paywall-documents/pl_1/var_a/bad.json?key=pk_test_demo",
              integrity: "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            },
          },
        },
      },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/v1/paywall-documents/")) {
          return {
            ok: true,
            headers: { get: () => "application/json" },
            text: () => Promise.resolve(JSON.stringify({
              html: "<main><h1>Tampered Upgrade</h1></main>",
            })),
          };
        }
        return {
          ok: true,
          json: () => Promise.resolve(hostedConfig),
        };
      })
    );
    const onError = vi.fn();

    render(
      <TranzmitProvider publicKey="pk_test_demo" apiBaseUrl="https://example.test" onError={onError}>
        <GateHarness />
      </TranzmitProvider>
    );

    await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.objectContaining({
      code: "paywall_integrity_failed",
      message: "Paywall document integrity validation failed",
    })));
  });

  it("calls fallback when the WebView renderer fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          ...mockConfig,
          placements: {
            upgrade_pro: {
              ...mockConfig.placements.upgrade_pro,
              spec: {
                ...mockConfig.placements.upgrade_pro.spec,
                document: {
                  html: "<main data-trigger-webview-error><h1>Broken Paywall</h1></main>",
                },
              },
            },
          },
        }),
      })
    );
    const onFallback = vi.fn();
    render(
      <TranzmitProvider publicKey="pk_test_demo">
        <RenderErrorHarness onFallback={onFallback} />
      </TranzmitProvider>
    );

    await waitFor(() => expect(onFallback).toHaveBeenCalledWith(expect.objectContaining({
      trigger: "upgrade_pro",
      reason: "render_error",
      error: expect.any(Error),
      variantId: "var_a",
    })));
  });
});

function RenderErrorHarness({ onFallback }: { onFallback?: any }) {
  const { isReady, gate } = useTranzmit();

  useEffect(() => {
    if (isReady) {
      gate("upgrade_pro", { onFallback });
    }
  }, [gate, isReady, onFallback]);

  return null;
}
