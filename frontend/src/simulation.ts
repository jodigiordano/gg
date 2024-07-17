import { dump as saveYaml } from "js-yaml";
import { RuntimeFlow, loadYaml } from "@gg/spec";
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
  SCALE_MODES,
  Container,
} from "pixi.js";
import { spritesheet } from "./assets.js";
import { BlockSize } from "./consts.js";
import { app } from "./pixi.js";
import { viewport } from "./viewport.js";
import { state, pushChange } from "./state.js";

const container = new Container();

viewport.addChild(container);

app.ticker.add<void>(deltaTime => {
  if (state.canvasFlowPlayer) {
    state.canvasFlowPlayer.update(deltaTime);
  }
});

// TODO: hmmm...
const yamlEditor = document.querySelector(
  "#yaml-editor textarea",
) as HTMLTextAreaElement;

export function loadSimulation(yaml: string): boolean {
  let result: ReturnType<typeof loadYaml>;

  try {
    result = loadYaml(yaml);
  } catch (error) {
    console.warn((error as Error).message);

    return false;
  }

  if (result.errors.length) {
    for (const error of result.errors) {
      console.warn(error.path, error.message);
    }

    return false;
  }

  state.system = result.system;
  state.simulator = new SystemSimulator(state.system);

  container.removeChildren();

  for (const objectToRender of getObjectsToRender()) {
    // @ts-ignore
    container.addChild(objectToRender);
  }

  if (state.system.flows.length) {
    state.canvasFlowPlayer = createFlowPlayer(app, 0);

    for (const objectToRender of state.canvasFlowPlayer.getObjectsToRender()) {
      // @ts-ignore
      container.addChild(objectToRender);
    }
  }

  return true;
}

export function getVisibleBoundaries() {
  const visibleBoundaries = state.simulator.getVisibleWorldBoundaries();

  return {
    left: visibleBoundaries.left * BlockSize,
    right: visibleBoundaries.right * BlockSize,
    top: visibleBoundaries.top * BlockSize,
    bottom: visibleBoundaries.bottom * BlockSize,
  };
}

export function getObjectsToRender(): (Sprite | Text)[] {
  const toDraw: (Sprite | Text)[] = [];
  const layout = state.simulator.getLayout();
  const boundaries = state.simulator.getBoundaries();

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

          let systemTopLeft;
          let systemTopCenter;
          let systemTopRight;
          let systemCenterLeft;
          let systemCenterCenter;
          let systemCenterRight;
          let systemBottomLeft;
          let systemBottomCenter;
          let systemBottomRight;

          if (blackbox) {
            systemTopLeft = spritesheet.textures.systemATopLeft;
            systemTopCenter = spritesheet.textures.systemATopCenter;
            systemTopRight = spritesheet.textures.systemATopRight;
            systemCenterLeft = spritesheet.textures.systemACenterLeft;
            systemCenterCenter = spritesheet.textures.systemACenterCenter;
            systemCenterRight = spritesheet.textures.systemACenterRight;
            systemBottomLeft = spritesheet.textures.systemABottomLeft;
            systemBottomCenter = spritesheet.textures.systemABottomCenter;
            systemBottomRight = spritesheet.textures.systemABottomRight;
          } else if (system.depth % 2 === 0) {
            systemTopLeft = spritesheet.textures.systemBTopLeft;
            systemTopCenter = spritesheet.textures.systemBTopCenter;
            systemTopRight = spritesheet.textures.systemBTopRight;
            systemCenterLeft = spritesheet.textures.systemBCenterLeft;
            systemCenterCenter = spritesheet.textures.systemBCenterCenter;
            systemCenterRight = spritesheet.textures.systemBCenterRight;
            systemBottomLeft = spritesheet.textures.systemBBottomLeft;
            systemBottomCenter = spritesheet.textures.systemBBottomCenter;
            systemBottomRight = spritesheet.textures.systemBBottomRight;
          } else if (system.depth % 3 === 0) {
            systemTopLeft = spritesheet.textures.systemCTopLeft;
            systemTopCenter = spritesheet.textures.systemCTopCenter;
            systemTopRight = spritesheet.textures.systemCTopRight;
            systemCenterLeft = spritesheet.textures.systemCCenterLeft;
            systemCenterCenter = spritesheet.textures.systemCCenterCenter;
            systemCenterRight = spritesheet.textures.systemCCenterRight;
            systemBottomLeft = spritesheet.textures.systemCBottomLeft;
            systemBottomCenter = spritesheet.textures.systemCBottomCenter;
            systemBottomRight = spritesheet.textures.systemCBottomRight;
          } else {
            systemTopLeft = spritesheet.textures.systemDTopLeft;
            systemTopCenter = spritesheet.textures.systemDTopCenter;
            systemTopRight = spritesheet.textures.systemDTopRight;
            systemCenterLeft = spritesheet.textures.systemDCenterLeft;
            systemCenterCenter = spritesheet.textures.systemDCenterCenter;
            systemCenterRight = spritesheet.textures.systemDCenterRight;
            systemBottomLeft = spritesheet.textures.systemDBottomLeft;
            systemBottomCenter = spritesheet.textures.systemDBottomCenter;
            systemBottomRight = spritesheet.textures.systemDBottomRight;
          }

          if (direction === SimulatorSystemDirectionType.TopLeft) {
            sprite.texture = systemTopLeft;
          } else if (direction === SimulatorSystemDirectionType.TopCenter) {
            sprite.texture = systemTopCenter;
          } else if (direction === SimulatorSystemDirectionType.TopRight) {
            sprite.texture = systemTopRight;
          } else if (direction === SimulatorSystemDirectionType.CenterLeft) {
            sprite.texture = systemCenterLeft;
          } else if (direction === SimulatorSystemDirectionType.CenterRight) {
            sprite.texture = systemCenterRight;
          } else if (direction === SimulatorSystemDirectionType.BottomLeft) {
            sprite.texture = systemBottomLeft;
          } else if (direction === SimulatorSystemDirectionType.BottomCenter) {
            sprite.texture = systemBottomCenter;
          } else if (direction === SimulatorSystemDirectionType.BottomRight) {
            sprite.texture = systemBottomRight;
          } else {
            // CenterCenter
            sprite.texture = systemCenterCenter;
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

/**
 * Modifies the specification transactionally.
 */
export function modifySpecification(modifier: () => void): void {
  // Make a copy of the specification.
  const currentSpecification = saveYaml(state.system.specification);

  // Call a function that modifies the specification.
  modifier();

  // Try to apply the new configuration.
  const newSpecification = saveYaml(state.system.specification);

  if (loadSimulation(newSpecification)) {
    pushChange(newSpecification);

    // TODO: hmmm...
    yamlEditor.value = newSpecification;
  } else {
    // Rollback if the new configuration is invalid.
    loadSimulation(currentSpecification);
  }
}

export function createFlowPlayer(
  app: Application,
  flowIndex: number,
): CanvasFlowPlayer {
  const dataGraphic = new Graphics()
    .beginFill(0x00ff00)
    .drawRect(0, 0, BlockSize, BlockSize)
    .endFill();

  const dataTexture = app.renderer.generateTexture(dataGraphic);

  return new CanvasFlowPlayer(
    state.simulator,
    state.system.flows.find(flow => flow.index === flowIndex)!,
    dataTexture,
  );
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
