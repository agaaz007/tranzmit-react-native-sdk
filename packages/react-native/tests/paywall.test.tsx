import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TranzmitPaywall, TranzmitProvider, useTranzmit } from "../src/index.js";
import { baseSpec, mockConfig } from "./fixtures.js";

const checkoutSpec = {
  ...baseSpec,
  bridge: { version: 1 as const },
  checkout: { provider: { orderToken: "tok_upi_1" } },
  document: {
    html: `
      <main class="paywall">
        <h1>Unlock Pro</h1>
        <button data-tranzmit-action="cta" data-product-id="pro_monthly" data-payment-app="gpay">Pay With App</button>
        <button data-tranzmit-action="custom_action" data-action-name="checkout_app_selected" data-payload-app="com.example.upi">Pick Other</button>
      </main>
    `,
  },
};

const installedApps = [
  { packageName: "com.google.android.apps.nbu.paisa.user" },
  { packageName: "com.example.upi", name: "Example UPI" },
];

function TranzmitValueProbe({ onValue }: { onValue: (value: any) => void }) {
  const value = useTranzmit();
  onValue(value);
  return null;
}

describe("TranzmitPaywall", () => {
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

  it("renders when visible and hides when invisible", async () => {
    const { queryByText, rerender } = render(
      <TranzmitProvider publicKey="pk_test_demo">
        <TranzmitPaywall trigger="upgrade_pro" visible presentation="inline" />
      </TranzmitProvider>
    );

    await waitFor(() => expect(queryByText("Unlock Pro")).toBeTruthy());

    rerender(
      <TranzmitProvider publicKey="pk_test_demo">
        <TranzmitPaywall trigger="upgrade_pro" visible={false} presentation="inline" />
      </TranzmitProvider>
    );

    expect(queryByText("Unlock Pro")).toBeNull();
  });

  it("invokes declarative CTA and dismiss callbacks", async () => {
    const onCTA = vi.fn();
    const onDismiss = vi.fn();
    const { getByText } = render(
      <TranzmitProvider publicKey="pk_test_demo">
        <TranzmitPaywall
          trigger="upgrade_pro"
          visible
          presentation="inline"
          onCTA={onCTA}
          onDismiss={onDismiss}
        />
      </TranzmitProvider>
    );

    await waitFor(() => expect(getByText("Unlock Pro")).toBeTruthy());
    fireEvent.click(getByText("Start Free Trial").closest("button")!);
    fireEvent.click(getByText("Maybe later").closest("button")!);

    expect(onCTA).toHaveBeenCalledWith(expect.objectContaining({ id: "pro_monthly" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("renders a dynamically passed spec without a configured trigger", async () => {
    const onCTA = vi.fn();
    const dynamicSpec = {
      ...baseSpec,
      headline: "Dynamic Paywall",
      cta: "Choose Dynamic Plan",
      document: {
        ...baseSpec.document!,
        html: `
          <main class="paywall">
            <h1>Dynamic Paywall</h1>
            <button data-tranzmit-action="cta" data-product-id="pro_monthly">Choose Dynamic Plan</button>
          </main>
        `,
      },
    };

    const { getByText } = render(
      <TranzmitProvider publicKey="pk_test_demo">
        <TranzmitPaywall
          spec={dynamicSpec}
          variantId="preview"
          visible
          presentation="inline"
          onCTA={onCTA}
        />
      </TranzmitProvider>
    );

    expect(getByText("Dynamic Paywall")).toBeTruthy();
    fireEvent.click(getByText("Choose Dynamic Plan").closest("button")!);
    expect(onCTA).toHaveBeenCalledWith(expect.objectContaining({ id: "pro_monthly" }));
  });

  it("threads checkout context to onCTA and tracks payment_app on cta_click", async () => {
    const onCTA = vi.fn();
    let tranzmit: any;
    const { getByText } = render(
      <TranzmitProvider publicKey="pk_test_demo" checkoutApps={installedApps}>
        <TranzmitValueProbe onValue={(value) => { tranzmit = value; }} />
        <TranzmitPaywall
          spec={checkoutSpec}
          variantId="preview"
          visible
          presentation="inline"
          onCTA={onCTA}
        />
      </TranzmitProvider>
    );

    await waitFor(() => expect(getByText("Pay With App")).toBeTruthy());
    fireEvent.click(getByText("Pay With App").closest("button")!);

    expect(onCTA).toHaveBeenCalledWith(
      expect.objectContaining({ id: "pro_monthly" }),
      {
        paymentApp: { id: "gpay", name: "Google Pay", packageName: "com.google.android.apps.nbu.paisa.user" },
        provider: { orderToken: "tok_upi_1" },
      },
    );

    await tranzmit.flush();
    const ctaClicks = flushedEvents().filter((event) => event.event === "cta_click");
    expect(ctaClicks).toHaveLength(1);
    expect(ctaClicks[0].properties.payment_app).toBe("gpay");
    expect(ctaClicks[0].properties.trigger).toBe("dynamic_spec");
  });

  it("tracks checkout_app_selected as other for unknown app ids", async () => {
    let tranzmit: any;
    const { getByText } = render(
      <TranzmitProvider publicKey="pk_test_demo" checkoutApps={installedApps}>
        <TranzmitValueProbe onValue={(value) => { tranzmit = value; }} />
        <TranzmitPaywall spec={checkoutSpec} variantId="preview" visible presentation="inline" />
      </TranzmitProvider>
    );

    await waitFor(() => expect(getByText("Pick Other")).toBeTruthy());
    fireEvent.click(getByText("Pick Other").closest("button")!);

    await tranzmit.flush();
    const selections = flushedEvents().filter((event) => event.event === "checkout_app_selected");
    expect(selections).toHaveLength(1);
    expect(selections[0].properties.app).toBe("other");
    expect(selections[0].properties.trigger).toBe("dynamic_spec");
  });
});

function flushedEvents() {
  return vi.mocked(fetch).mock.calls
    .filter(([url]) => String(url).includes("/v1/events"))
    .flatMap(([, init]) => {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      return body.events || [];
    });
}
