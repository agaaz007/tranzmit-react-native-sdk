import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createTranzmitClient,
  sha256Integrity,
  type PlatformAdapter,
  type TranzmitError,
} from "@tranzmit/shared";
import { mockConfig, baseSpec } from "./fixtures.js";

const PRIMARY = "https://primary.test";
const FALLBACK = "https://fallback.test";
const HOSTED_HTML = "<main><h1>Hosted Upgrade</h1></main>";

function memoryAdapter(): PlatformAdapter {
  const storage = new Map<string, string>();
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
      onBackground: () => () => {},
      onForeground: () => () => {},
    },
  };
}

interface HostBehavior {
  /** Hosts whose requests reject like a DNS failure. */
  failingHosts?: string[];
  /** Per-host count of 500 responses served before recovering. */
  serverErrorCounts?: Record<string, number>;
  /** Hosts that always answer 404. */
  notFoundHosts?: string[];
  configBody?: unknown;
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => (name.toLowerCase() === "content-type" ? "application/json" : null) },
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

function stubFetch(behavior: HostBehavior) {
  const serverErrorsLeft = { ...(behavior.serverErrorCounts || {}) };
  const mock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const host = /^https?:\/\/([^/]+)/.exec(url)?.[1] ?? "";
    const origin = `https://${host}`;
    if (behavior.failingHosts?.includes(origin)) {
      throw new TypeError(`Network request failed: host lookup '${host}'`);
    }
    if ((serverErrorsLeft[origin] ?? 0) > 0) {
      serverErrorsLeft[origin] -= 1;
      return jsonResponse({ error: "server" }, 500);
    }
    if (behavior.notFoundHosts?.includes(origin)) {
      return jsonResponse({ error: "missing" }, 404);
    }
    if (url.endsWith("/v1/config")) {
      return jsonResponse(behavior.configBody ?? mockConfig);
    }
    if (url.includes("/v1/paywall-documents/")) {
      return jsonResponse({ html: HOSTED_HTML });
    }
    return jsonResponse({});
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

function requestedUrls(mock: ReturnType<typeof vi.fn>): string[] {
  return mock.mock.calls.map(([input]) => String(input));
}

function failoverConfig(overrides: Record<string, unknown> = {}) {
  return {
    publicKey: "pk_test_demo",
    apiBaseUrl: PRIMARY,
    fallbackApiBaseUrls: [FALLBACK],
    ...overrides,
  };
}

describe("host failover", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("falls back to the next host when the primary fails at the network level", async () => {
    const mock = stubFetch({ failingHosts: [PRIMARY] });
    const client = createTranzmitClient(memoryAdapter(), {});

    await client.init(failoverConfig());

    expect(client.isReady()).toBe(true);
    const configCalls = requestedUrls(mock).filter((url) => url.endsWith("/v1/config"));
    expect(configCalls).toEqual([`${PRIMARY}/v1/config`, `${FALLBACK}/v1/config`]);
  });

  it("queues an sdk_host_fallback event and flushes it to the winning host", async () => {
    const mock = stubFetch({ failingHosts: [PRIMARY] });
    const client = createTranzmitClient(memoryAdapter(), {});

    await client.init(failoverConfig());
    await client.flush();

    const eventCalls = mock.mock.calls.filter(([input]) => String(input).endsWith("/v1/events"));
    expect(eventCalls.length).toBeGreaterThan(0);
    const [url, init] = eventCalls[eventCalls.length - 1]!;
    expect(String(url)).toBe(`${FALLBACK}/v1/events`);
    const events = JSON.parse((init as RequestInit).body as string).events as Array<{
      event: string;
      properties?: Record<string, unknown>;
    }>;
    const fallbackEvent = events.find((event) => event.event === "sdk_host_fallback");
    expect(fallbackEvent?.properties?.host).toBe(FALLBACK);
    expect(fallbackEvent?.properties?.endpoint).toBe("/v1/config");
  });

  it("surfaces every attempted host when all are down", async () => {
    stubFetch({ failingHosts: [PRIMARY, FALLBACK] });
    const onError = vi.fn();
    const client = createTranzmitClient(memoryAdapter(), {});

    let error: TranzmitError | undefined;
    try {
      await client.init(failoverConfig({ onError }));
    } catch (err) {
      error = err as TranzmitError;
    }

    expect(error?.code).toBe("config_fetch_failed");
    expect(error?.message).toContain("primary.test");
    expect(error?.message).toContain("fallback.test");
    expect(client.isReady()).toBe(false);
  });

  it("never tries another host when apiBaseUrl is explicit without fallbacks", async () => {
    const mock = stubFetch({ failingHosts: [PRIMARY] });
    const client = createTranzmitClient(memoryAdapter(), {});

    await expect(
      client.init({ publicKey: "pk_test_demo", apiBaseUrl: PRIMARY })
    ).rejects.toMatchObject({ code: "config_fetch_failed" });

    const hosts = new Set(requestedUrls(mock).map((url) => /^https?:\/\/[^/]+/.exec(url)?.[0]));
    expect(hosts).toEqual(new Set([PRIMARY]));
  });

  it("does not fall back on 4xx responses", async () => {
    const mock = stubFetch({ notFoundHosts: [PRIMARY] });
    const client = createTranzmitClient(memoryAdapter(), {});

    await expect(client.init(failoverConfig())).rejects.toMatchObject({
      message: expect.stringContaining("HTTP 404"),
    });

    const hosts = new Set(requestedUrls(mock).map((url) => /^https?:\/\/[^/]+/.exec(url)?.[0]));
    expect(hosts).toEqual(new Set([PRIMARY]));
  });

  it("retries the same host once on a 5xx before falling back", async () => {
    const mock = stubFetch({ serverErrorCounts: { [PRIMARY]: 1 } });
    const client = createTranzmitClient(memoryAdapter(), {});

    await client.init(failoverConfig());

    expect(client.isReady()).toBe(true);
    const configCalls = requestedUrls(mock).filter((url) => url.endsWith("/v1/config"));
    expect(configCalls).toEqual([`${PRIMARY}/v1/config`, `${PRIMARY}/v1/config`]);
  });

  it("rebases hosted document URLs onto a live host", async () => {
    const hostedConfig = {
      ...mockConfig,
      placements: {
        upgrade_pro: {
          ...mockConfig.placements.upgrade_pro!,
          spec: {
            ...baseSpec,
            document: {
              url: "https://dochost.test/v1/paywall-documents/pl_1/var_a/doc.json?key=pk_test_demo",
              integrity: sha256Integrity(HOSTED_HTML),
            },
          },
        },
      },
    };
    const mock = stubFetch({ failingHosts: ["https://dochost.test"], configBody: hostedConfig });
    const client = createTranzmitClient(memoryAdapter(), {});

    await client.init({ publicKey: "pk_test_demo", apiBaseUrl: PRIMARY });

    expect(client.isReady()).toBe(true);
    expect(client.getConfig()?.placements.upgrade_pro?.spec.document?.html).toContain(
      "Hosted Upgrade"
    );
    const docCalls = requestedUrls(mock).filter((url) => url.includes("/v1/paywall-documents/"));
    expect(docCalls[0]).toContain("https://dochost.test/");
    expect(docCalls[1]).toContain(`${PRIMARY}/`);
    expect(docCalls[1]).toContain("?key=pk_test_demo");
  });

  it("deduplicates content-addressed documents and downloads unique payloads serially", async () => {
    const placement = mockConfig.placements.upgrade_pro!;
    const hostedDocument = (placementId: string, cacheKey: string) => ({
      url: `${PRIMARY}/v1/paywall-documents/${placementId}/default/${encodeURIComponent(cacheKey)}.json?key=pk_test_demo`,
      integrity: sha256Integrity(HOSTED_HTML),
    });
    const hostedConfig = {
      ...mockConfig,
      placements: {
        first: {
          ...placement,
          trigger: "first",
          spec: {
            ...baseSpec,
            document: hostedDocument("pl_1", "hiastro_general_01:doc-e5648ad5dcec"),
          },
        },
        second: {
          ...placement,
          trigger: "second",
          spec: {
            ...baseSpec,
            document: hostedDocument("pl_2", "hiastro_general_01:doc-e5648ad5dcec"),
          },
        },
        third: {
          ...placement,
          trigger: "third",
          spec: {
            ...baseSpec,
            document: hostedDocument("pl_3", "control:doc-111111111111"),
          },
        },
      },
    };
    let activeDownloads = 0;
    let maxActiveDownloads = 0;
    const mock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/v1/config")) return jsonResponse(hostedConfig);
      if (url.includes("/v1/paywall-documents/")) {
        activeDownloads += 1;
        maxActiveDownloads = Math.max(maxActiveDownloads, activeDownloads);
        await new Promise((resolve) => setTimeout(resolve, 1));
        activeDownloads -= 1;
        return jsonResponse({
          html: HOSTED_HTML,
          css: ".paywall{color:#6d28d9}",
          js: "window.__paywallReady=true",
          baseUrl: "https://assets.test",
        });
      }
      return jsonResponse({});
    });
    vi.stubGlobal("fetch", mock);
    const client = createTranzmitClient(memoryAdapter(), {});

    await client.init(failoverConfig());

    const docCalls = requestedUrls(mock).filter((url) => url.includes("/v1/paywall-documents/"));
    expect(docCalls).toHaveLength(2);
    expect(maxActiveDownloads).toBe(1);
    expect(client.getPlacement("first")?.spec.document?.html).toBe(HOSTED_HTML);
    expect(client.getPlacement("second")?.spec.document?.html).toBe(HOSTED_HTML);
    expect(client.getPlacement("second")?.spec.document?.css).toBe(".paywall{color:#6d28d9}");
    expect(client.getPlacement("second")?.spec.document?.js).toBe("window.__paywallReady=true");
    expect(client.getPlacement("second")?.spec.document?.baseUrl).toBe("https://assets.test");
    expect(client.getPlacement("first")?.spec.document?.url).toContain("/pl_1/");
    expect(client.getPlacement("second")?.spec.document?.url).toContain("/pl_2/");
  });

  it("does not coalesce custom URLs that only resemble content-addressed documents", async () => {
    const placement = mockConfig.placements.upgrade_pro!;
    const hostedConfig = {
      ...mockConfig,
      placements: {
        first: {
          ...placement,
          trigger: "first",
          spec: {
            ...baseSpec,
            document: {
              url: "https://cdn.test/custom/first/paywall%3Adoc-111111111111.json?key=one",
              integrity: sha256Integrity(HOSTED_HTML),
            },
          },
        },
        second: {
          ...placement,
          trigger: "second",
          spec: {
            ...baseSpec,
            document: {
              url: "https://cdn.test/custom/second/paywall%3Adoc-111111111111.json?key=two",
              integrity: sha256Integrity(HOSTED_HTML),
            },
          },
        },
      },
    };
    const mock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/v1/config")) return jsonResponse(hostedConfig);
      if (url.startsWith("https://cdn.test/custom/")) return jsonResponse({ html: HOSTED_HTML });
      return jsonResponse({});
    });
    vi.stubGlobal("fetch", mock);
    const client = createTranzmitClient(memoryAdapter(), {});

    await client.init(failoverConfig());

    expect(requestedUrls(mock).filter((url) => url.startsWith("https://cdn.test/custom/"))).toHaveLength(2);
  });

  it("evicts a corrupted content-addressed response so a later init can recover", async () => {
    const hostedConfig = {
      ...mockConfig,
      placements: {
        upgrade_pro: {
          ...mockConfig.placements.upgrade_pro!,
          spec: {
            ...baseSpec,
            document: {
              url: `${PRIMARY}/v1/paywall-documents/pl_1/default/paywall%3Adoc-111111111111.json?key=pk_test_demo`,
              integrity: sha256Integrity(HOSTED_HTML),
            },
          },
        },
      },
    };
    let documentCalls = 0;
    const mock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/v1/config")) return jsonResponse(hostedConfig);
      if (url.includes("/v1/paywall-documents/")) {
        documentCalls += 1;
        return jsonResponse({ html: documentCalls === 1 ? "<main>corrupted</main>" : HOSTED_HTML });
      }
      return jsonResponse({});
    });
    vi.stubGlobal("fetch", mock);
    const client = createTranzmitClient(memoryAdapter(), {});

    await expect(client.init(failoverConfig())).rejects.toMatchObject({
      code: "paywall_integrity_failed",
    });
    await Promise.resolve();
    await expect(client.init(failoverConfig())).resolves.toBeUndefined();

    expect(documentCalls).toBe(2);
    expect(client.getPlacement("upgrade_pro")?.spec.document?.html).toBe(HOSTED_HTML);
  });

  it("uses the sticky fallback first for every document after a host switch", async () => {
    const placement = mockConfig.placements.upgrade_pro!;
    const hostedDocument = (placementId: string, revision: string) => ({
      url: `${PRIMARY}/v1/paywall-documents/${placementId}/default/paywall%3Adoc-${revision}.json?key=pk_test_demo`,
      integrity: sha256Integrity(HOSTED_HTML),
    });
    const hostedConfig = {
      ...mockConfig,
      placements: {
        first: {
          ...placement,
          trigger: "first",
          spec: { ...baseSpec, document: hostedDocument("pl_1", "111111111111") },
        },
        second: {
          ...placement,
          trigger: "second",
          spec: { ...baseSpec, document: hostedDocument("pl_2", "222222222222") },
        },
      },
    };
    const mock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === `${PRIMARY}/v1/config`) return jsonResponse(hostedConfig);
      if (url.startsWith(`${PRIMARY}/v1/paywall-documents/`)) {
        throw new TypeError("Network request failed");
      }
      if (url.startsWith(`${FALLBACK}/v1/paywall-documents/`)) {
        return jsonResponse({ html: HOSTED_HTML });
      }
      return jsonResponse({});
    });
    vi.stubGlobal("fetch", mock);
    const client = createTranzmitClient(memoryAdapter(), {});

    await client.init(failoverConfig());

    expect(requestedUrls(mock).filter((url) => url.startsWith(`${PRIMARY}/v1/paywall-documents/`))).toHaveLength(1);
    expect(requestedUrls(mock).filter((url) => url.startsWith(`${FALLBACK}/v1/paywall-documents/`))).toHaveLength(2);
  });

  it("uses a mobile-appropriate timeout for hosted document downloads", async () => {
    vi.useFakeTimers();
    try {
      const hostedConfig = {
        ...mockConfig,
        placements: {
          upgrade_pro: {
            ...mockConfig.placements.upgrade_pro!,
            spec: {
              ...baseSpec,
              document: {
                url: `${PRIMARY}/v1/paywall-documents/pl_1/default/paywall%3Adoc-111111111111.json?key=pk_test_demo`,
                integrity: sha256Integrity(HOSTED_HTML),
              },
            },
          },
        },
      };
      const mock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === `${PRIMARY}/v1/config`) return Promise.resolve(jsonResponse(hostedConfig));
        if (url.startsWith(`${PRIMARY}/v1/paywall-documents/`)) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: { get: () => "application/json" },
            text: () => new Promise<string>((_resolve, reject) => {
              init?.signal?.addEventListener("abort", () => {
                const error = new Error("aborted");
                error.name = "AbortError";
                reject(error);
              });
            }),
          } as unknown as Response);
        }
        if (url.startsWith(`${FALLBACK}/v1/paywall-documents/`)) {
          return Promise.resolve(jsonResponse({ html: HOSTED_HTML }));
        }
        return Promise.resolve(jsonResponse({}));
      });
      vi.stubGlobal("fetch", mock);
      const client = createTranzmitClient(memoryAdapter(), {});

      const initialization = client.init(failoverConfig());
      await vi.advanceTimersByTimeAsync(8_001);
      expect(requestedUrls(mock).some((url) => url.startsWith(`${FALLBACK}/v1/paywall-documents/`))).toBe(false);

      await vi.advanceTimersByTimeAsync(12_000);
      await initialization;

      expect(client.isReady()).toBe(true);
      expect(requestedUrls(mock).some((url) => url.startsWith(`${FALLBACK}/v1/paywall-documents/`))).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("falls back when Vercel returns a mitigation challenge", async () => {
    const mock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === `${PRIMARY}/v1/config`) {
        return {
          ok: false,
          status: 403,
          headers: { get: (name: string) => name.toLowerCase() === "x-vercel-mitigated" ? "challenge" : null },
        } as unknown as Response;
      }
      if (url === `${FALLBACK}/v1/config`) return jsonResponse(mockConfig);
      return jsonResponse({});
    });
    vi.stubGlobal("fetch", mock);
    const client = createTranzmitClient(memoryAdapter(), {});

    await client.init(failoverConfig());

    expect(client.isReady()).toBe(true);
    expect(requestedUrls(mock).filter((url) => url.endsWith("/v1/config"))).toEqual([
      `${PRIMARY}/v1/config`,
      `${FALLBACK}/v1/config`,
    ]);
  });

  it("single-flights overlapping refresh hydration and keeps the newest routed config", async () => {
    const adapter = memoryAdapter();
    const seed = createTranzmitClient(adapter, {});
    stubFetch({});
    await seed.init({ publicKey: "pk_test_demo", apiBaseUrl: PRIMARY });

    const placement = mockConfig.placements.upgrade_pro!;
    const hostedPlacement = (variantId: string) => ({
      ...placement,
      variantId,
      spec: {
        ...baseSpec,
        document: {
          url: `${PRIMARY}/v1/paywall-documents/pl_1/default/paywall%3Adoc-111111111111.json?key=pk_test_demo`,
          integrity: sha256Integrity(HOSTED_HTML),
        },
      },
    });
    const oldConfig = {
      ...mockConfig,
      placements: { upgrade_pro: hostedPlacement("old_route") },
    };
    const newConfig = {
      ...mockConfig,
      placements: { upgrade_pro: hostedPlacement("new_route") },
    };
    let resolveDocument!: (response: Response) => void;
    const pendingDocument = new Promise<Response>((resolve) => { resolveDocument = resolve; });
    let documentCalls = 0;
    const mock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/v1/config")) {
        const traits = JSON.parse(String(init?.body || "{}"))?.traits || {};
        return jsonResponse(traits.category === "love" ? newConfig : oldConfig);
      }
      if (url.includes("/v1/paywall-documents/")) {
        documentCalls += 1;
        return pendingDocument;
      }
      return jsonResponse({});
    });
    vi.stubGlobal("fetch", mock);
    const client = createTranzmitClient(adapter, {});

    await client.init({ publicKey: "pk_test_demo", apiBaseUrl: PRIMARY });
    for (let i = 0; i < 10 && documentCalls === 0; i += 1) await Promise.resolve();
    expect(documentCalls).toBe(1);

    const routed = client.setTraits({ category: "love" });
    await Promise.resolve();
    resolveDocument(jsonResponse({ html: HOSTED_HTML }));
    await routed;
    await Promise.resolve();

    expect(documentCalls).toBe(1);
    expect(client.getPlacement("upgrade_pro")?.variantId).toBe("new_route");
  });

  it("sticks to the host that last succeeded for subsequent requests", async () => {
    const mock = stubFetch({ failingHosts: [PRIMARY] });
    const client = createTranzmitClient(memoryAdapter(), {});

    await client.init(failoverConfig());
    mock.mockClear();

    client.track("cta_click");
    await client.flush();

    const eventCalls = requestedUrls(mock).filter((url) => url.endsWith("/v1/events"));
    expect(eventCalls).toEqual([`${FALLBACK}/v1/events`]);
  });
});
