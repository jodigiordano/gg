import { RuntimeFlow } from "@gg/spec";
import { SystemSimulator } from "./system.js";

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

    let routeIndex = (route.length - 1) * keyframeProgress;

    // TODO: support a "precise" option to obtain positions between 2 tiles.

    if (keyframeProgress < 0.5) {
      routeIndex = Math.floor(routeIndex);
    } else {
      routeIndex = Math.ceil(routeIndex);
    }

    return route[routeIndex] ?? [];
  });
}
