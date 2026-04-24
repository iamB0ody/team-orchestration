// Placeholder smoke test — ensures the shared-types package compiles and
// exports can be imported. Real tests live in consuming libs (libs/core).

import type {
  MissionRegistryRow,
  MissionState,
  SessionTokens,
  WorkspaceInfo,
} from "./index.ts";

function _never(): MissionRegistryRow | MissionState | SessionTokens | WorkspaceInfo {
  throw new Error("unreachable");
}

export { _never };
