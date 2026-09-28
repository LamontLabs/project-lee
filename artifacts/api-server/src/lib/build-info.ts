import { EVENT_LOG_VERIFIER_VERSION } from "./event-log-continuity";

declare const __LEE_BUILD_ID__: string | undefined;

export const API_BUILD_ID = typeof __LEE_BUILD_ID__ === "string"
  ? __LEE_BUILD_ID__
  : "development-unbuilt";

export { EVENT_LOG_VERIFIER_VERSION };