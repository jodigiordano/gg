import {
  Assets,
  MIPMAP_MODES,
  SCALE_MODES,
  Spritesheet,
  WRAP_MODES,
} from "pixi.js";
import fontData from "../assets/ibm.woff?base64";

await Assets.load({
  name: "ibm",
  src: `data:font/woff;base64,${fontData}`,
  data: {
    family: "ibm",
  },
});

import spritesheetData from "../assets/spritesheet.png?base64";

await Assets.load({
  name: "spritesheet",
  src: `data:image/png;base64,${spritesheetData}`,
});

export const spritesheet = new Spritesheet(Assets.get("spritesheet"), {
  frames: {
    boxTopLeft: {
      frame: { x: 2, y: 2, w: 8, h: 8 },
    },
    boxTopRight: {
      frame: { x: 18, y: 2, w: 8, h: 8 },
    },
    boxBottomLeft: {
      frame: { x: 2, y: 18, w: 8, h: 8 },
    },
    boxBottomRight: {
      frame: { x: 18, y: 18, w: 8, h: 8 },
    },
    boxCenterLeft: {
      frame: { x: 2, y: 10, w: 8, h: 8 },
    },
    boxCenterRight: {
      frame: { x: 18, y: 10, w: 8, h: 8 },
    },
    boxTopCenter: {
      frame: { x: 10, y: 2, w: 8, h: 8 },
    },
    boxBottomCenter: {
      frame: { x: 10, y: 18, w: 8, h: 8 },
    },
    boxCenterCenter: {
      frame: { x: 10, y: 10, w: 8, h: 8 },
    },

    link: {
      frame: { x: 28, y: 2, w: 8, h: 8 },
    },
    linkCorner: {
      frame: { x: 28, y: 10, w: 8, h: 8 },
    },

    systemSelectorTopLeft: {
      frame: { x: 2, y: 28, w: 8, h: 8 },
    },
    systemSelectorTopRight: {
      frame: { x: 18, y: 28, w: 8, h: 8 },
    },
    systemSelectorBottomLeft: {
      frame: { x: 2, y: 44, w: 8, h: 8 },
    },
    systemSelectorBottomRight: {
      frame: { x: 18, y: 44, w: 8, h: 8 },
    },
    systemSelectorCenterLeft: {
      frame: { x: 2, y: 36, w: 8, h: 8 },
    },
    systemSelectorCenterRight: {
      frame: { x: 16, y: 36, w: 8, h: 8 },
    },
    systemSelectorTopCenter: {
      frame: { x: 10, y: 28, w: 8, h: 8 },
    },
    systemSelectorBottomCenter: {
      frame: { x: 10, y: 44, w: 8, h: 8 },
    },
    systemSelectorCenterCenter: {
      frame: { x: 10, y: 36, w: 8, h: 8 },
    },

    data: {
      frame: { x: 38, y: 2, w: 8, h: 8 },
    },

    linkLabelTopLeft: {
      frame: { x: 28, y: 28, w: 8, h: 8 },
    },
    linkLabelTopRight: {
      frame: { x: 44, y: 28, w: 8, h: 8 },
    },
    linkLabelBottomLeft: {
      frame: { x: 28, y: 44, w: 8, h: 8 },
    },
    linkLabelBottomRight: {
      frame: { x: 44, y: 44, w: 8, h: 8 },
    },
    linkLabelCenterLeft: {
      frame: { x: 28, y: 36, w: 8, h: 8 },
    },
    linkLabelCenterRight: {
      frame: { x: 44, y: 36, w: 8, h: 8 },
    },
    linkLabelTopCenter: {
      frame: { x: 36, y: 28, w: 8, h: 8 },
    },
    linkLabelBottomCenter: {
      frame: { x: 36, y: 44, w: 8, h: 8 },
    },
    linkLabelCenterCenter: {
      frame: { x: 36, y: 36, w: 8, h: 8 },
    },
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
