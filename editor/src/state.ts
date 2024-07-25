// @ts-ignore
import { Viewport } from "pixi-viewport";
import { RuntimeSystem, loadYaml, SystemSimulator } from "@gg/core";
import { FlowPlayer } from "./simulation.js";
import Operation from "./operation.js";
import MoveSystemOperation from "./operations/systemMove.js";
import { getUrlParams } from "./persistence.js";

export interface State {
  changes: string[];
  changeIndex: number;
  operation: Operation;
  x: number;
  y: number;
  system: RuntimeSystem;
  simulator: SystemSimulator;
  flowPlayer: FlowPlayer | null;
  flowKeyframe: number;
  flowPlay: boolean;
  flowPlayMode: "one" | "all";
}

const defaultSystem = loadYaml('specificationVersion: 1.0.0\ntitle: ""').system;

const defaultOperation = MoveSystemOperation;

const urlParams = getUrlParams();

export const state: State = {
  changes: [],
  changeIndex: -1,
  operation: defaultOperation,
  x: -999999,
  y: -999999,
  system: defaultSystem,
  simulator: new SystemSimulator(defaultSystem),
  flowPlayer: null,
  flowKeyframe: 0,
  flowPlay: urlParams.autoplay ? urlParams.autoplay === "true" : false,
  flowPlayMode: "all",
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

  state.flowKeyframe = 0;
}
