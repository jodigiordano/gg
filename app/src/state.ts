import { load, SystemSimulator } from "@gg/core";
import { getUrlParams } from "./persistence.js";
import { getThemeOnLoad } from "./theme.js";

export interface State {
  changes: string[];
  changeIndex: number;
  x: number;
  y: number;
  preciseX: number;
  preciseY: number;
  simulator: SystemSimulator;
  simulatorInitialized: boolean;
  theme: "light" | "dark";
  zoomControls: boolean;
  editorButton: boolean;
  profile: {
    authenticated: boolean;
    readOnly: boolean;
  };
}

const defaultSystem = load({ specificationVersion: "1.0.0", title: "" }).system;

const defaultSimulator = new SystemSimulator({ system: defaultSystem });

defaultSimulator.compute();

const urlParams = getUrlParams();

export const state: State = {
  changes: [],
  changeIndex: -1,
  x: -999999,
  y: -999999,
  preciseX: -999999,
  preciseY: -999999,
  simulator: defaultSimulator,
  simulatorInitialized: false,
  theme: getThemeOnLoad(),
  zoomControls: urlParams.zoomControls,
  editorButton: urlParams.editorButton,
  profile: {
    authenticated: false,
    readOnly: true,
  },
};

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
}
