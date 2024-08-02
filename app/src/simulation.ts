import { dump as saveYaml } from "js-yaml";
import {
  RuntimeFlow,
  loadYaml,
  SystemSimulator,
  SimulatorObjectType,
  SimulatorSystemTitle,
  SimulatorSubsystem,
  SimulatorLinkDirectionType,
  SimulatorLink,
  SimulatorSystemDirectionType,
  getFlowTick,
} from "@gg/core";
import { Sprite, Text, SCALE_MODES, Container } from "pixi.js";
import { spritesheet } from "./assets.js";
import { BlockSize } from "./helpers.js";
import { app } from "./pixi.js";
import { viewport } from "./viewport.js";
import { state, pushChange } from "./state.js";
import { save } from "./persistence.js";
import { setYamlEditorValue } from "./yamlEditor.js";

const container = new Container();

container.zIndex = 0;

viewport.addChild(container);

app.ticker.add<void>(deltaTime => {
  if (state.flowPlayer) {
    if (state.flowPlay) {
      state.flowPlayer.update(deltaTime, state.flowPlayMode, state.flowSpeed);
      state.flowKeyframe = Math.max(0, state.flowPlayer.getKeyframe());
    }

    state.flowPlayer.draw();
  }
});

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
    state.flowPlayer = createFlowPlayer(0);

    for (const objectToRender of state.flowPlayer.getObjectsToRender()) {
      // @ts-ignore
      container.addChild(objectToRender);
    }
  }

  if (state.flowPlay && state.flowPlayer) {
    app.ticker.start();
  }

  return true;
}

export function fitSimulation() {
  const boundaries = state.simulator.getVisibleWorldBoundaries();

  const boundaryLeft = boundaries.left * BlockSize;
  const boundaryRight = boundaries.right * BlockSize;
  const boundaryTop = boundaries.top * BlockSize;
  const boundaryBottom = boundaries.bottom * BlockSize;

  const left = boundaryLeft - BlockSize; /* margin */
  const top = boundaryTop - BlockSize; /* margin */

  const width =
    boundaryRight - boundaryLeft + BlockSize + BlockSize * 2; /* margin */

  const height =
    boundaryBottom - boundaryTop + BlockSize + BlockSize * 2; /* margin */

  // The operation is executed twice because of a weird issue that I don't
  // understand yet. Somehow, because we are using "viewport.clamp", the first
  // tuple ["viewport.moveCenter", "viewport.fit"] below doesn't quite do its
  // job and part of the simulation is slightly out of the viewport.
  //
  // This code feels like slapping the side of the CRT.
  for (let i = 0; i < 2; i++) {
    viewport.moveCenter(left + width / 2, top + height / 2);
    viewport.fit(true, width, height);
  }
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
    save(newSpecification);
    setYamlEditorValue(newSpecification);
  } else {
    // Rollback if the new configuration is invalid.
    loadSimulation(currentSpecification);
  }
}

export function getKeyframesCount(): number {
  return Math.max(
    0,
    new Set(state.system.flows.at(0)?.steps?.map(step => step.keyframe) ?? [])
      .size - 1,
  );
}

export function createFlowPlayer(flowIndex: number): FlowPlayer {
  return new FlowPlayer(
    state.simulator,
    state.system.flows.find(flow => flow.index === flowIndex)!,
    state.flowKeyframe,
  );
}

export class FlowPlayer {
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

    for (let i = 0; i < data.length; i++) {
      if (data[i].length) {
        this.sprites[i].x = (data[i][0] - boundaries.translateX) * BlockSize;
        this.sprites[i].y = (data[i][1] - boundaries.translateY) * BlockSize;
        this.sprites[i].visible = true;
      } else {
        this.sprites[i].visible = false;
      }
    }
  }
}
