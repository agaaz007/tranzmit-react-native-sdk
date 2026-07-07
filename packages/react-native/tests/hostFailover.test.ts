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
