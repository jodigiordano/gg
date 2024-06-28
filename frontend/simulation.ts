import { Application, Sprite, Graphics, RenderTexture, Text } from "pixi.js";
import { RuntimeFlow, RuntimeSystem } from "@dataflows/spec";
import {
  SystemSimulator,
  FlowSimulator,
  SimulatorObjectType,
  SimulatorSystemTitle,
  SimulatorWhiteBox,
} from "@dataflows/simulator";
import { BlockSize } from "./consts.js";

export interface CanvasSimulatorTextures {
  whiteboxA: RenderTexture;
  whiteboxB: RenderTexture;
  blackbox: RenderTexture;
  link: RenderTexture;
  freeSpace: RenderTexture;
}

export function generateCanvasSimulatorTextures(
  app: Application,
): CanvasSimulatorTextures {
  // Whitebox A
  const whiteboxAGraphic = new Graphics()
    .beginFill(0xc0c0c0)
    .drawRect(0, 0, BlockSize, BlockSize)
    .endFill();

  const whiteboxA = app.renderer.generateTexture(whiteboxAGraphic);

  // Whitebox B
  const whiteboxBGraphic = new Graphics()
    .beginFill(0xa0a0a0)
    .drawRect(0, 0, BlockSize, BlockSize)
    .endFill();

  const whiteboxB = app.renderer.generateTexture(whiteboxBGraphic);

  // Blackbox.
  const blackboxGraphic = new Graphics()
    .beginFill(0x000000)
    .drawRect(0, 0, BlockSize, BlockSize)
    .endFill();

  const blackbox = app.renderer.generateTexture(blackboxGraphic);

  // Link.
  const linkGraphic = new Graphics()
    .beginFill(0xff0000)
    .drawRect(0, 0, BlockSize, BlockSize)
    .endFill();

  const link = app.renderer.generateTexture(linkGraphic);

  // Free space.
  const freeSpaceGraphic = new Graphics()
    .beginFill(0x0000ff)
    .drawRect(0, 0, BlockSize, BlockSize)
    .endFill();

  const freeSpace = app.renderer.generateTexture(freeSpaceGraphic);

  return {
    whiteboxA,
    whiteboxB,
    blackbox,
    link,
    freeSpace,
  };
}

export class CanvasSimulator {
  public system: RuntimeSystem;
  public systemSimulator: SystemSimulator;

  constructor(system: RuntimeSystem) {
    this.system = system;
    this.systemSimulator = new SystemSimulator(system);
  }

  getVisibleBoundaries() {
    const visibleBoundaries = this.systemSimulator.getVisibleWorldBoundaries();

    return {
      left: visibleBoundaries.left * BlockSize,
      right: visibleBoundaries.right * BlockSize,
      top: visibleBoundaries.top * BlockSize,
      bottom: visibleBoundaries.bottom * BlockSize,
    };
  }

  getObjectsToRender(textures: CanvasSimulatorTextures): (Sprite | Text)[] {
    const toDraw: (Sprite | Text)[] = [];
    const layout = this.systemSimulator.getLayout();
    const boundaries = this.systemSimulator.getBoundaries();

    for (let i = 0; i < boundaries.width; i++) {
      for (let j = 0; j < boundaries.height; j++) {
        for (const obj of layout[i]![j]!) {
          if (obj.type === SimulatorObjectType.WhiteBox) {
            const { system } = obj as SimulatorWhiteBox;

            const sprite = new Sprite(
              system.depth % 2 === 0 ? textures.whiteboxA : textures.whiteboxB,
            );

            sprite.x = (i - boundaries.translateX) * BlockSize;
            sprite.y = (j - boundaries.translateY) * BlockSize;

            toDraw.push(sprite);
          } else if (obj.type === SimulatorObjectType.BlackBox) {
            const sprite = new Sprite(textures.blackbox);

            sprite.x = (i - boundaries.translateX) * BlockSize;
            sprite.y = (j - boundaries.translateY) * BlockSize;

            toDraw.push(sprite);
          } else if (obj.type === SimulatorObjectType.Link) {
            const sprite = new Sprite(textures.link);

            sprite.x = (i - boundaries.translateX) * BlockSize;
            sprite.y = (j - boundaries.translateY) * BlockSize;

            toDraw.push(sprite);
          } else if (obj.type === SimulatorObjectType.SystemTitle) {
            const title = new Text((obj as SimulatorSystemTitle).chars, {
              fontFamily: "Ibm",
              fontSize: BlockSize,
            });

            title.x = (i - boundaries.translateX) * BlockSize;
            title.y = (j - boundaries.translateY) * BlockSize;

            title.style.fill = "0xffffff";
            title.resolution = 2;

            toDraw.push(title);
          }
        }
      }
    }

    return toDraw;
  }

  createFlowPlayer(app: Application, flowIndex: number): CanvasFlowPlayer {
    const dataGraphic = new Graphics()
      .beginFill(0x00ff00)
      .drawRect(0, 0, BlockSize, BlockSize)
      .endFill();

    const dataTexture = app.renderer.generateTexture(dataGraphic);

    return new CanvasFlowPlayer(
      this.systemSimulator,
      this.system.flows.find(flow => flow.index === flowIndex)!,
      dataTexture,
    );
  }
}

export class CanvasFlowPlayer {
  private simulator: SystemSimulator;
  private flowSimulator: FlowSimulator;
  private maxKeyframes: number;
  private currentKeyframe: number;
  private currentKeyframeProgress: number;
  private sprites: Sprite[];

  constructor(
    simulator: SystemSimulator,
    flow: RuntimeFlow,
    dataTexture: RenderTexture,
  ) {
    this.simulator = simulator;
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

    const boundaries = this.simulator.getBoundaries();

    for (let i = 0; i < data.length; i++) {
      this.sprites[i].x = (data[i][0] - boundaries.translateX) * BlockSize;
      this.sprites[i].y = (data[i][1] - boundaries.translateY) * BlockSize;
    }
  }
}
