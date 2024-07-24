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

    const route = systemSimulator.getRoute(step.from, step.to);

    if (!route) {
      return [];
    }

    if (step.keyframe < keyframe) {
      return route.at(-1) ?? [];
    }

    const routeIndexRaw = (route.length - 1) * keyframeProgress;
    const routeIndex = Math.floor(routeIndexRaw);

    if (routeIndex >= route.length) {
      return [];
    }

    const routeIndexRemaining = routeIndexRaw - routeIndex;

    const position = route[routeIndex]!;
    const positionAfter = route[routeIndex + 1]!;

    if (!positionAfter) {
      return position;
    }

    const deltaX = positionAfter[0]! - position[0]!;
    const deltaY = positionAfter[1]! - position[1]!;

    return [
      position[0]! + deltaX * routeIndexRemaining,
      position[1]! + deltaY * routeIndexRemaining,
    ];
  });
}
