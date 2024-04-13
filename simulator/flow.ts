import { RuntimeFlow } from "@dataflows/spec";
import { SystemSimulator } from "./system";

export interface FlowSimulatorTickOptions {
  keyframe: number;
  keyframeProgress: number;
}

// TODO: doesn't need to be an instanciable class.

export class FlowSimulator {
  private systemSimulator: SystemSimulator;
  private flow: RuntimeFlow;

  constructor(systemSimulator: SystemSimulator, flow: RuntimeFlow) {
    this.systemSimulator = systemSimulator;
    this.flow = flow;
  }

  tick(options: FlowSimulatorTickOptions): number[][] {
    return this.flow.steps.map(step => {
      if (step.keyframe > options.keyframe) {
        return [];
      }

      const route = this.systemSimulator.getRoute(
        step.fromComponentName,
        step.toComponentName,
      );

      if (!route) {
        return [];
      }

      if (step.keyframe < options.keyframe) {
        return route.at(-1) ?? [];
      }

      const routeIndex = (route.length - 1) * options.keyframeProgress;

      // TODO: support a "precise" option to obtain positions between 2 tiles.

      return route[Math.floor(routeIndex)] ?? [];
    });
  }
}