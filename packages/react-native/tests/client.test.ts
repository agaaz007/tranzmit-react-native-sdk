import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTranzmitClient, type PlatformAdapter } from "@tranzmit/shared";
import { baseSpec, mockConfig } from "./fixtures.js";

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
      onBackground() {
        return () => {};
      },
      onForeground() {
        return () => {};
      },
    },
  };
}

function configTraits() {
  return vi.mocked(fetch).mock.calls
    .filter(([url]) => String(url).endsWith("/v1/config"))
    .map(([, init]) => JSON.parse((init!.body as string)).traits);
}

describe("shared client setTraits", () => {
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

  it("merges traits and re-issues /v1/config with the merged set", async () => {
    const client = createTranzmitClient(memoryAdapter(), {});
    await client.init({ publicKey: "pk_test_demo", userTraits: { plan: "free" } });

    await client.setTraits({ category: "love" });

    const traits = configTraits();
    expect(traits[traits.length - 1]).toMatchObject({ plan: "free", category: "love" });
  });

  it("replaces traits when merge is false", async () => {
    const client = createTranzmitClient(memoryAdapter(), {});
    await client.init({ publicKey: "pk_test_demo", userTraits: { plan: "free" } });

    await client.setTraits({ category: "wealth" }, { merge: false });

    const traits = configTraits();
    expect(traits[traits.length - 1]).toEqual({ category: "wealth" });
  });

  it("re-routes the placement returned for the trigger", async () => {
    const baselineConfig = {
      ...mockConfig,
      placements: {
        upgrade_pro: {
          ...mockConfig.placements.upgrade_pro!,
          spec: { ...baseSpec, templateId: "baseline" },
        },
      },
    };
    const loveConfig = {
      ...mockConfig,
      placements: {
        upgrade_pro: {
          ...mockConfig.placements.upgrade_pro!,
          variantId: "love_arm_2",
          spec: { ...baseSpec, templateId: "love_arm" },
        },
      },
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: any) => {
        if (String(url).endsWith("/v1/config")) {
          const body = init?.body ? JSON.parse(init.body) : {};
          const routed = body?.traits?.category === "love" ? loveConfig : baselineConfig;
          return { ok: true, json: () => Promise.resolve(routed) } as any;
        }
        return { ok: true, json: () => Promise.resolve({}) } as any;
      })
    );

    const client = createTranzmitClient(memoryAdapter(), {});
    await client.init({ publicKey: "pk_test_demo" });
    expect(client.getPlacement("upgrade_pro")?.spec.templateId).toBe("baseline");

    await client.setTraits({ category: "love" });
    expect(client.getPlacement("upgrade_pro")?.spec.templateId).toBe("love_arm");
    expect(client.getPlacement("upgrade_pro")?.variantId).toBe("love_arm_2");
  });
});
