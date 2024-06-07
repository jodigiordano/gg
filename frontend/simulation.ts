import { Application, Sprite, Graphics, RenderTexture, Text } from "pixi.js";
import {
  RuntimeFlow,
  RuntimeLimits,
  RuntimeLink,
  RuntimeSubsystem,
  RuntimeSystem,
} from "@dataflows/spec";
import {
  SystemSimulator,
  FlowSimulator,
  SimulatorObjectType,
  SimulatorSystemTitle,
  SimulatorObject,
} from "@dataflows/simulator";
import { BlockSize } from "./consts.js";

export interface CanvasSimulatorTextures {
  whitebox: RenderTexture;
  blackbox: RenderTexture;
  link: RenderTexture;
}

export function generateCanvasSimulatorTextures(
  app: Application,
): CanvasSimulatorTextures {
  // Whitebox
  const whiteboxGraphic = new Graphics()
    .beginFill(0xc0c0c0)
    .drawRect(0, 0, BlockSize, BlockSize)
    .endFill();

  const whitebox = app.renderer.generateTexture(whiteboxGraphic);

  // Blackbox
  const blackboxGraphic = new Graphics()
    .beginFill(0x000000)
    .drawRect(0, 0, BlockSize, BlockSize)
    .endFill();

  const blackbox = app.renderer.generateTexture(blackboxGraphic);

  // Link
  const linkGraphic = new Graphics()
    .beginFill(0xff0000)
    .drawRect(0, 0, BlockSize, BlockSize)
    .endFill();

  const link = app.renderer.generateTexture(linkGraphic);

  return {
    whitebox,
    blackbox,
    link,
  };
}

export class CanvasSimulator {
  public system: RuntimeSystem;
  private systemSimulator: SystemSimulator;

  constructor(system: RuntimeSystem) {
    this.system = system;
    this.systemSimulator = new SystemSimulator(system);
  }

  getBoundaries() {
    const systemBoundaries = this.systemSimulator.getBoundaries();

    return {
      left: systemBoundaries.left * BlockSize,
      right: systemBoundaries.right * BlockSize,
      top: systemBoundaries.top * BlockSize,
      bottom: systemBoundaries.bottom * BlockSize,
    };
  }

  getObjectsAt(x: number, y: number): SimulatorObject[] {
    const layout = this.systemSimulator.getLayout();

    return layout[x]?.[y] ?? [];
  }

  getSubsystemAt(x: number, y: number): RuntimeSubsystem | null {
    const objects = this.getObjectsAt(x, y);

    const object = objects
      .reverse()
      .find(
        obj =>
          obj.type === SimulatorObjectType.BlackBox ||
          obj.type === SimulatorObjectType.WhiteBox,
      );

    if (object && "system" in object) {
      return object.system as RuntimeSubsystem;
    }

    return null;
  }

  getLinkAt(x: number, y: number): RuntimeLink | null {
    const objects = this.getObjectsAt(x, y);

    const object = objects
      .reverse()
      .find(obj => obj.type === SimulatorObjectType.Link);

    if (object && "link" in object) {
      return object.link as RuntimeLink;
    }

    return null;
  }



  getObjectsToRender(textures: CanvasSimulatorTextures): (Sprite | Text)[] {
    const toDraw: (Sprite | Text)[] = [];
    const layout = this.systemSimulator.getLayout();

    for (let i = 0; i < RuntimeLimits.MaxSystemWidth; i++) {
      for (let j = 0; j < RuntimeLimits.MaxSystemHeight; j++) {
        for (const obj of layout[i]![j]!) {
          if (obj.type === SimulatorObjectType.WhiteBox) {
            const sprite = new Sprite(textures.whitebox);

            sprite.x = i * BlockSize;
            sprite.y = j * BlockSize;

            toDraw.push(sprite);
          } else if (obj.type === SimulatorObjectType.BlackBox) {
            const sprite = new Sprite(textures.blackbox);

            sprite.x = i * BlockSize;
            sprite.y = j * BlockSize;

            toDraw.push(sprite);
          } else if (obj.type === SimulatorObjectType.Link) {
            const sprite = new Sprite(textures.link);

            sprite.x = i * BlockSize;
            sprite.y = j * BlockSize;

            toDraw.push(sprite);
          } else if (obj.type === SimulatorObjectType.SystemTitle) {
            const title = new Text((obj as SimulatorSystemTitle).chars, {
              fontFamily: "Ibm",
              fontSize: BlockSize,
            });

            title.x = i * BlockSize;
            title.y = j * BlockSize;
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
