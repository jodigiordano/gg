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
  SystemMinSize,
  TitlePadding,
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
import { TextFont } from "@gg/core";
import { TextAlign } from "@gg/core";
import { setFullTagRegex } from "../pixi-tagged-text/tags.js";

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

            drawSimulation();

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
    system1: "#000075",
    system2: "#ced4da",
    system3: "#dee2e6",
    system4: "#e9ecef",
    link: "#000000",
    linkTitleBackground: "#ced4da",
    linkTitle: "#000000",
    systemTitleBlackbox: "#ffffff",
    systemTitleWhitebox: "#000000",
  },
  dark: {
    system1: "#4363d8",
    system2: "#2b2b2b",
    system3: "#1b1b1b",
    system4: "#000000",
    link: "#dddddd",
    linkTitleBackground: "#4b4b4b",
    linkTitle: "#ffffff",
    systemTitleBlackbox: "#ffffff",
    systemTitleWhitebox: "#ffffff",
  },
};

function getObjectsToRender(): (Sprite | TaggedText)[] {
  const toDraw: (Sprite | TaggedText)[] = [];
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
            sprite.tint =
              system.backgroundColor ?? defaultColors[state.theme].system1;
          } else if (system.depth % 2 === 0) {
            sprite.tint =
              system.backgroundColor ?? defaultColors[state.theme].system2;
          } else if (system.depth % 3 === 0) {
            sprite.tint =
              system.backgroundColor ?? defaultColors[state.theme].system3;
          } else {
            sprite.tint =
              system.backgroundColor ?? defaultColors[state.theme].system4;
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
          sprite.tint =
            link.titleBackgroundColor ??
            defaultColors[state.theme].linkTitleBackground;

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

          const color = system.backgroundColor
            ? getForegroundColor(system.backgroundColor)
            : blackbox
              ? defaultColors[state.theme].systemTitleBlackbox
              : defaultColors[state.theme].systemTitleWhitebox;

          const title = initializeText(
            (obj as SimulatorSystemTitle).chars.replaceAll("\\n", "\n"),
            color,
            system.titleFont,
            system.titleAlign,
          );

          title.zIndex = obj.zIndex;
          title.x = (i - boundaries.translateX) * BlockSize;
          title.y = (j - boundaries.translateY) * BlockSize;

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
          );

          title.zIndex = obj.zIndex;
          title.x = (i - boundaries.translateX) * BlockSize;
          title.y = (j - boundaries.translateY) * BlockSize;

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

// Initialize options for text I.
const textBaseConfiguration: Record<string, Record<string, unknown>> = {
  default: {
    fontSize: BlockSize,
    wordWrap: false,
  },
  __EMOJI__: {},
  h1: {
    fontSize: BlockSize * 2,
  },
  h2: {
    fontSize: BlockSize * 1.5,
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
): TaggedText {
  let width: number | null = null;

  const configuration: Record<string, Record<string, unknown>> = {
    ...textBaseConfiguration,
    default: {
      fontFamily: font,
      fontSize: BlockSize,
      fill: `${color}`,
      wordWrap: false,
    },
    b: {
      fontFamily: `${font}-bold`,
      fontWeight: "bold",
    },
  };

  const options = {
    drawWhitespace: text.includes("<u>") || text.includes("<a href="),
    imgMap: textImageMap,
  };

  if (align === "center" || align === "right") {
    const unalignedText = new TaggedText(text, configuration, options);

    width = 0;

    for (const token of unalignedText.tokensFlat) {
      const x = token.bounds.x === Infinity ? 0 : token.bounds.x;

      if (x + token.bounds.width > width!) {
        width = x + token.bounds.width;
      }
    }

    width = Math.max(
      width!,
      (SystemMinSize.width - TitlePadding * 2) * BlockSize,
    );
  }

  const wordWrap = width !== null;

  configuration.default.wordWrap = wordWrap;
  configuration.default.wordWrapWidth = wordWrap ? width : undefined;
  configuration.default.align = wordWrap ? align : undefined;

  return new TaggedText(text, configuration, options);
}

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
    setJsonEditorValue(newSpecification);

    save(newSpecification)
      .then(() => setConnectivity(getUrlParams().file ? "local-file" : "ok"))
      .catch(() => setConnectivity("save-failed"));
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
