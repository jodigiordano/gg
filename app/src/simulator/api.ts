import {
  SystemSimulator,
  SimulatorObjectType,
  SimulatorSystemTitle,
  SimulatorSubsystem,
  SimulatorLinkDirectionType,
  SimulatorLink,
  SimulatorSystemDirectionType,
} from "@gg/core";
import { Sprite, Text, SCALE_MODES, Container } from "pixi.js";
import { spritesheet } from "../renderer/assets.js";
import { BlockSize } from "../helpers.js";
import { app, tick } from "../renderer/pixi.js";
import viewport from "../renderer/viewport.js";
import { state, pushChange } from "../state.js";
import { save } from "../persistence.js";
import { setJsonEditorValue } from "../jsonEditor.js";
import FlowPlayer from "./flowPlayer.js";
import WebWorker from "../worker.js";

//
// Load the simulation.
//

// Necessary to initialize it this way so Vite generates a worker.js bundle.
const nativeWorker = new Worker(new URL("worker.ts", import.meta.url), {
  type: "module",
});

const worker = new WebWorker(nativeWorker);

export async function loadSimulation(json: string): Promise<void> {
  return new Promise((resolve, reject) => {
    worker.onCodeLoaded(() => {
      worker
        .sendOperation({
          operation: "initialize",
          json,
        })
        .then(data => {
          if (data.success) {
            // Set the new simulation in the state.
            state.simulator = new SystemSimulator(data.simulator as any);

            // Draw the new simulaton.
            container.removeChildren();

            for (const objectToRender of getObjectsToRender()) {
              // @ts-ignore
              container.addChild(objectToRender);
            }

            if (state.simulator.getSystem().flows.length) {
              state.flowPlayer = new FlowPlayer(
                state.simulator,
                state.simulator.getSystem().flows[0]!,
                state.flowKeyframe,
              );

              for (const objectToRender of state.flowPlayer.getObjectsToRender()) {
                // @ts-ignore
                container.addChild(objectToRender);
              }
            }

            // Play the flow, if needed.
            if (state.flowPlay && state.flowPlayer) {
              app.ticker.start();
            }

            tick();

            state.simulatorInitialized = true;

            resolve();
          } else {
            for (const error of data.errors as string[]) {
              console.warn(error);
            }

            reject();
          }
        });
    });
  });
}

//
// Draw the simulation.
//

// Container to display simulation objects.
const container = new Container();

container.zIndex = 0;

// @ts-ignore
viewport.addChild(container);

// Ticker to execute a step of the simulation.
app.ticker.add<void>(deltaTime => {
  if (state.flowPlayer) {
    if (state.flowPlay) {
      state.flowPlayer.update(deltaTime, state.flowPlayMode, state.flowSpeed);
      state.flowKeyframe = Math.max(0, state.flowPlayer.getKeyframe());
    }

    state.flowPlayer.draw();
  }
});

function getObjectsToRender(): (Sprite | Text)[] {
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

//
// Helpers
//

// Modifies the specification transactionally.
export async function modifySpecification(modifier: () => void): Promise<void> {
  const system = state.simulator.getSystem();

  // Make a copy of the specification.
  const currentSpecification = JSON.stringify(system.specification, null, 2);

  // Call a function that modifies the specification.
  modifier();

  // Try to apply the new configuration.
  const newSpecification = JSON.stringify(system.specification, null, 2);

  try {
    await loadSimulation(newSpecification);

    pushChange(newSpecification);
    save(newSpecification);
    setJsonEditorValue(newSpecification);
  } catch {
    // Rollback if the new configuration is invalid.
    await loadSimulation(currentSpecification);
  }
}

// Fit the simulation in the viewport.
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

  viewport.fit(left + width / 2, top + height / 2, width, height);
}

// Get the number of keyframes in the flow.
export function getKeyframesCount(): number {
  return Math.max(
    0,
    new Set(
      state.simulator
        .getSystem()
        .flows.at(0)
        ?.steps?.map(step => step.keyframe) ?? [],
    ).size - 1,
  );
}
