import {
  SystemSimulator,
  SimulatorObjectType,
  SimulatorSystemTitleText,
  SimulatorSubsystem,
  SimulatorLinkDirectionType,
  SimulatorLink,
  SimulatorLinkTitleContainer,
  SimulatorDirectionType,
  SimulatorLinkTitle,
  SimulatorLinkPathPosition,
  TextFont,
  TextAlign,
  SimulatorDebugInformation,
  PathfindingWeights,
  RuntimeSize,
} from "@gg/core";
import { Sprite, Container, Texture } from "pixi.js";
import TaggedText from "../pixi-tagged-text/TaggedText.js";
import { spritesheet, iconPacks } from "../renderer/assets.js";
import { BlockSize, getForegroundColor } from "../helpers.js";
import { tick } from "../renderer/pixi.js";
import viewport from "../renderer/viewport.js";
import { state, pushChange } from "../state.js";
import { getUrlParams, save } from "../persistence.js";
import { setJsonEditorValue } from "../jsonEditor.js";
import WebWorker from "../worker.js";
import { setConnectivity } from "../connectivity.js";
import { setFullTagRegex } from "../pixi-tagged-text/tags.js";

//
// Load the simulation.
//

// Necessary to initialize it this way so Vite generates a worker.js bundle.
const nativeWorker = new Worker(new URL("worker.ts", import.meta.url), {
  type: "module",
});

const worker = new WebWorker(nativeWorker);

