export type {
  PaywallSpec,
  ProductSpec,
  AssetManifest,
  PaywallLocalization,
} from "./spec.js";

export {
  extractLocalizationTokens,
  extractRelativeAssetReferences,
  localizeHtml,
  resolveLocalizedStrings,
  validateLocalizationCoverage,
  type LocalizationIssue,
  type LocalizationValidationResult,
} from "./localization.js";

export type {
  PlatformAdapter,
  PlatformMetadata,
} from "./adapter.js";

export type {
  PlacementConfig,
  ConfigResponse,
} from "./config.js";

export type {
  TranzmitIdentity,
  ConfigRequest,
  IdentityStorage,
} from "./identity.js";

export {
  resolveIdentity,
  stableJson,
  hashString,
} from "./identity.js";

export {
  PaywallIntegrityError,
  assertDocumentIntegrity,
  sha256Integrity,
  verifyDocumentIntegrity,
} from "./integrity.js";

export type {
  TranzmitEvent,
  EventBatch,
  EventName,
} from "./events.js";

export {
  DurableTelemetryQueue,
  TelemetryQueueError,
  deterministicReplaySample,
  exposureContextFromPlacement,
  generateUuid,
  hasExactExposureLinkage,
  sanitizeTelemetryProperties,
  type ExposureContext,
  type CheckoutOutcomeStatus,
  type ExposureOutcomeInput,
  type QueuedTelemetryEvent,
  type SemanticPaywallEventName,
  type TelemetryBatch,
  type TelemetryEventInput,
} from "./telemetry.js";

export {
  parseSemanticBridgeMessage,
  type BridgeExpectation,
  type SemanticBridgeEvent,
} from "./semantic-bridge.js";

export {
  DEFAULT_API_BASE_URL,
  DEFAULT_FALLBACK_API_BASE_URLS,
  LEGACY_API_BASE_URL,
  createTranzmitClient,
  makeError,
  resolveApiBaseUrl,
  resolveApiBaseUrls,
  validatePublicKey,
  type InitConfig,
  type SharedClient,
  type TranzmitError,
} from "./client.js";
