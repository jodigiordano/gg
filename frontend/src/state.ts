// @ts-ignore
import { Viewport } from "pixi-viewport";
import { RuntimeSystem, loadYaml } from "@gg/spec";
import { SystemSimulator } from "@gg/simulator";
import { CanvasFlowPlayer } from "./simulation.js";
import Operation from "./operation.js";
import MoveSystemOperation from "./operations/systemMove.js";

export interface State {
  changes: string[];
  changeIndex: number;
  operation: Operation;
  x: number;
  y: number;
  system: RuntimeSystem;
  simulator: SystemSimulator;
  canvasFlowPlayer: CanvasFlowPlayer | null;
}

const defaultSystem = loadYaml('specificationVersion: 1.0.0\ntitle: ""').system;

const defaultOperation = MoveSystemOperation;

export const state: State = {
  changes: [],
  changeIndex: -1,
  operation: defaultOperation,
  x: -999999,
  y: -999999,
  system: defaultSystem,
  simulator: new SystemSimulator(defaultSystem),
  canvasFlowPlayer: null,
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
}