export async function loadSimulation(
  json: string,
  options: { linkIndexToDebug?: number } = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    worker.onCodeLoaded(() => {
      worker
        .sendOperation({
          operation: "initialize",
          ...options,
          json,
        })
        .then(data => {
          if (data.success) {
            // Set the new simulation in the state.
            state.simulator = new SystemSimulator(data.simulator as any);

            drawSimulation();

            state.simulatorInitialized = true;

            resolve();
          } else {
            for (const error of data.errors as string[]) {
              console.warn("ERROR", error);
            }

            for (const warning of data.warnings as string[]) {
              console.warn("WARNING", warning);
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

export function drawSimulation(): void {
  // Draw the new simulaton.
  container.removeChildren();

  for (const objectToRender of getObjectsToRender()) {
    // @ts-ignore
    container.addChild(objectToRender);
  }

  tick();
}

// Container to display simulation objects.
const container = new Container();

container.sortableChildren = true;
container.zIndex = 0;

// @ts-ignore
viewport.addChild(container);

const defaultColors = {
  light: {
    box1: "#eeeeee",
    box2: "#ced4da",
    box3: "#dee2e6",
    box4: "#e9ecef",
    boxTitleBlackbox: "#000000",
    boxTitleWhitebox: "#000000",
    list: "#adb1b5",
    listTitle: "#000000",
    link: "#000000",
    linkTitleBackground: "#ced4da",
    linkTitle: "#000000",
  },
  dark: {
    box1: "#666666",
    box2: "#2b2b2b",
    box3: "#1b1b1b",
    box4: "#000000",
    boxTitleBlackbox: "#ffffff",
    boxTitleWhitebox: "#ffffff",
    list: "#333333",
    listTitle: "#ffffff",
    link: "#dddddd",
    linkTitleBackground: "#4b4b4b",
    linkTitle: "#ffffff",
  },
};

function getObjectsToRender(): (Sprite | TaggedText)[] {
  const toDraw: (Sprite | TaggedText)[] = [];
  const layout = state.simulator.getLayout();
  const boundaries = state.simulator.getBoundaries();

  for (let i = 0; i < boundaries.width; i++) {
    for (let j = 0; j < boundaries.height; j++) {
      for (let k = 0; k < layout[i]![j]!.length; k++) {
        const obj = layout[i]![j]![k]!;

        if (obj.type === SimulatorObjectType.System) {
          const { system, blackbox, direction } = obj as SimulatorSubsystem;

          const sprite = new Sprite();

          sprite.zIndex = obj.zIndex;
          sprite.x = (i - boundaries.translateX) * BlockSize;
          sprite.y = (j - boundaries.translateY) * BlockSize;
          sprite.width = BlockSize;
          sprite.height = BlockSize;
          sprite.alpha = system.opacity;

          let systemTopLeft;
          let systemTopCenter;
          let systemTopRight;
          let systemCenterLeft;
          let systemCenterCenter;
          let systemCenterRight;
          let systemBottomLeft;
          let systemBottomCenter;
          let systemBottomRight;

          if (system.parent?.type === "list") {
            if (
              system.parent.borderEdges === "round" &&
              system.position.y ===
                Math.max(...system.parent.systems.map(ss => ss.position.y))
            ) {
              systemTopLeft = spritesheet.textures.listItemRoundTopLeft;
              systemTopCenter = spritesheet.textures.listItemRoundTopCenter;
              systemTopRight = spritesheet.textures.listItemRoundTopRight;
              systemCenterLeft = spritesheet.textures.listItemRoundCenterLeft;
              systemCenterCenter =
                spritesheet.textures.listItemRoundCenterCenter;
              systemCenterRight = spritesheet.textures.listItemRoundCenterRight;
              systemBottomLeft = spritesheet.textures.listItemRoundBottomLeft;
              systemBottomCenter =
                spritesheet.textures.listItemRoundBottomCenter;
              systemBottomRight = spritesheet.textures.listItemRoundBottomRight;
            } /* straight */ else {
              systemTopLeft = spritesheet.textures.listItemTopLeft;
              systemTopCenter = spritesheet.textures.listItemTopCenter;
              systemTopRight = spritesheet.textures.listItemTopRight;
              systemCenterLeft = spritesheet.textures.listItemCenterLeft;
              systemCenterCenter = spritesheet.textures.listItemCenterCenter;
              systemCenterRight = spritesheet.textures.listItemCenterRight;
              systemBottomLeft = spritesheet.textures.listItemBottomLeft;
              systemBottomCenter = spritesheet.textures.listItemBottomCenter;
              systemBottomRight = spritesheet.textures.listItemBottomRight;
            }
          } else if (system.borderPattern === "solid") {
            if (system.borderEdges === "round") {
              systemTopLeft = spritesheet.textures.boxRoundSolidTopLeft;
              systemTopCenter = spritesheet.textures.boxRoundSolidTopCenter;
              systemTopRight = spritesheet.textures.boxRoundSolidTopRight;
              systemCenterLeft = spritesheet.textures.boxRoundSolidCenterLeft;
              systemCenterCenter =
                spritesheet.textures.boxRoundSolidCenterCenter;
              systemCenterRight = spritesheet.textures.boxRoundSolidCenterRight;
              systemBottomLeft = spritesheet.textures.boxRoundSolidBottomLeft;
              systemBottomCenter =
                spritesheet.textures.boxRoundSolidBottomCenter;
              systemBottomRight = spritesheet.textures.boxRoundSolidBottomRight;
            } /* straight */ else {
              systemTopLeft = spritesheet.textures.boxSolidTopLeft;
              systemTopCenter = spritesheet.textures.boxSolidTopCenter;
              systemTopRight = spritesheet.textures.boxSolidTopRight;
              systemCenterLeft = spritesheet.textures.boxSolidCenterLeft;
              systemCenterCenter = spritesheet.textures.boxSolidCenterCenter;
              systemCenterRight = spritesheet.textures.boxSolidCenterRight;
              systemBottomLeft = spritesheet.textures.boxSolidBottomLeft;
              systemBottomCenter = spritesheet.textures.boxSolidBottomCenter;
              systemBottomRight = spritesheet.textures.boxSolidBottomRight;
            }
          } else if (system.borderPattern === "dotted") {
            if (system.borderEdges === "round") {
              systemTopLeft = spritesheet.textures.boxRoundDottedTopLeft;
              systemTopCenter = spritesheet.textures.boxRoundDottedTopCenter;
              systemTopRight = spritesheet.textures.boxRoundDottedTopRight;
              systemCenterLeft = spritesheet.textures.boxRoundDottedCenterLeft;
              systemCenterCenter =
                spritesheet.textures.boxRoundDottedCenterCenter;
              systemCenterRight =
                spritesheet.textures.boxRoundDottedCenterRight;
              systemBottomLeft = spritesheet.textures.boxRoundDottedBottomLeft;
              systemBottomCenter =
                spritesheet.textures.boxRoundDottedBottomCenter;
              systemBottomRight =
                spritesheet.textures.boxRoundDottedBottomRight;
            } /* straight */ else {
              systemTopLeft = spritesheet.textures.boxDottedTopLeft;
              systemTopCenter = spritesheet.textures.boxDottedTopCenter;
              systemTopRight = spritesheet.textures.boxDottedTopRight;
              systemCenterLeft = spritesheet.textures.boxDottedCenterLeft;
              systemCenterCenter = spritesheet.textures.boxDottedCenterCenter;
              systemCenterRight = spritesheet.textures.boxDottedCenterRight;
              systemBottomLeft = spritesheet.textures.boxDottedBottomLeft;
              systemBottomCenter = spritesheet.textures.boxDottedBottomCenter;
              systemBottomRight = spritesheet.textures.boxDottedBottomRight;
            }
          } /* light */ else {
            if (system.borderEdges === "round") {
              systemTopLeft = spritesheet.textures.boxRoundTopLeft;
              systemTopCenter = spritesheet.textures.boxRoundTopCenter;
              systemTopRight = spritesheet.textures.boxRoundTopRight;
              systemCenterLeft = spritesheet.textures.boxRoundCenterLeft;
              systemCenterCenter = spritesheet.textures.boxRoundCenterCenter;
              systemCenterRight = spritesheet.textures.boxRoundCenterRight;
              systemBottomLeft = spritesheet.textures.boxRoundBottomLeft;
              systemBottomCenter = spritesheet.textures.boxRoundBottomCenter;
              systemBottomRight = spritesheet.textures.boxRoundBottomRight;
            } /* straight */ else {
              systemTopLeft = spritesheet.textures.boxTopLeft;
              systemTopCenter = spritesheet.textures.boxTopCenter;
              systemTopRight = spritesheet.textures.boxTopRight;
              systemCenterLeft = spritesheet.textures.boxCenterLeft;
              systemCenterCenter = spritesheet.textures.boxCenterCenter;
              systemCenterRight = spritesheet.textures.boxCenterRight;
              systemBottomLeft = spritesheet.textures.boxBottomLeft;
              systemBottomCenter = spritesheet.textures.boxBottomCenter;
              systemBottomRight = spritesheet.textures.boxBottomRight;
            }
          }

          if (system.type === "list") {
            sprite.tint =
              system.backgroundColor ?? defaultColors[state.theme].list;
          } else if (blackbox) {
            sprite.tint =
              system.backgroundColor ?? defaultColors[state.theme].box1;
          } else if (system.depth % 2 === 0) {
            sprite.tint =
              system.backgroundColor ?? defaultColors[state.theme].box2;
          } else if (system.depth % 3 === 0) {
            sprite.tint =
              system.backgroundColor ?? defaultColors[state.theme].box3;
          } else {
            sprite.tint =
              system.backgroundColor ?? defaultColors[state.theme].box4;
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

          const { direction, pathPosition, pathLength, link } =
            obj as SimulatorLink;

          sprite.zIndex = obj.zIndex;
          sprite.x = (i - boundaries.translateX) * BlockSize + BlockSize / 2;
          sprite.y = (j - boundaries.translateY) * BlockSize + BlockSize / 2;
          sprite.width = BlockSize;
          sprite.height = BlockSize;
          sprite.anchor.x = 0.5;
          sprite.anchor.y = 0.5;
          sprite.alpha = link.opacity;

          if (link.backgroundColor) {
            sprite.tint = link.backgroundColor;
          } else if (link.middlePattern !== "pipe" || state.theme === "dark") {
            sprite.tint = defaultColors[state.theme].link;
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
            pathLength === 1 &&
            link.startPattern === "solid-arrow" &&
            link.endPattern === "solid-arrow"
          ) {
            sprite.texture = spritesheet.textures.linkDoubleSolidArrow;

            if (
              direction === SimulatorLinkDirectionType.BottomToTop ||
              direction === SimulatorLinkDirectionType.TopToBottom
            ) {
              sprite.rotation = Math.PI / 2;
            }
          } else if (
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
          sprite.alpha = link.titleOpacity;

          sprite.tint =
            link.titleBackgroundColor ??
            defaultColors[state.theme].linkTitleBackground;

          let containerTopLeft;
          let containerTopCenter;
          let containerTopRight;
          let containerCenterLeft;
          let containerCenterCenter;
          let containerCenterRight;
          let containerBottomLeft;
          let containerBottomCenter;
          let containerBottomRight;

          if (link.titleBorderPattern === "solid") {
            if (link.titleBorderEdges === "round") {
              containerTopLeft =
                spritesheet.textures.linkLabelRoundSolidTopLeft;
              containerTopCenter =
                spritesheet.textures.linkLabelRoundSolidTopCenter;
              containerTopRight =
                spritesheet.textures.linkLabelRoundSolidTopRight;
              containerCenterLeft =
                spritesheet.textures.linkLabelRoundSolidCenterLeft;
              containerCenterCenter =
                spritesheet.textures.linkLabelRoundSolidCenterCenter;
              containerCenterRight =
                spritesheet.textures.linkLabelRoundSolidCenterRight;
              containerBottomLeft =
                spritesheet.textures.linkLabelRoundSolidBottomLeft;
              containerBottomCenter =
                spritesheet.textures.linkLabelRoundSolidBottomCenter;
              containerBottomRight =
                spritesheet.textures.linkLabelRoundSolidBottomRight;
            } /* straight */ else {
              containerTopLeft = spritesheet.textures.linkLabelSolidTopLeft;
              containerTopCenter = spritesheet.textures.linkLabelSolidTopCenter;
              containerTopRight = spritesheet.textures.linkLabelSolidTopRight;
              containerCenterLeft =
                spritesheet.textures.linkLabelSolidCenterLeft;
              containerCenterCenter =
                spritesheet.textures.linkLabelSolidCenterCenter;
              containerCenterRight =
                spritesheet.textures.linkLabelSolidCenterRight;
              containerBottomLeft =
                spritesheet.textures.linkLabelSolidBottomLeft;
              containerBottomCenter =
                spritesheet.textures.linkLabelSolidBottomCenter;
              containerBottomRight =
                spritesheet.textures.linkLabelSolidBottomRight;
            }
          } else if (link.titleBorderPattern === "dotted") {
            if (link.titleBorderEdges === "round") {
              containerTopLeft =
                spritesheet.textures.linkLabelRoundDottedTopLeft;
              containerTopCenter =
                spritesheet.textures.linkLabelRoundDottedTopCenter;
              containerTopRight =
                spritesheet.textures.linkLabelRoundDottedTopRight;
              containerCenterLeft =
                spritesheet.textures.linkLabelRoundDottedCenterLeft;
              containerCenterCenter =
                spritesheet.textures.linkLabelRoundDottedCenterCenter;
              containerCenterRight =
                spritesheet.textures.linkLabelRoundDottedCenterRight;
              containerBottomLeft =
                spritesheet.textures.linkLabelRoundDottedBottomLeft;
              containerBottomCenter =
                spritesheet.textures.linkLabelRoundDottedBottomCenter;
              containerBottomRight =
                spritesheet.textures.linkLabelRoundDottedBottomRight;
            } /* straight */ else {
              containerTopLeft = spritesheet.textures.linkLabelDottedTopLeft;
              containerTopCenter =
                spritesheet.textures.linkLabelDottedTopCenter;
              containerTopRight = spritesheet.textures.linkLabelDottedTopRight;
              containerCenterLeft =
                spritesheet.textures.linkLabelDottedCenterLeft;
              containerCenterCenter =
                spritesheet.textures.linkLabelDottedCenterCenter;
              containerCenterRight =
                spritesheet.textures.linkLabelDottedCenterRight;
              containerBottomLeft =
                spritesheet.textures.linkLabelDottedBottomLeft;
              containerBottomCenter =
                spritesheet.textures.linkLabelDottedBottomCenter;
              containerBottomRight =
                spritesheet.textures.linkLabelDottedBottomRight;
            }
          } /* light */ else {
            if (link.titleBorderEdges === "round") {
              containerTopLeft = spritesheet.textures.linkLabelRoundTopLeft;
              containerTopCenter = spritesheet.textures.linkLabelRoundTopCenter;
              containerTopRight = spritesheet.textures.linkLabelRoundTopRight;
              containerCenterLeft =
                spritesheet.textures.linkLabelRoundCenterLeft;
              containerCenterCenter =
                spritesheet.textures.linkLabelRoundCenterCenter;
              containerCenterRight =
                spritesheet.textures.linkLabelRoundCenterRight;
              containerBottomLeft =
                spritesheet.textures.linkLabelRoundBottomLeft;
              containerBottomCenter =
                spritesheet.textures.linkLabelRoundBottomCenter;
              containerBottomRight =
                spritesheet.textures.linkLabelRoundBottomRight;
            } /* straight */ else {
              containerTopLeft = spritesheet.textures.linkLabelTopLeft;
              containerTopCenter = spritesheet.textures.linkLabelTopCenter;
              containerTopRight = spritesheet.textures.linkLabelTopRight;
              containerCenterLeft = spritesheet.textures.linkLabelCenterLeft;
              containerCenterCenter =
                spritesheet.textures.linkLabelCenterCenter;
              containerCenterRight = spritesheet.textures.linkLabelCenterRight;
              containerBottomLeft = spritesheet.textures.linkLabelBottomLeft;
              containerBottomCenter =
                spritesheet.textures.linkLabelBottomCenter;
              containerBottomRight = spritesheet.textures.linkLabelBottomRight;
            }
          }

          if (direction === SimulatorDirectionType.TopLeft) {
            sprite.texture = containerTopLeft;
          } else if (direction === SimulatorDirectionType.TopCenter) {
            sprite.texture = containerTopCenter;
          } else if (direction === SimulatorDirectionType.TopRight) {
            sprite.texture = containerTopRight;
          } else if (direction === SimulatorDirectionType.CenterLeft) {
            sprite.texture = containerCenterLeft;
          } else if (direction === SimulatorDirectionType.CenterRight) {
            sprite.texture = containerCenterRight;
          } else if (direction === SimulatorDirectionType.BottomLeft) {
            sprite.texture = containerBottomLeft;
          } else if (direction === SimulatorDirectionType.BottomCenter) {
            sprite.texture = containerBottomCenter;
          } else if (direction === SimulatorDirectionType.BottomRight) {
            sprite.texture = containerBottomRight;
          } else {
            sprite.texture = containerCenterCenter;
          }

          toDraw.push(sprite);
        } else if (obj.type === SimulatorObjectType.SystemTitleText) {
          const { system, blackbox } = obj as SimulatorSubsystem;

          const color = system.backgroundColor
            ? getForegroundColor(system.backgroundColor)
            : system.type === "list"
              ? defaultColors[state.theme].listTitle
              : /* box */ blackbox
                ? defaultColors[state.theme].boxTitleBlackbox
                : defaultColors[state.theme].boxTitleWhitebox;

          // The position of a text on the X axis is computed by the simulator,
          // which work with a grid of blocks. The computed position works well
          // with a left-aligned text or a right-aligned text but is not
          // precise enough for a center-aligned text, which requires sub-block
          // precision (i.e. pixel).
          const systemWidth =
            system.titleAlign === "center"
              ? system.size.width
              : system.size.width -
                system.titleMargin.left -
                system.titleMargin.right -
                system.padding.left -
                system.padding.right;

          const title = initializeText(
            (obj as SimulatorSystemTitleText).chars.replaceAll("\\n", "\n"),
            color,
            system.titleFont,
            system.titleAlign,
            systemWidth,
          );

          let x = (i - boundaries.translateX) * BlockSize;

          if (system.titleAlign === "center") {
            x -= (system.titleMargin.left + system.padding.left) * BlockSize;
          }

          let y = (j - boundaries.translateY) * BlockSize;

          if (!blackbox) {
            y += BlockSize / 2;

            if (system.titleFont === "sketch") {
              y += 1;
            } else if (system.titleFont === "code") {
              y += 3;
            }
          }

          title.zIndex = obj.zIndex;
          title.alpha = system.opacity;
          title.x = x;
          title.y = y;

          title.draw();

          toDraw.push(title);
        } else if (obj.type === SimulatorObjectType.LinkTitle) {
          const { link, chars } = obj as SimulatorLinkTitle;

          const title = initializeText(
            chars.replaceAll("\\n", "\n"),
            link.titleBackgroundColor
              ? getForegroundColor(link.titleBackgroundColor)
              : defaultColors[state.theme].linkTitle,
            link.titleFont,
            link.titleAlign,
            Math.max(1, link.titleSize.width - 1),
          );

          title.zIndex = obj.zIndex;
          title.alpha = link.titleOpacity;
          title.x = (i - boundaries.translateX) * BlockSize;
          title.y = (j - boundaries.translateY) * BlockSize;

          title.draw();

          toDraw.push(title);
        } else if (obj.type === SimulatorObjectType.DebugInformation) {
          const { weight } = obj as SimulatorDebugInformation;

          if (weight > 1) {
            const sprite = new Sprite();

            sprite.zIndex = obj.zIndex;
            sprite.x = (i - boundaries.translateX) * BlockSize;
            sprite.y = (j - boundaries.translateY) * BlockSize;
            sprite.width = BlockSize;
            sprite.height = BlockSize;
            sprite.texture = spritesheet.textures.boxCenterCenter;
            sprite.alpha = 0.5;
            (sprite.tint =
              weight === PathfindingWeights.Impenetrable
                ? "red"
                : weight === PathfindingWeights.Path
                  ? "blue"
                  : weight === PathfindingWeights.RoutedSystemPerimeter
                    ? "brown"
                    : "yellow"),
              toDraw.push(sprite);
          }
        }
      }
    }
  }

  return toDraw;
}

//
// Helpers
//

// Initialize options for text I.
const textBaseConfiguration: Record<string, Record<string, unknown>> = {
  default: {
    /* defined per font but key needed for regex */
  },
  __EMOJI__: {
    fontFamily: "emoji",
  },
  h1: {
    /* defined per font but key needed for regex */
  },
  h2: {
    /* defined per font but key needed for regex */
  },
  b: {
    fontWeight: "bold",
  },
  i: {
    fontStyle: "italic",
  },
  u: {
    textDecoration: "underline",
    underlineThickness: 2,
  },
  s: {
    textDecoration: "line-through",
    lineThroughThickness: 2,
  },
  a: {
    textDecoration: "underline",
    underlineThickness: 2,
  },
};

// Initialize options for text II.
const textImageMap: Record<string, Sprite> = {};

for (const [_name, spritesheet] of Object.entries(iconPacks)) {
  for (const [tag, texture] of Object.entries(spritesheet.textures)) {
    // Add to the images map.
    const sprite = new Sprite(texture);

    sprite.width = BlockSize * 2;
    sprite.height = BlockSize * 2;

    textImageMap[tag] = sprite;

    // Add to the configuration.
    textBaseConfiguration[tag] = {
      imgSrc: tag,
      valign: "middle",
    };
  }
}

// Initialize options for text III.
setFullTagRegex(Object.keys(textBaseConfiguration));

export function initializeText(
  text: string,
  color: string,
  font: TextFont,
  align: TextAlign,
  minWidthForCentering: number,
): TaggedText {
  const configuration: Record<string, Record<string, unknown>> = {
    ...textBaseConfiguration,
    default: {
      fontFamily: font,
      fontSize: BlockSize - BlockSize / 8,
      fill: `${color}`,
      wordWrap: false,
      paragraphSpacing: font === "text" ? 0 : font === "sketch" ? 1 : 4,
    },
    h1: {
      fontSize: BlockSize * 2 - BlockSize / 4,
      paragraphSpacing: font === "text" ? -1 : font === "sketch" ? 3 : 8,
    },
    h2: {
      fontSize: BlockSize * 1.5 - BlockSize / 4,
      paragraphSpacing: font === "text" ? 0 : font === "sketch" ? 1 : 5,
    },
    b: {
      fontFamily: `${font}-bold`,
      fontWeight: "bold",
    },
  };

  const options = {
    drawWhitespace: text.includes("<u>") || text.includes("<a href="),
    imgMap: textImageMap,
    //debug: true,
  };

  let width: number | null = null;

  if (align === "center" || align === "right") {
    const unalignedText = new TaggedText(text, configuration, options);

    unalignedText.update();

    width = 0;

    for (const token of unalignedText.tokensFlat) {
      const x = token.bounds.x === Infinity ? 0 : token.bounds.x;

      if (x + token.bounds.width > width!) {
        width = x + token.bounds.width;
      }
    }

    width = Math.max(width!, minWidthForCentering * BlockSize);
  }

  const wordWrap = width !== null;

  configuration.default.wordWrap = wordWrap;
  configuration.default.wordWrapWidth = wordWrap ? width : undefined;
  configuration.default.align = wordWrap ? align : undefined;

  const taggedText = new TaggedText(text, configuration, options);

  taggedText.update();

  return taggedText;
}

function calculateTextSize(
  text: string,
  font: TextFont,
  align: TextAlign,
  minWidthForCentering: number,
  minOverflowToAddOneMoreBlock: number,
): RuntimeSize {
  const title = initializeText(
    text,
    "#000000",
    font,
    align,
    minWidthForCentering,
  );

  let width = 0;
  let height = 0;

  if (title.tokensFlat) {
    for (const token of title.tokensFlat) {
      const x = token.bounds.x === Infinity ? 0 : token.bounds.x;
      const y = token.bounds.y === Infinity ? 0 : token.bounds.y;

      if (x + token.bounds.width > width) {
        width = x + token.bounds.width;
      }

      if (y + token.bounds.height > height) {
        height = y + token.bounds.height;
      }
    }
  } else {
    width = title.width;
    height = title.height;
  }

  width /= BlockSize;
  height /= BlockSize;

  width =
    width - Math.floor(width) > minOverflowToAddOneMoreBlock
      ? Math.ceil(width)
      : Math.floor(width);

  height =
    height - Math.floor(height) > minOverflowToAddOneMoreBlock
      ? Math.ceil(height)
      : Math.floor(height);

  if (text !== "") {
    width = Math.max(1, width);
    height = Math.max(1, height);
  }

  return {
    width,
    height,
  };
}

export function calculateTextSizeForLinkTitle(
  text: string,
  font: TextFont,
  align: TextAlign,
): RuntimeSize {
  const size = calculateTextSize(text, font, align, 0, 0.1);

  // The width of a link title is an odd number so the container can be
  // perfectly centered vertically on a link.
  //
  // +----------+
  // |          |
  // +----------+
  //      |
  //   +-----+
  //   |     | <- Needs to have width of 1, 3, 5, ...
  //   +-----+
  //      |
  // +----------+
  // |          |
  // +----------+
  //
  if (size.width % 2 === 0) {
    size.width += 1;
  }

  return size;
}

export function calculateTextSizeForSubsystem(
  text: string,
  font: TextFont,
  align: TextAlign,
): RuntimeSize {
  return calculateTextSize(text, font, align, 0, 0.5);
}

// Modifies the specification transactionally.
export async function modifySpecification(
  modifier: () => void,
): Promise<boolean> {
  let success = true;

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
    setJsonEditorValue(newSpecification);

    save(newSpecification)
      .then(() => setConnectivity(getUrlParams().file ? "local-file" : "ok"))
      .catch(() => setConnectivity("save-failed"));
  } catch {
    success = false;

    // Rollback if the new configuration is invalid.
    await loadSimulation(currentSpecification);
  }

  return success;
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
