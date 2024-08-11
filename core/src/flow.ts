import { RuntimeFlow } from "./runtime.js";
import { SystemSimulator } from "./simulator.js";

export interface FlowSimulatorTickOptions {
  keyframe: number;
  keyframeProgress: number;
}

export function getFlowTick(
  systemSimulator: SystemSimulator,
  flow: RuntimeFlow,
  keyframe: number,
  keyframeProgress: number,
): number[][] {
  return flow.steps.map(step => {
    if (step.keyframe !== keyframe) {
      return [];
    }

    const path = systemSimulator.getPath(step.from, step.to);

    if (!path) {
      return [];
    }

    if (step.keyframe < keyframe) {
      return path.at(-1) ?? [];
    }

    const pathIndexRaw = (path.length - 1) * keyframeProgress;
    const pathIndex = Math.floor(pathIndexRaw);

    if (pathIndex >= path.length) {
      return [];
    }

    const position = path[pathIndex];

    if (!position) {
      return [];
    }

    const positionAfter = path[pathIndex + 1];

    if (!positionAfter) {
      return position;
    }

    const deltaX = positionAfter[0]! - position[0]!;
    const deltaY = positionAfter[1]! - position[1]!;

    const pathIndexRemaining = pathIndexRaw - pathIndex;

    return [
      position[0]! + deltaX * pathIndexRemaining,
      position[1]! + deltaY * pathIndexRemaining,
    ];
  });
}
