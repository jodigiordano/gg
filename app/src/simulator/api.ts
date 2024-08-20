import {
  SystemSimulator,
  SimulatorObjectType,
  SimulatorSystemTitle,
  SimulatorSubsystem,
  SimulatorLinkDirectionType,
  SimulatorLink,
  SimulatorLinkTitleContainer,
  SimulatorDirectionType,
  SimulatorLinkTitle,
  SimulatorLinkPathPosition,
} from "@gg/core";
import { Sprite, Text, SCALE_MODES, Container, Texture } from "pixi.js";
import { spritesheet } from "../renderer/assets.js";
import { BlockSize, getForegroundColor } from "../helpers.js";
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

container.sortableChildren = true;
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

  const systemTopLeft = spritesheet.textures.boxTopLeft;
  const systemTopCenter = spritesheet.textures.boxTopCenter;
  const systemTopRight = spritesheet.textures.boxTopRight;
  const systemCenterLeft = spritesheet.textures.boxCenterLeft;
  const systemCenterCenter = spritesheet.textures.boxCenterCenter;
  const systemCenterRight = spritesheet.textures.boxCenterRight;
  const systemBottomLeft = spritesheet.textures.boxBottomLeft;
  const systemBottomCenter = spritesheet.textures.boxBottomCenter;
  const systemBottomRight = spritesheet.textures.boxBottomRight;

  for (let i = 0; i < boundaries.width; i++) {
    for (let j = 0; j < boundaries.height; j++) {
      for (let k = 0; k < layout[i]![j]!.length; k++) {
        const obj = layout[i]![j]![k]!;

        if (obj.type === SimulatorObjectType.System) {
          const sprite = new Sprite();

          sprite.zIndex = obj.zIndex;
          sprite.x = (i - boundaries.translateX) * BlockSize;
          sprite.y = (j - boundaries.translateY) * BlockSize;
          sprite.width = BlockSize;
          sprite.height = BlockSize;

          const { system, blackbox, direction } = obj as SimulatorSubsystem;

          if (blackbox) {
            sprite.tint = system.backgroundColor ?? "3d348b";
          } else if (system.depth % 2 === 0) {
            sprite.tint = system.backgroundColor ?? "ced4da";
          } else if (system.depth % 3 === 0) {
            sprite.tint = system.backgroundColor ?? "dee2e6";
          } else {
            sprite.tint = system.backgroundColor ?? "e9ecef";
          }

          if (direction === SimulatorDirectionType.TopLeft) {
            sprite.texture = systemTopLeft;
          } else if (direction === SimulatorDirectionType.TopCenter) {
            sprite.texture = systemTopCenter;
          } else if (direction === SimulatorDirectionType.TopRight) {
            sprite.texture = systemTopRight;
          } else if (direction === SimulatorDirectionType.CenterLeft) {
            sprite.texture = systemCenterLeft;
          } else if (direction === SimulatorDirectionType.CenterRight) {
            sprite.texture = systemCenterRight;
          } else if (direction === SimulatorDirectionType.BottomLeft) {
            sprite.texture = systemBottomLeft;
          } else if (direction === SimulatorDirectionType.BottomCenter) {
            sprite.texture = systemBottomCenter;
          } else if (direction === SimulatorDirectionType.BottomRight) {
            sprite.texture = systemBottomRight;
          } else {
            // CenterCenter
            sprite.texture = systemCenterCenter;
          }

          toDraw.push(sprite);
        } else if (obj.type === SimulatorObjectType.Link) {
          const sprite = new Sprite();

          sprite.zIndex = obj.zIndex;
          sprite.x = (i - boundaries.translateX) * BlockSize + BlockSize / 2;
          sprite.y = (j - boundaries.translateY) * BlockSize + BlockSize / 2;
          sprite.width = BlockSize;
          sprite.height = BlockSize;
          sprite.anchor.x = 0.5;
          sprite.anchor.y = 0.5;

          const { direction, pathPosition, link } = obj as SimulatorLink;

          if (link.middlePattern !== "pipe") {
            sprite.tint = "#000000";
          }

          const isCorner =
            direction === SimulatorLinkDirectionType.BottomToLeft ||
            direction === SimulatorLinkDirectionType.LeftToBottom ||
            direction === SimulatorLinkDirectionType.BottomToRight ||
            direction === SimulatorLinkDirectionType.RightToBottom ||
            direction === SimulatorLinkDirectionType.TopToLeft ||
            direction === SimulatorLinkDirectionType.LeftToTop ||
            direction === SimulatorLinkDirectionType.RightToTop ||
            direction === SimulatorLinkDirectionType.TopToRight;

          if (
            link.middlePattern !== "pipe" &&
            pathPosition === SimulatorLinkPathPosition.Start &&
            link.startPattern !== "none"
          ) {
            if (link.middlePattern === "solid-line") {
              if (isCorner) {
                sprite.texture =
                  spritesheet.textures.linkSolidLineSolidArrowCorner;
              } else {
                sprite.texture = spritesheet.textures.linkSolidLineSolidArrow;
              }
            } /* dotted-line */ else {
              if (isCorner) {
                sprite.texture =
                  spritesheet.textures.linkDottedLineSolidArrowCorner;
              } else {
                sprite.texture = spritesheet.textures.linkDottedLineSolidArrow;
              }
            }

            if (direction === SimulatorLinkDirectionType.LeftToRight) {
              sprite.rotation = Math.PI / 2;
            } else if (direction === SimulatorLinkDirectionType.RightToLeft) {
              sprite.rotation = -Math.PI / 2;
            } else if (direction === SimulatorLinkDirectionType.TopToBottom) {
              sprite.rotation = Math.PI;
            } else if (direction === SimulatorLinkDirectionType.BottomToTop) {
              /* NOOP */
            } else if (direction === SimulatorLinkDirectionType.RightToTop) {
              sprite.rotation = Math.PI;
            } else if (direction === SimulatorLinkDirectionType.TopToRight) {
              sprite.rotation = -Math.PI / 2;
            } else if (direction === SimulatorLinkDirectionType.TopToLeft) {
              sprite.rotation = -Math.PI / 2;
            } else if (direction === SimulatorLinkDirectionType.LeftToTop) {
              /* NOOP */
            } else if (direction === SimulatorLinkDirectionType.RightToBottom) {
              sprite.rotation = Math.PI;
            } else if (direction === SimulatorLinkDirectionType.BottomToRight) {
              /* NOOP */
            } else if (direction === SimulatorLinkDirectionType.BottomToLeft) {
              sprite.rotation = Math.PI / 2;
            } else if (direction === SimulatorLinkDirectionType.LeftToBottom) {
              sprite.rotation = Math.PI / 2;
            }
          } else if (
            link.middlePattern !== "pipe" &&
            pathPosition === SimulatorLinkPathPosition.End &&
            link.endPattern !== "none"
          ) {
            if (link.middlePattern === "solid-line") {
              if (isCorner) {
                sprite.texture =
                  spritesheet.textures.linkSolidLineSolidArrowCorner;
              } else {
                sprite.texture = spritesheet.textures.linkSolidLineSolidArrow;
              }
            } /* dotted-line */ else {
              if (isCorner) {
                sprite.texture =
                  spritesheet.textures.linkDottedLineSolidArrowCorner;
              } else {
                sprite.texture = spritesheet.textures.linkDottedLineSolidArrow;
              }
            }

            if (direction === SimulatorLinkDirectionType.LeftToRight) {
              sprite.rotation = -Math.PI / 2;
            } else if (direction === SimulatorLinkDirectionType.RightToLeft) {
              sprite.rotation = Math.PI / 2;
            } else if (direction === SimulatorLinkDirectionType.TopToBottom) {
              /* NOOP */
            } else if (direction === SimulatorLinkDirectionType.BottomToTop) {
              sprite.rotation = -Math.PI;
            } else if (direction === SimulatorLinkDirectionType.RightToTop) {
              sprite.rotation = -Math.PI / 2;
            } else if (direction === SimulatorLinkDirectionType.TopToRight) {
              /* NOOP */
            } else if (direction === SimulatorLinkDirectionType.TopToLeft) {
              sprite.rotation = -Math.PI;
            } else if (direction === SimulatorLinkDirectionType.LeftToTop) {
              sprite.rotation = -Math.PI / 2;
            } else if (direction === SimulatorLinkDirectionType.RightToBottom) {
              sprite.rotation = Math.PI / 2;
            } else if (direction === SimulatorLinkDirectionType.BottomToRight) {
              sprite.rotation = Math.PI / 2;
            } else if (direction === SimulatorLinkDirectionType.BottomToLeft) {
              sprite.rotation = -Math.PI;
            } else if (direction === SimulatorLinkDirectionType.LeftToBottom) {
              /* NOOP */
            }
          } else {
            let linkTexture: Texture;
            let linkCornerTexture: Texture;

            if (link.middlePattern === "solid-line") {
              linkTexture = spritesheet.textures.linkSolidLine;
              linkCornerTexture = spritesheet.textures.linkSolidLineCorner;
            } else if (link.middlePattern === "dotted-line") {
              linkTexture = spritesheet.textures.linkDottedLine;
              linkCornerTexture = spritesheet.textures.linkDottedLineCorner;
            } /* pipe */ else {
              linkTexture = spritesheet.textures.linkPipe;
              linkCornerTexture = spritesheet.textures.linkPipeCorner;
            }

            if (
              direction === SimulatorLinkDirectionType.LeftToRight ||
              direction === SimulatorLinkDirectionType.RightToLeft
            ) {
              sprite.texture = linkTexture;
              sprite.rotation = -Math.PI / 2;
            } else if (
              direction === SimulatorLinkDirectionType.TopToLeft ||
              direction === SimulatorLinkDirectionType.RightToTop
            ) {
              sprite.texture = linkCornerTexture;
              sprite.rotation = -Math.PI / 2;
            } else if (
              direction === SimulatorLinkDirectionType.TopToRight ||
              direction === SimulatorLinkDirectionType.LeftToTop
            ) {
              sprite.texture = linkCornerTexture;
            } else if (
              direction === SimulatorLinkDirectionType.BottomToLeft ||
              direction === SimulatorLinkDirectionType.RightToBottom
            ) {
              sprite.texture = linkCornerTexture;
              sprite.rotation = Math.PI;
            } else if (
              direction === SimulatorLinkDirectionType.BottomToRight ||
              direction === SimulatorLinkDirectionType.LeftToBottom
            ) {
              sprite.texture = linkCornerTexture;
              sprite.rotation = Math.PI / 2;
            } /* TopToBottom & BottomToTop */ else {
              sprite.texture = linkTexture;
            }
          }

          toDraw.push(sprite);
        } else if (obj.type === SimulatorObjectType.LinkTitleContainer) {
          const { link, direction } = obj as SimulatorLinkTitleContainer;

          const sprite = new Sprite();

          sprite.zIndex = obj.zIndex;
          sprite.x = (i - boundaries.translateX) * BlockSize;
          sprite.y = (j - boundaries.translateY) * BlockSize;
          sprite.width = BlockSize;
          sprite.height = BlockSize;
          sprite.tint = link.titleBackgroundColor ?? "ced4da";

          if (direction === SimulatorDirectionType.TopLeft) {
            sprite.texture = spritesheet.textures.linkLabelTopLeft;
          } else if (direction === SimulatorDirectionType.TopCenter) {
            sprite.texture = spritesheet.textures.linkLabelTopCenter;
          } else if (direction === SimulatorDirectionType.TopRight) {
            sprite.texture = spritesheet.textures.linkLabelTopRight;
          } else if (direction === SimulatorDirectionType.CenterLeft) {
            sprite.texture = spritesheet.textures.linkLabelCenterLeft;
          } else if (direction === SimulatorDirectionType.CenterRight) {
            sprite.texture = spritesheet.textures.linkLabelCenterRight;
          } else if (direction === SimulatorDirectionType.BottomLeft) {
            sprite.texture = spritesheet.textures.linkLabelBottomLeft;
          } else if (direction === SimulatorDirectionType.BottomCenter) {
            sprite.texture = spritesheet.textures.linkLabelBottomCenter;
          } else if (direction === SimulatorDirectionType.BottomRight) {
            sprite.texture = spritesheet.textures.linkLabelBottomRight;
          } else {
            sprite.texture = spritesheet.textures.linkLabelCenterCenter;
          }

          toDraw.push(sprite);
        } else if (obj.type === SimulatorObjectType.SystemTitle) {
          const { system, blackbox } = obj as SimulatorSubsystem;

          const title = new Text(
            (obj as SimulatorSystemTitle).chars.replaceAll("\\n", "\n"),
            {
              fontFamily: "ibm",
              fontSize: BlockSize,
              fill: system.backgroundColor
                ? getForegroundColor(system.backgroundColor)
                : blackbox
                  ? "ffffff"
                  : "000000",
            },
          );

          title.zIndex = obj.zIndex;
          title.x = (i - boundaries.translateX) * BlockSize;
          title.y = (j - boundaries.translateY) * BlockSize;

          title.resolution = 2;
          title.texture.baseTexture.scaleMode = SCALE_MODES.LINEAR;

          toDraw.push(title);
        } else if (obj.type === SimulatorObjectType.LinkTitle) {
          const { link, chars } = obj as SimulatorLinkTitle;

          const title = new Text(chars.replaceAll("\\n", "\n"), {
            fontFamily: "ibm",
            fontSize: BlockSize,
            fill: link.titleBackgroundColor
              ? getForegroundColor(link.titleBackgroundColor)
              : "000000",
          });

          title.zIndex = obj.zIndex;
          title.x = (i - boundaries.translateX) * BlockSize;
          title.y = (j - boundaries.translateY) * BlockSize;

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
