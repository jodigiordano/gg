import {
  Assets,
  MIPMAP_MODES,
  SCALE_MODES,
  Spritesheet,
  WRAP_MODES,
} from "pixi.js";
import spritesheetData from "../assets/spritesheet.png?base64";

//
// Fonts.
//

const fonts: Promise<any>[] = [];

for (const [name, font] of [
  ["text", "arimo.ttf"],
  ["sketch", "monaspace.radon.ttf"],
  ["code", "roboto.ttf"],
]) {
  fonts.push(
    Assets.load({
      name,
      src: font,
      data: {
        family: name,
      },
    }),
  );
}

await Promise.all(fonts);

//
// gg spritesheet.
//

await Assets.load({
  name: "spritesheet",
  src: `data:image/png;base64,${spritesheetData}`,
});

interface Rectangle {
  x: number;
  y: number;
  w: number;
  h: number;
}

function loadRectangle(
  x: number,
  y: number,
): {
  topLeft: Rectangle;
  topCenter: Rectangle;
  topRight: Rectangle;
  centerLeft: Rectangle;
  centerCenter: Rectangle;
  centerRight: Rectangle;
  bottomLeft: Rectangle;
  bottomCenter: Rectangle;
  bottomRight: Rectangle;
} {
  return {
    topLeft: { x: x, y: y, w: 8, h: 8 },
    topCenter: { x: x + 8, y: y, w: 8, h: 8 },
    topRight: { x: x + 16, y: y, w: 8, h: 8 },
    centerLeft: { x: x, y: y + 8, w: 8, h: 8 },
    centerCenter: { x: x + 8, y: y + 8, w: 8, h: 8 },
    centerRight: { x: x + 16, y: y + 8, w: 8, h: 8 },
    bottomLeft: { x: x, y: y + 16, w: 8, h: 8 },
    bottomCenter: { x: x + 8, y: y + 16, w: 8, h: 8 },
    bottomRight: { x: x + 16, y: y + 16, w: 8, h: 8 },
  };
}

const box = loadRectangle(2, 2);
const systemSelector = loadRectangle(2, 28);
const linkLabel = loadRectangle(2, 54);

export const spritesheet = new Spritesheet(Assets.get("spritesheet"), {
  frames: {
    boxTopLeft: { frame: box.topLeft },
    boxTopRight: { frame: box.topRight },
    boxBottomLeft: { frame: box.bottomLeft },
    boxBottomRight: { frame: box.bottomRight },
    boxCenterLeft: { frame: box.centerLeft },
    boxCenterRight: { frame: box.centerRight },
    boxTopCenter: { frame: box.topCenter },
    boxBottomCenter: { frame: box.bottomCenter },
    boxCenterCenter: { frame: box.centerCenter },
    systemSelectorTopLeft: { frame: systemSelector.topLeft },
    systemSelectorTopRight: { frame: systemSelector.topRight },
    systemSelectorBottomLeft: { frame: systemSelector.bottomLeft },
    systemSelectorBottomRight: { frame: systemSelector.bottomRight },
    systemSelectorCenterLeft: { frame: systemSelector.centerLeft },
    systemSelectorCenterRight: { frame: systemSelector.centerRight },
    systemSelectorTopCenter: { frame: systemSelector.topCenter },
    systemSelectorBottomCenter: { frame: systemSelector.bottomCenter },
    systemSelectorCenterCenter: { frame: systemSelector.centerCenter },
    linkLabelTopLeft: { frame: linkLabel.topLeft },
    linkLabelTopRight: { frame: linkLabel.topRight },
    linkLabelBottomLeft: { frame: linkLabel.bottomLeft },
    linkLabelBottomRight: { frame: linkLabel.bottomRight },
    linkLabelCenterLeft: { frame: linkLabel.centerLeft },
    linkLabelCenterRight: { frame: linkLabel.centerRight },
    linkLabelTopCenter: { frame: linkLabel.topCenter },
    linkLabelBottomCenter: { frame: linkLabel.bottomCenter },
    linkLabelCenterCenter: { frame: linkLabel.centerCenter },
    linkPipe: { frame: { x: 48, y: 2, w: 8, h: 8 } },
    linkPipeCorner: { frame: { x: 48, y: 12, w: 8, h: 8 } },
    linkSolidLine: { frame: { x: 58, y: 2, w: 8, h: 8 } },
    linkSolidLineCorner: { frame: { x: 58, y: 12, w: 8, h: 8 } },
    linkSolidLineSolidArrow: { frame: { x: 58, y: 22, w: 8, h: 8 } },
    linkSolidLineSolidArrowCorner: { frame: { x: 68, y: 22, w: 8, h: 8 } },
    linkDottedLine: { frame: { x: 68, y: 2, w: 8, h: 8 } },
    linkDottedLineCorner: { frame: { x: 68, y: 12, w: 8, h: 8 } },
    linkDottedLineSolidArrow: { frame: { x: 58, y: 22, w: 8, h: 8 } },
    linkDottedLineSolidArrowCorner: { frame: { x: 68, y: 22, w: 8, h: 8 } },
    data: { frame: { x: 28, y: 2, w: 8, h: 8 } },
  },
  meta: {
    image: "spritesheet.png",
    format: "RGBA8888",
    size: { w: 128, h: 128 },
    scale: 1,
  },
});

await spritesheet.parse();

spritesheet.baseTexture.wrapMode = WRAP_MODES.REPEAT;
spritesheet.baseTexture.scaleMode = SCALE_MODES.NEAREST;
spritesheet.baseTexture.mipmap = MIPMAP_MODES.POW2;
