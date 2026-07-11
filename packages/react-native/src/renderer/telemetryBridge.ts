import type { BridgeExpectation } from "@tranzmit/shared";

export function buildSemanticTelemetryScript(context: BridgeExpectation): string {
  const envelope = JSON.stringify({
    exposure_id: context.exposureId,
    bridge_nonce: context.bridgeNonce,
  });
  return `
(function () {
  if (window.__tranzmitSemanticTelemetryInstalled) return true;
  window.__tranzmitSemanticTelemetryInstalled = true;
  var envelope = ${envelope};
  var post = function (event, properties) {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: "telemetry",
      event: event,
      exposure_id: envelope.exposure_id,
      bridge_nonce: envelope.bridge_nonce,
      properties: properties || {}
    }));
  };
  var sentDepth = {};
  var reportDepth = function () {
    var body = document.documentElement;
    var maximum = Math.max(1, body.scrollHeight - window.innerHeight);
    var percent = Math.max(0, Math.min(100, Math.round((window.scrollY / maximum) * 100)));
    [25, 50, 75, 100].forEach(function (threshold) {
      if (percent >= threshold && !sentDepth[threshold]) {
        sentDepth[threshold] = true;
        post("scroll_depth", { depth_percent: threshold });
      }
    });
  };
  var activePlan = "";
  var recentClicks = [];
  document.addEventListener("click", function (event) {
    var target = event.target && event.target.closest ? event.target.closest("button,[role='button'],[data-tranzmit-plan-id]") : null;
    if (!target) return;
    var plan = target.getAttribute("data-tranzmit-plan-id");
    if (plan && plan !== activePlan) {
      post("plan_toggle", activePlan ? { from_plan_id: activePlan, to_plan_id: plan } : { to_plan_id: plan });
      activePlan = plan;
    }
    var action = target.getAttribute("data-tranzmit-action");
    if (action === "cta" || target.classList.contains("cta") || target.classList.contains("tz-cta")) {
      var product = target.getAttribute("data-product-id");
      post("cta_click", product ? { product_id: product } : {});
    }
    if (action === "dismiss") post("dismissal", { method: "button" });
    var now = Date.now();
    var clickKey = [action || "", plan || "", target.getAttribute("role") || "button"].join(":");
    recentClicks = recentClicks.filter(function (click) { return now - click.at < 1000 && click.key === clickKey; });
    recentClicks.push({ at: now, key: clickKey });
    if (recentClicks.length === 3) {
      post("rage_click", { click_count: 3, window_ms: 1000, target_role: target.getAttribute("role") || "button" });
    }
  }, true);
  window.addEventListener("scroll", reportDepth, { passive: true });
  if (typeof IntersectionObserver === "function") {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var product = entry.target.getAttribute("data-product-id");
        var visibility = {
          is_visible: entry.isIntersecting,
          visible_percent: Math.max(0, Math.min(100, Math.round(entry.intersectionRatio * 100)))
        };
        if (product) visibility.product_id = product;
        post("price_visible", visibility);
      });
    }, { threshold: [0, 0.5, 1] });
    document.querySelectorAll("[data-tranzmit-price]").forEach(function (node) { observer.observe(node); });
  }
  requestAnimationFrame(function () { post("render_confirmed", {}); });
  return true;
})();
`;
}
