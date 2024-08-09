import { RuntimeFlow, SystemSimulator, getFlowTick } from "@gg/core";
import { state } from "../state.js";
import { drawFlowTick } from "../renderer/api.js";

export default class FlowPlayer {
  private simulator: SystemSimulator;
  private maxKeyframes: number;
  private targetKeyframe: number;
  private currentKeyframe: number;
  private flow: RuntimeFlow;

  constructor(
    simulator: SystemSimulator,
    flow: RuntimeFlow,
    targetKeyframe: number,
  ) {
    this.simulator = simulator;
    this.flow = flow;

    this.targetKeyframe = targetKeyframe;
    this.currentKeyframe = targetKeyframe;

    this.maxKeyframes =
      Math.max(0, ...flow.steps.map(step => step.keyframe)) + 1;
  }

  getTargetKeyframe(): number {
    return this.targetKeyframe;
  }

  setTargetKeyframe(keyframe: number): void {
    this.targetKeyframe = keyframe;
  }

  getKeyframe(): number {
    return this.currentKeyframe;
  }

  setKeyframe(keyframe: number): void {
    this.currentKeyframe = keyframe;
  }

  update(
    deltaTime: number,
    mode: typeof state.flowPlayMode,
    speed: number,
  ): void {
    const beforeTickKeyframe = this.currentKeyframe | 0;

    this.currentKeyframe += (speed / 100) * deltaTime;

    if (
      mode === "repeatOne" &&
      (this.currentKeyframe | 0) != beforeTickKeyframe
    ) {
      this.currentKeyframe -= 1;
    } else if (mode === "repeatAll") {
      this.currentKeyframe %= this.maxKeyframes;
    } else if (
      mode === "playOne" &&
      this.currentKeyframe > this.targetKeyframe
    ) {
      this.currentKeyframe = this.targetKeyframe;
    }
  }

  draw(): void {
    const keyframe = this.currentKeyframe | 0;
    const keyframeProgress = this.currentKeyframe - keyframe;

    const data = getFlowTick(
      this.simulator,
      this.flow,
      keyframe,
      // easeInOutQuart
      keyframeProgress < 0.5
        ? 8 *
            keyframeProgress *
            keyframeProgress *
            keyframeProgress *
            keyframeProgress
        : 1 - Math.pow(-2 * keyframeProgress + 2, 4) / 2,
    );

    const boundaries = this.simulator.getBoundaries();

    drawFlowTick(data, boundaries);
  }
}