import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { Linking } from "react-native";
import { composeDocumentForTest, SpecRenderer } from "../src/renderer/SpecRenderer.js";
import { baseSpec } from "./fixtures.js";

describe("SpecRenderer", () => {
  it("renders the server HTML document in a WebView", () => {
    const { getByText, getByTestId } = render(
      <SpecRenderer spec={baseSpec} presentation="inline" onCTA={() => {}} onDismiss={() => {}} />
    );

    expect(getByTestId("tranzmit-webview")).toBeTruthy();
    expect(getByText(/Unlock Pro/)).toBeTruthy();
    expect(getByText(/Start Free Trial/)).toBeTruthy();
  });

  it("maps WebView CTA bridge messages to the selected product", () => {
    const onCTA = vi.fn();
    const { getByText } = render(
      <SpecRenderer spec={baseSpec} presentation="inline" onCTA={onCTA} onDismiss={() => {}} />
    );

    fireEvent.click(getByText("Start Free Trial"));

    expect(onCTA).toHaveBeenCalledWith(expect.objectContaining({ id: "pro_monthly" }));
  });

  it("maps WebView dismiss bridge messages to dismiss", () => {
    const onDismiss = vi.fn();
    const { getByText } = render(
      <SpecRenderer spec={baseSpec} presentation="inline" onCTA={() => {}} onDismiss={onDismiss} />
    );

    fireEvent.click(getByText("Maybe later"));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("fires onReady when the WebView finishes loading", async () => {
    const onReady = vi.fn();
    render(
      <SpecRenderer spec={baseSpec} presentation="inline" onCTA={() => {}} onDismiss={() => {}} onReady={onReady} />
    );

    await vi.waitFor(() => expect(onReady).toHaveBeenCalledTimes(1));
  });

  it("fires onReady from the hosted ready bridge event", () => {
    const onReady = vi.fn();
    const spec = {
      ...baseSpec,
      document: {
        html: `
          <main data-skip-load-end>
            <button data-tranzmit-action="ready">Ready</button>
          </main>
        `,
      },
    };
    const { getByText } = render(
      <SpecRenderer spec={spec} presentation="inline" onCTA={() => {}} onDismiss={() => {}} onReady={onReady} />
    );

    expect(onReady).not.toHaveBeenCalled();
    fireEvent.click(getByText("Ready"));
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it("uses restricted WebView capabilities by default", () => {
    const { getByTestId } = render(
      <SpecRenderer spec={baseSpec} presentation="inline" onCTA={() => {}} onDismiss={() => {}} />
    );

    expect(getByTestId("tranzmit-webview-origin-whitelist").textContent).toBe("[\"about:blank\"]");
    expect(getByTestId("tranzmit-webview-js-windows").textContent).toBe("false");
    expect(getByTestId("tranzmit-webview-dom-storage").textContent).toBe("false");
    expect(getByTestId("tranzmit-webview-file-access").textContent).toBe("false");
    expect(getByTestId("tranzmit-webview-universal-file-access").textContent).toBe("false");
    expect(getByTestId("tranzmit-webview-mixed-content").textContent).toBe("never");
  });

  it("only opens external URLs for allowlisted HTTPS hosts", () => {
    const openURL = vi.spyOn(Linking, "openURL");
    const spec = {
      ...baseSpec,
      document: {
        html: `
          <main>
            <button data-tranzmit-action="open_url" data-url="https://billing.example.test/terms">Terms</button>
            <button data-tranzmit-action="open_url" data-url="https://evil.example.test/terms">Blocked</button>
          </main>
        `,
      },
      security: {
        externalUrlHosts: ["billing.example.test"],
      },
    };

    const { getByText } = render(
      <SpecRenderer spec={spec} presentation="inline" onCTA={() => {}} onDismiss={() => {}} />
    );

    fireEvent.click(getByText("Terms"));
    fireEvent.click(getByText("Blocked"));

    expect(openURL).toHaveBeenCalledTimes(1);
    expect(openURL).toHaveBeenCalledWith("https://billing.example.test/terms");
  });

  it("injects presentation-aware fullscreen document styles", () => {
    const html = composeDocumentForTest(baseSpec, "fullscreen", {
      width: 412,
      height: 915,
      safeTop: 24,
      safeBottom: 18,
      safeLeft: 0,
      safeRight: 0,
      pixelRatio: 2.75,
      scale: 1.06,
      presentation: "fullscreen",
    });

    expect(html).toContain("tz-presentation-fullscreen");
    expect(html).toContain('data-tranzmit-presentation="fullscreen"');
    expect(html).toContain("--tz-vh: 915.00px");
    expect(html).toContain("--tz-safe-bottom: 18.00px");
    expect(html).toContain("--tz-cta-reserved-height: clamp(86px, 10.5vh, 108px)");
    expect(html).toContain('"pixelRatio":2.75');
    expect(html).toContain("border-radius: 0 !important");
    expect(html).toContain("height: var(--tz-vh) !important");
    expect(html).toContain("padding-bottom: calc(var(--tz-safe-bottom) + var(--tz-cta-reserved-height)) !important");
    expect(html).toContain("width: var(--tz-vw) !important");
    expect(html).toContain(".tz-presentation-fullscreen .tz-paywall:not(.phone) .tz-close");
    expect(html).toContain("display: none !important");
    expect(html).toContain("window.TranzmitNativeViewport");
  });

  it("injects the resolved user context and personalized-source bridge", () => {
    const html = composeDocumentForTest(
      {
        ...baseSpec,
        document: {
          html: '<main><img data-tranzmit-src="https://cdn.example.test/u/{userId}.png" /></main>',
        },
      },
      "inline",
      undefined,
      { id: "user-123", userId: "user-123", stableID: "trz_abc" },
    );

    expect(html).toContain('window.TranzmitUser = {"id":"user-123","userId":"user-123","stableID":"trz_abc"}');
    expect(html).toContain("data-tranzmit-src");
    expect(html).toContain("function fillTemplate(template)");
    expect(html).toContain("resolvePersonalizedSources()");
  });

  it("bakes a resolved src into the markup at compose time", () => {
    const html = composeDocumentForTest(
      {
        ...baseSpec,
        document: {
          html: '<main><img data-tranzmit-src="https://cdn.example.test/u/{userId}.png" /></main>',
        },
      },
      "inline",
      undefined,
      { id: "user 123", userId: "user 123", stableID: "trz_abc" },
    );

    expect(html).toContain('src="https://cdn.example.test/u/user%20123.png"');
    expect(html).toContain('data-tranzmit-src="https://cdn.example.test/u/{userId}.png"');
  });

  it("wires a fallback image and onerror handler for data-tranzmit-fallback-src", () => {
    const html = composeDocumentForTest(
      {
        ...baseSpec,
        document: {
          html: '<main><img data-tranzmit-src="https://cdn.example.test/u/{userId}.png" data-tranzmit-fallback-src="https://cdn.example.test/default.png" /></main>',
        },
      },
      "inline",
      undefined,
      { id: "user-123", userId: "user-123" },
    );

    expect(html).toContain("window.TranzmitImageFallback = function(node)");
    expect(html).toContain('data-tranzmit-fallback-src="https://cdn.example.test/default.png"');
    expect(html).toContain('onerror="window.TranzmitImageFallback&&window.TranzmitImageFallback(this)"');
    expect(html).toContain('src="https://cdn.example.test/u/user-123.png"');
  });

  it("resolves tokens inside a personalized fallback image url", () => {
    const html = composeDocumentForTest(
      {
        ...baseSpec,
        document: {
          html: '<main><img data-tranzmit-src="https://a.test/{userId}.png" data-tranzmit-fallback-src="https://a.test/anon/{stableID}.png" /></main>',
        },
      },
      "inline",
      undefined,
      { id: "user-1", userId: "user-1", stableID: "trz_xyz" },
    );

    expect(html).toContain('data-tranzmit-fallback-src="https://a.test/anon/trz_xyz.png"');
  });

  it("bakes empty tokens when the matching identity field is absent", () => {
    const html = composeDocumentForTest(
      {
        ...baseSpec,
        document: {
          html: '<main><img data-tranzmit-src="https://cdn.example.test/u/{userId}.png" /></main>',
        },
      },
      "inline",
      undefined,
      { id: "trz_abc", stableID: "trz_abc" },
    );

    expect(html).toContain('src="https://cdn.example.test/u/.png"');
  });

  it("emits an empty user context when no identity is available", () => {
    const html = composeDocumentForTest(baseSpec, "inline");
    expect(html).toContain("window.TranzmitUser = {}");
  });

  it("omits missing identity fields from the injected user context", () => {
    const html = composeDocumentForTest(baseSpec, "inline", undefined, { id: "trz_anon", stableID: "trz_anon" });
    expect(html).toContain('window.TranzmitUser = {"id":"trz_anon","stableID":"trz_anon"}');
    expect(html).not.toContain('"userId"');
  });

  it("substitutes localized text tokens for the active locale", () => {
    const html = composeDocumentForTest(
      {
        ...baseSpec,
        document: { html: '<main><h1>{{headline}}</h1><button data-tranzmit-action="cta">{{cta}}</button></main>' },
        localization: {
          defaultLocale: "en",
          translations: {
            en: { headline: "Unlock Pro", cta: "Start free trial" },
            es: { headline: "Desbloquea Pro", cta: "Comienza la prueba" },
          },
        },
      },
      "inline",
      undefined,
      undefined,
      "es",
    );

    expect(html).toContain("Desbloquea Pro");
    expect(html).toContain("Comienza la prueba");
    expect(html).not.toContain("{{headline}}");
    expect(html).not.toContain("Unlock Pro");
  });

  it("falls back from a regional locale to its base language", () => {
    const html = composeDocumentForTest(
      {
        ...baseSpec,
        document: { html: "<main><h1>{{headline}}</h1></main>" },
        localization: {
          defaultLocale: "en",
          translations: {
            en: { headline: "Unlock Pro" },
            es: { headline: "Desbloquea Pro" },
          },
        },
      },
      "inline",
      undefined,
      undefined,
      "es-MX",
    );

    expect(html).toContain("Desbloquea Pro");
  });

  it("falls back per-key to the default locale and to empty for unknown keys", () => {
    const html = composeDocumentForTest(
      {
        ...baseSpec,
        document: { html: "<main><h1>{{headline}}</h1><p>{{cta}}</p><span>{{unknown}}</span></main>" },
        localization: {
          defaultLocale: "en",
          translations: {
            en: { headline: "Unlock Pro", cta: "Start free trial" },
            es: { headline: "Desbloquea Pro" },
          },
        },
      },
      "inline",
      undefined,
      undefined,
      "es",
    );

    expect(html).toContain("Desbloquea Pro");
    expect(html).toContain("Start free trial");
    expect(html).not.toContain("{{unknown}}");
  });

  it("html-escapes localized strings", () => {
    const html = composeDocumentForTest(
      {
        ...baseSpec,
        document: { html: "<main><h1>{{headline}}</h1></main>" },
        localization: {
          defaultLocale: "en",
          translations: { en: { headline: "Save <50%> & more" } },
        },
      },
      "inline",
      undefined,
      undefined,
      "en",
    );

    expect(html).toContain("Save &lt;50%&gt; &amp; more");
    expect(html).not.toContain("Save <50%>");
  });

  it("does not flatten imported phone artboards with fullscreen overrides", () => {
    const html = composeDocumentForTest(
      {
        ...baseSpec,
        document: {
          html: '<main class="tz-paywall phone"><div class="cta" data-tranzmit-action="cta">Continue</div></main>',
          css: ".phone{width:412px;height:920px;border-radius:54px;box-shadow:0 0 0 11px #0c0815}",
        },
      },
      "fullscreen",
    );

    expect(html).toContain(".tz-presentation-fullscreen .tz-paywall:not(.phone)");
    expect(html).not.toContain(".tz-presentation-fullscreen .tz-paywall,\n  .tz-presentation-fullscreen .tranzmit-paywall");
    expect(html).toContain(".phone{width:412px;height:920px;border-radius:54px;box-shadow:0 0 0 11px #0c0815}");
  });
});
