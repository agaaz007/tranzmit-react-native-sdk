import React, { useEffect } from "react";

export interface WebViewMessageEvent {
  nativeEvent: { data: string };
}

export interface WebViewNavigation {
  url: string;
}

export default function WebView({
  source,
  onMessage,
  onError,
  onLoadEnd,
  originWhitelist,
  javaScriptCanOpenWindowsAutomatically,
  domStorageEnabled,
  allowFileAccess,
  allowUniversalAccessFromFileURLs,
  mixedContentMode,
}: any) {
  const html = source?.html || "";
  useEffect(() => {
    if (html.includes("data-trigger-webview-error")) {
      onError?.({ nativeEvent: { description: "Simulated WebView failure" } });
      return;
    }
    if (!html.includes("data-skip-load-end")) {
      onLoadEnd?.({ nativeEvent: {} });
    }
  }, [html, onError, onLoadEnd]);

  const body = html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "");
  const headings = Array.from(body.matchAll(/<(?:h1|h2|p)[^>]*>(.*?)<\/(?:h1|h2|p)>/gims))
    .map((match) => stripTags(match[1]));
  const buttons = Array.from(body.matchAll(/<button([^>]*)>(.*?)<\/button>/gims))
    .map((match) => {
      const attrs = match[1];
      const explicitAction = attr(attrs, "data-tranzmit-action");
      const classes = attr(attrs, "class") || "";
      // Mirror compose.ts: explicit data-tranzmit-action wins; otherwise a
      // conventional .cta / .tz-cta class on a button falls back to a CTA.
      const isCtaClass = /(^|\s)(cta|tz-cta)(\s|$)/.test(classes);
      const action = explicitAction || (isCtaClass ? "cta" : undefined);
      return {
        action,
        productId: attr(attrs, "data-product-id"),
        url: attr(attrs, "href") || attr(attrs, "data-url"),
        label: stripTags(match[2]),
      };
    })
    .filter((button) => button.action);

  return (
    <div data-testid="tranzmit-webview" data-html={html}>
      <span data-testid="tranzmit-webview-origin-whitelist">{JSON.stringify(originWhitelist || [])}</span>
      <span data-testid="tranzmit-webview-js-windows">{String(javaScriptCanOpenWindowsAutomatically)}</span>
      <span data-testid="tranzmit-webview-dom-storage">{String(domStorageEnabled)}</span>
      <span data-testid="tranzmit-webview-file-access">{String(allowFileAccess)}</span>
      <span data-testid="tranzmit-webview-universal-file-access">{String(allowUniversalAccessFromFileURLs)}</span>
      <span data-testid="tranzmit-webview-mixed-content">{String(mixedContentMode)}</span>
      {headings.map((text) => (
        <span key={text}>{text}</span>
      ))}
      {buttons.map((button) => (
        <button
          key={`${button.action}:${button.productId || button.label}`}
          onClick={() => onMessage?.({ nativeEvent: { data: JSON.stringify({ type: button.action, productId: button.productId, url: button.url }) } })}
        >
          {button.label}
        </button>
      ))}
    </div>
  );
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function attr(attrs: string, name: string) {
  const match = attrs.match(new RegExp(`${name}=[\\"']([^\\\"']+)[\\"']`, "i"));
  return match?.[1];
}
