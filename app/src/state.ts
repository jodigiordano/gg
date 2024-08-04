// @ts-ignore
import { Viewport } from "pixi-viewport";
import { load, SystemSimulator } from "@gg/core";
import FlowPlayer from "./flowPlayer.js";
import Operation from "./operation.js";
import MoveSystemOperation from "./operations/systemMove.js";
import { getUrlParams } from "./persistence.js";

export interface State {
  changes: string[];
  changeIndex: number;
  operation: Operation;
  x: number;
  y: number;
  simulator: SystemSimulator;
  simulatorInstance: number;
  simulatorNextInstance: number;
  flowPlayer: FlowPlayer | null;
  flowKeyframe: number;
  flowPlay: boolean;
  flowPlayMode: "playOne" | "repeatAll" | "repeatOne";
  flowSpeed: number;
}

const defaultSystem = load({ specificationVersion: "1.0.0", title: "" }).system;

const defaultSimulator = new SystemSimulator({ system: defaultSystem });

defaultSimulator.compute();

const defaultOperation = MoveSystemOperation;

const urlParams = getUrlParams();

export const state: State = {
  changes: [],
  changeIndex: -1,
  operation: defaultOperation,
  x: -999999,
  y: -999999,
  simulator: defaultSimulator,
  simulatorInstance: 0,
  simulatorNextInstance: 0,
  flowPlayer: null,
  flowKeyframe: 0,
  flowPlay: urlParams.autoplay,
  flowPlayMode: "repeatAll",
  flowSpeed: urlParams.speed,
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
