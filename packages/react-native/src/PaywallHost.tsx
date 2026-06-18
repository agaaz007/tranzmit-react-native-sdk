import type { ProductSpec } from "@tranzmit/shared";
import { Pressable, Text, View } from "react-native";
import { SpecRenderer } from "./renderer/SpecRenderer.js";
import { ModalPresenter } from "./presentation/ModalPresenter.js";
import { SheetPresenter } from "./presentation/SheetPresenter.js";
import type { ActivePaywall, PaywallUserContext, PreloadedPaywall, PresentationMode } from "./types.js";

export interface PaywallHostProps {
  activePaywalls: ActivePaywall[];
  preloadedPaywalls?: PreloadedPaywall[];
  user?: PaywallUserContext;
  locale?: string;
  onCTA: (active: ActivePaywall, product: ProductSpec) => void;
  onDismiss: (active: ActivePaywall) => void;
  onError: (active: ActivePaywall, error: Error) => void;
  onPreloadReady?: (preload: PreloadedPaywall) => void;
  onPreloadError?: (preload: PreloadedPaywall, error: Error) => void;
}

export function PaywallHost({
  activePaywalls,
  preloadedPaywalls = [],
  user,
  locale,
  onCTA,
  onDismiss,
  onError,
  onPreloadReady,
  onPreloadError,
}: PaywallHostProps) {
  return (
    <>
      {preloadedPaywalls.map((preload) => {
        const active = preload.active;
        return (
          <View
            key={preload.id}
            pointerEvents={active ? "auto" : "none"}
            importantForAccessibility={active ? "auto" : "no-hide-descendants"}
            style={preloadContainerStyle(preload.presentation, Boolean(active))}
          >
            {active && preload.presentation !== "inline" ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dismiss paywall backdrop"
                onPress={() => onDismiss(active)}
                style={backdropStyle(preload.presentation)}
              />
            ) : null}
            <View style={preloadFrameStyle(preload.presentation)}>
              {active && preload.presentation === "fullscreen" ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss paywall"
                  onPress={() => onDismiss(active)}
                  hitSlop={10}
                  style={fullscreenCloseStyle}
                >
                  <Text style={fullscreenCloseTextStyle}>×</Text>
                </Pressable>
              ) : null}
              <SpecRenderer
                spec={preload.placement.spec}
                user={user}
                locale={locale}
                onCTA={(product) => {
                  if (preload.active) onCTA(preload.active, product);
                }}
                onDismiss={() => {
                  if (preload.active) onDismiss(preload.active);
                }}
                onError={(error) => {
                  if (preload.active) {
                    onError(preload.active, error);
                  } else {
                    onPreloadError?.(preload, error);
                  }
                }}
                onReady={() => onPreloadReady?.(preload)}
                presentation={preload.presentation}
              />
            </View>
          </View>
        );
      })}
      {activePaywalls.map((active) => {
        const content = (
          <SpecRenderer
            spec={active.placement.spec}
            user={user}
            locale={locale}
            onCTA={(product) => onCTA(active, product)}
            onDismiss={() => onDismiss(active)}
            onError={(error) => onError(active, error)}
            presentation={active.presentation}
          />
        );

        if (active.presentation === "inline") {
          return <SpecRenderer key={active.id} spec={active.placement.spec} user={user} locale={locale} onCTA={(product) => onCTA(active, product)} onDismiss={() => onDismiss(active)} onError={(error) => onError(active, error)} presentation="inline" />;
        }

        if (active.presentation === "modal") {
          return (
            <ModalPresenter key={active.id} visible onDismiss={() => onDismiss(active)}>
              {content}
            </ModalPresenter>
          );
        }

        if (active.presentation === "fullscreen") {
          return (
            <ModalPresenter key={active.id} visible onDismiss={() => onDismiss(active)} fullscreen>
              {content}
            </ModalPresenter>
          );
        }

        return (
          <SheetPresenter key={active.id} visible onDismiss={() => onDismiss(active)}>
            {content}
          </SheetPresenter>
        );
      })}
    </>
  );
}

function preloadContainerStyle(presentation: PresentationMode, active: boolean) {
  const base = {
    bottom: 0,
    left: 0,
    opacity: active ? 1 : 0,
    overflow: "hidden" as const,
    pointerEvents: active ? "auto" : "none",
    position: "absolute" as const,
    right: 0,
    top: 0,
    zIndex: active ? 1000 : -1,
  };
  if (presentation === "inline") {
    return {
      ...base,
      bottom: undefined,
      height: 560,
      top: undefined,
    };
  }
  return {
    ...base,
    backgroundColor: active && presentation === "fullscreen" ? "#000" : "transparent",
    justifyContent: presentation === "sheet" ? "flex-end" as const : "center" as const,
    padding: presentation === "modal" ? 18 : 0,
  };
}

function preloadFrameStyle(presentation: PresentationMode) {
  if (presentation === "inline") {
    return { height: 560, width: "100%" };
  }
  if (presentation === "fullscreen") {
    return { flex: 1, width: "100%" };
  }
  if (presentation === "modal") {
    return { alignSelf: "center" as const, height: "90%", maxWidth: 440, width: "100%" };
  }
  return { height: "86%", padding: 12, width: "100%" };
}

function backdropStyle(presentation: PresentationMode) {
  return {
    backgroundColor: presentation === "sheet" ? "rgba(0, 0, 0, 0.45)" : "rgba(0, 0, 0, 0.5)",
    bottom: 0,
    left: 0,
    position: "absolute" as const,
    right: 0,
    top: 0,
  };
}

const fullscreenCloseStyle = {
  alignItems: "center" as const,
  backgroundColor: "transparent",
  borderRadius: 16,
  height: 32,
  justifyContent: "center" as const,
  left: 10,
  position: "absolute" as const,
  top: 10,
  width: 32,
  zIndex: 10,
};

const fullscreenCloseTextStyle = {
  color: "rgba(110, 103, 131, 0.72)",
  fontSize: 22,
  fontWeight: "300" as const,
  lineHeight: 24,
};
