import type { PaywallLocalization, PaywallSpec } from "./spec.js";

export interface LocalizationIssue {
  path: string;
  message: string;
  keyword: "localization" | "assets";
}

export interface LocalizationValidationResult {
  tokens: string[];
  issues: LocalizationIssue[];
}

const TOKEN_RE = /\{\{\s*(\w+)\s*\}\}/g;
const ASSET_ATTR_RE = /\s(?:src|href|data-tranzmit-src|data-tranzmit-fallback-src)=("|')([^"']+)\1/g;

export function extractLocalizationTokens(html: string | undefined): string[] {
  const tokens = new Set<string>();
  if (!html) return [];

  for (const match of html.matchAll(TOKEN_RE)) {
    if (match[1]) tokens.add(match[1]);
  }

  return Array.from(tokens).sort();
}

export function resolveLocalizedStrings(
  localization: PaywallLocalization | undefined,
  locale: string | undefined
): Record<string, string> {
  if (!localization || !localization.translations) return {};

  const { defaultLocale, translations } = localization;
  const base = translations[defaultLocale] || {};
  const candidates = [locale, baseLanguage(locale)];

  for (const candidate of candidates) {
    if (candidate && translations[candidate]) {
      return { ...base, ...translations[candidate] };
    }
  }

  return base;
}

export function localizeHtml(html: string, strings: Record<string, string>): string {
  return html.replace(TOKEN_RE, (_match, key: string) => {
    const value = strings[key];
    return value == null ? "" : escapeHtml(String(value));
  });
}

export function validateLocalizationCoverage(spec: Pick<PaywallSpec, "document" | "localization">): LocalizationValidationResult {
  const html = spec.document?.html || "";
  const tokens = extractLocalizationTokens(html);
  const issues: LocalizationIssue[] = [];
  const localization = spec.localization;

  if (!tokens.length) return { tokens, issues };

  if (!localization) {
    issues.push({
      path: "/localization",
      message: "Document contains localization tokens but no localization block",
      keyword: "localization",
    });
    return { tokens, issues };
  }

  if (!localization.defaultLocale) {
    issues.push({
      path: "/localization/defaultLocale",
      message: "Missing defaultLocale",
      keyword: "localization",
    });
  }

  const translations = localization.translations || {};
  if (localization.defaultLocale && !translations[localization.defaultLocale]) {
    issues.push({
      path: `/localization/translations/${localization.defaultLocale}`,
      message: `Missing default locale translations for "${localization.defaultLocale}"`,
      keyword: "localization",
    });
  }

  for (const [locale, strings] of Object.entries(translations)) {
    for (const token of tokens) {
      if (strings[token] == null) {
        issues.push({
          path: `/localization/translations/${locale}/${token}`,
          message: `Missing token "${token}" in locale "${locale}"`,
          keyword: "localization",
        });
      }
    }
  }

  return { tokens, issues };
}

export function extractRelativeAssetReferences(html: string | undefined): string[] {
  const references = new Set<string>();
  if (!html) return [];

  for (const match of html.matchAll(ASSET_ATTR_RE)) {
    const value = match[2]?.trim();
    if (value && isRelativeAssetReference(value)) {
      references.add(value);
    }
  }

  return Array.from(references).sort();
}

function baseLanguage(locale: string | undefined): string | undefined {
  if (!locale) return undefined;
  const base = locale.split(/[-_]/)[0];
  return base && base !== locale ? base : undefined;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isRelativeAssetReference(value: string): boolean {
  if (!value || value.startsWith("#") || value.startsWith("{{")) return false;
  if (/^(https?:|data:|about:|mailto:|tel:|\/)/i.test(value)) return false;
  return true;
}
