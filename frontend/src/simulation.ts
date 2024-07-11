import { RuntimeFlow, RuntimeSystem } from "@gg/spec";
import {
  SystemSimulator,
  FlowSimulator,
  SimulatorObjectType,
  SimulatorSystemTitle,
  SimulatorSubsystem,
  SimulatorLinkDirectionType,
  SimulatorLink,
  SimulatorSystemDirectionType,
} from "@gg/simulator";
import {
  Application,
  Sprite,
  Graphics,
  RenderTexture,
  Text,
  Spritesheet,
  SCALE_MODES,
} from "./pixi.js";
import { BlockSize } from "./consts.js";

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

  getObjectsToRender(spritesheet: Spritesheet): (Sprite | Text)[] {
    const toDraw: (Sprite | Text)[] = [];
    const layout = this.systemSimulator.getLayout();
    const boundaries = this.systemSimulator.getBoundaries();

    for (let i = 0; i < boundaries.width; i++) {
      for (let j = 0; j < boundaries.height; j++) {
        for (const obj of layout[i]![j]!) {
          if (obj.type === SimulatorObjectType.System) {
            const sprite = new Sprite();

            sprite.x = (i - boundaries.translateX) * BlockSize;
            sprite.y = (j - boundaries.translateY) * BlockSize;
            sprite.width = BlockSize;
            sprite.height = BlockSize;

            const { system, blackbox, direction } = obj as SimulatorSubsystem;

            sprite.tint = blackbox
              ? "3d348b"
              : system.depth % 2 === 0
                ? "f18701"
                : system.depth % 3 === 0
                  ? "f35b04"
                  : "f7b801";

            if (direction === SimulatorSystemDirectionType.TopLeft) {
              sprite.texture = spritesheet.textures.systemTopLeft;
            } else if (direction === SimulatorSystemDirectionType.TopCenter) {
              sprite.texture = spritesheet.textures.systemTopCenter;
            } else if (direction === SimulatorSystemDirectionType.TopRight) {
              sprite.texture = spritesheet.textures.systemTopRight;
            } else if (direction === SimulatorSystemDirectionType.CenterLeft) {
              sprite.texture = spritesheet.textures.systemCenterLeft;
            } else if (direction === SimulatorSystemDirectionType.CenterRight) {
              sprite.texture = spritesheet.textures.systemCenterRight;
            } else if (direction === SimulatorSystemDirectionType.BottomLeft) {
              sprite.texture = spritesheet.textures.systemBottomLeft;
            } else if (
              direction === SimulatorSystemDirectionType.BottomCenter
            ) {
              sprite.texture = spritesheet.textures.systemBottomCenter;
            } else if (direction === SimulatorSystemDirectionType.BottomRight) {
              sprite.texture = spritesheet.textures.systemBottomRight;
            } else {
              // CenterCenter
              sprite.texture = spritesheet.textures.systemCenterCenter;
            }

            toDraw.push(sprite);
          } else if (obj.type === SimulatorObjectType.Link) {
            const sprite = new Sprite();

            sprite.x = (i - boundaries.translateX) * BlockSize + BlockSize / 2;
            sprite.y = (j - boundaries.translateY) * BlockSize + BlockSize / 2;
            sprite.width = BlockSize;
            sprite.height = BlockSize;
            sprite.anchor.x = 0.5;
            sprite.anchor.y = 0.5;

            const { direction } = obj as SimulatorLink;

            if (direction === SimulatorLinkDirectionType.Horizontal) {
              sprite.texture = spritesheet.textures.link;
              sprite.rotation = -Math.PI / 2;
            } else if (direction === SimulatorLinkDirectionType.TopToLeft) {
              sprite.texture = spritesheet.textures.linkCorner;
              sprite.rotation = -Math.PI / 2;
            } else if (direction === SimulatorLinkDirectionType.TopToRight) {
              sprite.texture = spritesheet.textures.linkCorner;
            } else if (direction === SimulatorLinkDirectionType.BottomToLeft) {
              sprite.texture = spritesheet.textures.linkCorner;
              sprite.rotation = Math.PI;
            } else if (direction === SimulatorLinkDirectionType.BottomToRight) {
              sprite.texture = spritesheet.textures.linkCorner;
              sprite.rotation = Math.PI / 2;
            } else {
              // Vertical.
              sprite.texture = spritesheet.textures.link;
            }

            toDraw.push(sprite);
          } else if (obj.type === SimulatorObjectType.SystemTitle) {
            const { blackbox } = obj as SimulatorSubsystem;

            const title = new Text((obj as SimulatorSystemTitle).chars, {
              fontFamily: "ibm",
              fontSize: BlockSize,
            });

            title.x = (i - boundaries.translateX) * BlockSize;
            title.y = (j - boundaries.translateY) * BlockSize;

            title.style.fill = blackbox ? "ffffff" : "000000";
            title.resolution = 2;
            title.texture.baseTexture.scaleMode = SCALE_MODES.LINEAR;

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

    this.maxKeyframes = Math.max(...flow.steps.map(step => step.keyframe)) + 1;

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
