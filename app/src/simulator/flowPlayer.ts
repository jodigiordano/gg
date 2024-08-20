import {
  RuntimeFlow,
  SystemSimulator,
  getFlowTick,
  SimulatorObjectZIndex,
  RuntimeFlowStep,
} from "@gg/core";
import { Sprite } from "pixi.js";
import { spritesheet } from "../renderer/assets.js";
import { BlockSize } from "../helpers.js";
import { state } from "../state.js";

export default class FlowPlayer {
  private simulator: SystemSimulator;
  private maxKeyframes: number;
  private targetKeyframe: number;
  private currentKeyframe: number;
  private sprites: Sprite[];
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

    this.sprites = flow.steps.map(() => {
      const sprite = new Sprite(spritesheet.textures.data);

      sprite.zIndex = SimulatorObjectZIndex.LinkTitleContainer - 1;
      sprite.width = BlockSize;
      sprite.height = BlockSize;
      sprite.visible = false;

      return sprite;
    });
  }

  hide(): void {
    for (const sprite of this.sprites) {
      sprite.visible = false;
    }
  }

  getObjectsToRender(): Sprite[] {
    return this.sprites;
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

  getStepAt(worldX: number, worldY: number): RuntimeFlowStep | null {
    const data = this.getTickData();
    const boundaries = this.simulator.getBoundaries();

    for (let i = 0; i < data.length; i++) {
      if (data[i].length) {
        const x = Math.floor(data[i][0]) - boundaries.translateX;
        const y = Math.floor(data[i][1]) - boundaries.translateY;

        if (x === worldX && y === worldY) {
          return this.flow.steps[i];
        }
      }
    }

    return null;
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
    const data = this.getTickData();
    const boundaries = this.simulator.getBoundaries();

    for (let i = 0; i < data.length; i++) {
      if (data[i].length) {
        this.sprites[i].tint =
          this.flow.steps[i].dataBackgroundColor ?? "0de500";

        this.sprites[i].x = (data[i][0] - boundaries.translateX) * BlockSize;
        this.sprites[i].y = (data[i][1] - boundaries.translateY) * BlockSize;
        this.sprites[i].visible = true;
      } else {
        this.sprites[i].visible = false;
      }
    }
  }

  private getTickData(): number[][] {
    const keyframe = this.currentKeyframe | 0;
    const keyframeProgress = this.currentKeyframe - keyframe;

    return getFlowTick(
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
  }
}
