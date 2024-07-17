import { Assets, Spritesheet } from "pixi.js";
import fontData from "./assets/ibm.woff?base64";

await Assets.load({
  name: "ibm",
  src: `data:font/woff;base64,${fontData}`,
  data: {
    family: "ibm",
  },
});

import spritesheetData from "./assets/spritesheet.png?base64";

await Assets.load({
  name: "spritesheet",
  src: `data:image/png;base64,${spritesheetData}`,
});

export const spritesheet = new Spritesheet(Assets.get("spritesheet"), {
  frames: {
    systemATopLeft: {
      frame: { x: 0, y: 0, w: 8, h: 8 },
    },
    systemATopRight: {
      frame: { x: 16, y: 0, w: 8, h: 8 },
    },
    systemABottomLeft: {
      frame: { x: 0, y: 16, w: 8, h: 8 },
    },
    systemABottomRight: {
      frame: { x: 16, y: 16, w: 8, h: 8 },
    },
    systemACenterLeft: {
      frame: { x: 0, y: 8, w: 8, h: 8 },
    },
    systemACenterRight: {
      frame: { x: 16, y: 8, w: 8, h: 8 },
    },
    systemATopCenter: {
      frame: { x: 8, y: 0, w: 8, h: 8 },
    },
    systemABottomCenter: {
      frame: { x: 8, y: 16, w: 8, h: 8 },
    },
    systemACenterCenter: {
      frame: { x: 8, y: 8, w: 8, h: 8 },
    },

    systemBTopLeft: {
      frame: { x: 0, y: 24 + 0, w: 8, h: 8 },
    },
    systemBTopRight: {
      frame: { x: 16, y: 24 + 0, w: 8, h: 8 },
    },
    systemBBottomLeft: {
      frame: { x: 0, y: 24 + 16, w: 8, h: 8 },
    },
    systemBBottomRight: {
      frame: { x: 16, y: 24 + 16, w: 8, h: 8 },
    },
    systemBCenterLeft: {
      frame: { x: 0, y: 24 + 8, w: 8, h: 8 },
    },
    systemBCenterRight: {
      frame: { x: 16, y: 24 + 8, w: 8, h: 8 },
    },
    systemBTopCenter: {
      frame: { x: 8, y: 24 + 0, w: 8, h: 8 },
    },
    systemBBottomCenter: {
      frame: { x: 8, y: 24 + 16, w: 8, h: 8 },
    },
    systemBCenterCenter: {
      frame: { x: 8, y: 24 + 8, w: 8, h: 8 },
    },

    systemCTopLeft: {
      frame: { x: 0, y: 48 + 0, w: 8, h: 8 },
    },
    systemCTopRight: {
      frame: { x: 16, y: 48 + 0, w: 8, h: 8 },
    },
    systemCBottomLeft: {
      frame: { x: 0, y: 48 + 16, w: 8, h: 8 },
    },
    systemCBottomRight: {
      frame: { x: 16, y: 48 + 16, w: 8, h: 8 },
    },
    systemCCenterLeft: {
      frame: { x: 0, y: 48 + 8, w: 8, h: 8 },
    },
    systemCCenterRight: {
      frame: { x: 16, y: 48 + 8, w: 8, h: 8 },
    },
    systemCTopCenter: {
      frame: { x: 8, y: 48 + 0, w: 8, h: 8 },
    },
    systemCBottomCenter: {
      frame: { x: 8, y: 48 + 16, w: 8, h: 8 },
    },
    systemCCenterCenter: {
      frame: { x: 8, y: 48 + 8, w: 8, h: 8 },
    },

    systemDTopLeft: {
      frame: { x: 0, y: 72 + 0, w: 8, h: 8 },
    },
    systemDTopRight: {
      frame: { x: 16, y: 72 + 0, w: 8, h: 8 },
    },
    systemDBottomLeft: {
      frame: { x: 0, y: 72 + 16, w: 8, h: 8 },
    },
    systemDBottomRight: {
      frame: { x: 16, y: 72 + 16, w: 8, h: 8 },
    },
    systemDCenterLeft: {
      frame: { x: 0, y: 72 + 8, w: 8, h: 8 },
    },
    systemDCenterRight: {
      frame: { x: 16, y: 72 + 8, w: 8, h: 8 },
    },
    systemDTopCenter: {
      frame: { x: 8, y: 72 + 0, w: 8, h: 8 },
    },
    systemDBottomCenter: {
      frame: { x: 8, y: 72 + 16, w: 8, h: 8 },
    },
    systemDCenterCenter: {
      frame: { x: 8, y: 72 + 8, w: 8, h: 8 },
    },

    link: {
      frame: { x: 24, y: 8, w: 8, h: 8 },
    },
    linkCorner: {
      frame: { x: 24, y: 16, w: 8, h: 8 },
    },

    systemSelectorTopLeft: {
      frame: { x: 0, y: 96 + 0, w: 8, h: 8 },
    },
    systemSelectorTopRight: {
      frame: { x: 16, y: 96 + 0, w: 8, h: 8 },
    },
    systemSelectorBottomLeft: {
      frame: { x: 0, y: 96 + 16, w: 8, h: 8 },
    },
    systemSelectorBottomRight: {
      frame: { x: 16, y: 96 + 16, w: 8, h: 8 },
    },
    systemSelectorCenterLeft: {
      frame: { x: 0, y: 96 + 8, w: 8, h: 8 },
    },
    systemSelectorCenterRight: {
      frame: { x: 16, y: 96 + 8, w: 8, h: 8 },
    },
    systemSelectorTopCenter: {
      frame: { x: 8, y: 96 + 0, w: 8, h: 8 },
    },
    systemSelectorBottomCenter: {
      frame: { x: 8, y: 96 + 16, w: 8, h: 8 },
    },
    systemSelectorCenterCenter: {
      frame: { x: 8, y: 96 + 8, w: 8, h: 8 },
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
