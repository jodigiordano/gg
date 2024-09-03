import { load, PathPattern, SystemSimulator } from "@gg/core";
import FlowPlayer from "./simulator/flowPlayer.js";
import Operation from "./operation.js";
import moveOperation from "./operations/move.js";
import { getUrlParams } from "./persistence.js";
import { getThemeOnLoad } from "./theme.js";

export interface State {
  changes: string[];
  changeIndex: number;
  operation: Operation;
  x: number;
  y: number;
  preciseX: number;
  preciseY: number;
  simulator: SystemSimulator;
  simulatorInitialized: boolean;
  flowPlayer: FlowPlayer | null;
  flowKeyframe: number;
  flowPlay: boolean;
  flowPlayMode: "playOne" | "repeatAll" | "repeatOne";
  flowSpeed: number;
  linkPattern: PathPattern;
  theme: "light" | "dark";
  zoomControls: boolean;
  flowControls: boolean;
  editorButton: boolean;
  profile: {
    authenticated: boolean;
    readOnly: boolean;
  };
}

const defaultSystem = load({ specificationVersion: "1.0.0", title: "" }).system;

const defaultSimulator = new SystemSimulator({ system: defaultSystem });

defaultSimulator.compute();

const defaultOperation = moveOperation;

const urlParams = getUrlParams();

export const state: State = {
  changes: [],
  changeIndex: -1,
  operation: defaultOperation,
  x: -999999,
  y: -999999,
  preciseX: -999999,
  preciseY: -999999,
  simulator: defaultSimulator,
  simulatorInitialized: false,
  flowPlayer: null,
  flowKeyframe: 0,
  flowPlay: urlParams.autoplay,
  flowPlayMode: "repeatAll",
  flowSpeed: urlParams.speed,
  linkPattern: "pipe",
  theme: getThemeOnLoad(),
  zoomControls: urlParams.zoomControls,
  flowControls: urlParams.flowControls,
  editorButton: urlParams.editorButton,
  profile: {
    authenticated: false,
    readOnly: true,
  },
};

defaultOperation.onBegin(state);

export function pushChange(change: string) {
  // A same change cannot be pushed multiple times consecutively.
  if (change === state.changes[state.changeIndex]) {
    return;
  }

  state.changes.splice(state.changeIndex + 1, state.changes.length, change);
  state.changeIndex = state.changes.length - 1;
}

export function resetState(): void {
  state.changes.length = 0;
  state.changeIndex = -1;

  state.operation.onEnd(state);
  defaultOperation.onBegin(state);

  state.flowPlay = false;
  state.flowKeyframe = 0;
}
