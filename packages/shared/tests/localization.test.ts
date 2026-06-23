import { describe, expect, it } from "vitest";

import {
  extractLocalizationTokens,
  extractRelativeAssetReferences,
  localizeHtml,
  resolveLocalizedStrings,
  validateLocalizationCoverage,
} from "../src/localization.js";

describe("localization utilities", () => {
  it("extracts unique token names from text and attributes", () => {
    expect(extractLocalizationTokens('<h1>{{headline}}</h1><img alt="{{headline}}" title="{{ hero_alt }}">')).toEqual([
      "headline",
      "hero_alt",
    ]);
  });

  it("resolves exact, base, and default locale strings", () => {
    const localization = {
      defaultLocale: "en",
      translations: {
        en: { headline: "Unlock Pro", cta: "Continue" },
        es: { headline: "Desbloquea Pro" },
      },
    };

    expect(resolveLocalizedStrings(localization, "es-MX")).toEqual({
      headline: "Desbloquea Pro",
      cta: "Continue",
    });
    expect(resolveLocalizedStrings(localization, undefined)).toEqual({
      headline: "Unlock Pro",
      cta: "Continue",
    });
  });

  it("escapes localized HTML values", () => {
    expect(localizeHtml("<h1>{{headline}}</h1>", { headline: "Save <50%> & more" })).toContain(
      "Save &lt;50%&gt; &amp; more"
    );
  });

  it("validates token coverage per locale", () => {
    const result = validateLocalizationCoverage({
      document: { html: "<h1>{{headline}}</h1><button>{{cta}}</button>" },
      localization: {
        defaultLocale: "en",
        translations: {
          en: { headline: "Unlock Pro", cta: "Continue" },
          es: { headline: "Desbloquea Pro" },
        },
      },
    });

    expect(result.issues).toContainEqual({
      path: "/localization/translations/es/cta",
      message: 'Missing token "cta" in locale "es"',
      keyword: "localization",
    });
  });

  it("extracts relative asset references that need hosting", () => {
    expect(
      extractRelativeAssetReferences(
        '<main><img src="assets/hero.png"><img src="/assets/ok.png"><img src="https://cdn.example.com/ok.png"></main>'
      )
    ).toEqual(["assets/hero.png"]);
  });
});
