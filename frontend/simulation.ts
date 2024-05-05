import { Application, Sprite, Graphics, RenderTexture } from "pixi.js";
import { loadYaml, RuntimeFlow, RuntimeLimits } from "@dataflows/spec";
import {
  SystemSimulator,
  FlowSimulator,
  SimulatorObjectType,
} from "@dataflows/simulator";
import { BlockSize } from "./consts.js";

const yaml = `
specificationVersion: 1.0.0
title: dataflows
description: Tool to build beautiful software system designs
systems:
  - id: frontend
    description: Web-based client
    position:
      x: 2
      y: 2
  - id: backend
    description: Backend of the frontend
    position:
      x: 17
      y: 7
    systems:
      - id: server
        description: RESTful HTTP API of the backend
        position:
          x: 0
          y: 0
      - id: database
        description: Database of the backend
        position:
          x: 10
          y: 2
  - id: whatever
    position:
      x: 0
      y: 14
  - id: datadog
    position:
      x: 15
      y: 30
  - id: whatever2
    position:
      x: 50
      y: 20
links:
  - a: frontend
    b: backend.server
  - a: frontend
    b: whatever
  - a: datadog
    b: backend.server
  - a: backend.server
    b: backend.database
  - a: whatever
    b: backend.database
  - a: frontend
    b: backend.database
  - a: whatever
    b: backend.server
  - a: whatever2
    b: backend.server
flows:
  - steps:
    - from: frontend
      to: backend.server
      data: form data
      keyframe: 0
    - from: backend.server
      to: datadog
      data: log
      keyframe: 1
    - from: backend.server
      to: backend.database
      data: user
      keyframe: 1
`;

const { system } = loadYaml(yaml);
const simulator = new SystemSimulator(system);

export function getSystemBoundaries(): {
  left: number;
  top: number;
  right: number;
  bottom: number;
} {
  let left = RuntimeLimits.MaxSystemWidth;
  let right = 0;
  let top = RuntimeLimits.MaxSystemHeight;
  let bottom = 0;

  for (let i = 0; i < RuntimeLimits.MaxSystemWidth; i++) {
    for (let j = 0; j < RuntimeLimits.MaxSystemHeight; j++) {
      if (!simulator.layout[i]![j]!.length) {
        continue;
      }

      if (i < left) {
        left = i;
      }

      if (i > right) {
        right = i;
      }

      if (j < top) {
        top = j;
      }

      if (j > bottom) {
        bottom = j;
      }
    }
  }

  return {
    left: left * BlockSize,
    right: right * BlockSize,
    top: top * BlockSize,
    bottom: bottom * BlockSize,
  };
}

export function getObjectsToRender(
  app: Application,
  center: { x: number; y: number },
): Sprite[] {
  // Whitebox
  const whiteboxGraphic = new Graphics()
    .beginFill(0xffffff)
    .drawRect(0, 0, BlockSize, BlockSize)
    .endFill();

  const whiteboxTexture = app.renderer.generateTexture(whiteboxGraphic);

  // Blackbox
  const blackboxGraphic = new Graphics()
    .beginFill(0x000000)
    .drawRect(0, 0, BlockSize, BlockSize)
    .endFill();

  const blackboxTexture = app.renderer.generateTexture(blackboxGraphic);

  const linkGraphic = new Graphics()
    .beginFill(0xff0000)
    .drawRect(0, 0, BlockSize, BlockSize)
    .endFill();

  const linkTexture = app.renderer.generateTexture(linkGraphic);

  const toDraw: Sprite[] = [];

  for (let i = 0; i < RuntimeLimits.MaxSystemWidth; i++) {
    for (let j = 0; j < RuntimeLimits.MaxSystemHeight; j++) {
      for (const obj of simulator.layout[i]![j]!) {
        if (obj.type === SimulatorObjectType.WhiteBox) {
          const sprite = new Sprite(whiteboxTexture);

          sprite.x = center.x + i * BlockSize;
          sprite.y = center.y + j * BlockSize;

          toDraw.push(sprite);
        } else if (obj.type === SimulatorObjectType.BlackBox) {
          const sprite = new Sprite(blackboxTexture);

          sprite.x = center.x + i * BlockSize;
          sprite.y = center.y + j * BlockSize;

          toDraw.push(sprite);
        } else if (obj.type === SimulatorObjectType.Link) {
          const sprite = new Sprite(linkTexture);

          sprite.x = center.x + i * BlockSize;
          sprite.y = center.y + j * BlockSize;

          toDraw.push(sprite);
        }
      }
    }
  }

  return toDraw;
}

class FlowPlayer {
  private flowSimulator: FlowSimulator;
  private maxKeyframes: number;
  private currentKeyframe: number;
  private currentKeyframeProgress: number;
  private sprites: Sprite[];

  constructor(flow: RuntimeFlow, dataTexture: RenderTexture) {
    this.flowSimulator = new FlowSimulator(simulator, flow);

    this.currentKeyframe = 0;
    this.currentKeyframeProgress = 0;

    // @ts-ignore FIXME
    this.maxKeyframes = Math.max(...flow.steps.map(step => step.keyframe)) + 1;

    // @ts-ignore FIXME
    this.sprites = flow.steps.map(() => new Sprite(dataTexture));
  }

  getObjectsToRender(): Sprite[] {
    return this.sprites;
  }

  update(deltaTime: number): void {
    this.currentKeyframeProgress += 0.01 * deltaTime;

    if (this.currentKeyframeProgress > 1) {
      this.currentKeyframeProgress %= 1;
      this.currentKeyframe += 1;
    }

    this.currentKeyframe %= this.maxKeyframes;

    const data = this.flowSimulator.tick({
      keyframe: this.currentKeyframe,
      keyframeProgress: this.currentKeyframeProgress,
    });

    for (let i = 0; i < data.length; i++) {
      this.sprites[i].x = data[i][0] * BlockSize;
      this.sprites[i].y = data[i][1] * BlockSize;
    }
  }
}

export function createFlowPlayer(
  app: Application,
  flowIndex: number,
): FlowPlayer {
  const dataGraphic = new Graphics()
    .beginFill(0x00ff00)
    .drawRect(0, 0, BlockSize, BlockSize)
    .endFill();

  const dataTexture = app.renderer.generateTexture(dataGraphic);

  return new FlowPlayer(
    system.flows.find(flow => flow.index === flowIndex)!,
    dataTexture,
  );
}
