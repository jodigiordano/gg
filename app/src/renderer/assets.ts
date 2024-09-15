import {
  Assets,
  ISpritesheetFrameData,
  MIPMAP_MODES,
  SCALE_MODES,
  Spritesheet,
  WRAP_MODES,
} from "pixi.js";
import spritesheetData from "../assets/spritesheet.png?base64";
import awsSpritesheetAtlas from "@gg/icons/dist/aws.json";
import awsSpritesheetDataUrl from "@gg/icons/dist/aws.png";
import gcpSpritesheetAtlas from "@gg/icons/dist/gcp.json";
import gcpSpritesheetUrl from "@gg/icons/dist/gcp.png";
import azureSpritesheetAtlas from "@gg/icons/dist/azure.json";
import azureSpritesheetUrl from "@gg/icons/dist/azure.png";
import k8sSpritesheetAtlas from "@gg/icons/dist/k8s.json";
import k8sSpritesheetUrl from "@gg/icons/dist/k8s.png";
import devSpritesheetAtlas from "@gg/icons/dist/dev.json";
import devSpritesheetUrl from "@gg/icons/dist/dev.png";
import networkSpritesheetAtlas from "@gg/icons/dist/network.json";
import networkSpritesheetUrl from "@gg/icons/dist/network.png";

//
// Assets to load.
//

const toLoad: { name: string; url: string; data: Record<string, unknown> }[] = [
  { name: "text", url: "arimo.ttf", data: { family: "text" } },
  { name: "sketch", url: "monaspace.radon.ttf", data: { family: "sketch" } },
  { name: "code", url: "roboto.ttf", data: { family: "code" } },
  { name: "icons-aws", url: awsSpritesheetDataUrl, data: {} },
  { name: "icons-gcp", url: gcpSpritesheetUrl, data: {} },
  { name: "icons-azure", url: azureSpritesheetUrl, data: {} },
  { name: "icons-k8s", url: k8sSpritesheetUrl, data: {} },
  { name: "icons-dev", url: devSpritesheetUrl, data: {} },
  { name: "icons-network", url: networkSpritesheetUrl, data: {} },
];

const assets: Promise<any>[] = [];

for (const asset of toLoad) {
  assets.push(
    Assets.load({
      name: asset.name,
      src: asset.url,
      data: asset.data,
    }),
  );
}

await Promise.all(assets);

//
// Icons.
//

export const iconPacks: Record<string, Spritesheet> = {};

interface Icon {
  x: number;
  y: number;
  width: number;
  height: number;
}

const packs: { name: string; atlas: Record<string, Icon> }[] = [
  { name: "icons-aws", atlas: awsSpritesheetAtlas },
  { name: "icons-gcp", atlas: gcpSpritesheetAtlas },
  { name: "icons-azure", atlas: azureSpritesheetAtlas },
  { name: "icons-k8s", atlas: k8sSpritesheetAtlas },
  { name: "icons-dev", atlas: devSpritesheetAtlas },
  { name: "icons-network", atlas: networkSpritesheetAtlas },
];

for (const pack of packs) {
  const frames: Record<string, ISpritesheetFrameData> = {};

  for (const [key, icon] of Object.entries(pack.atlas)) {
    frames[key] = {
      frame: {
        x: icon.x,
        y: icon.y,
        w: icon.width,
        h: icon.height,
      },
    };
  }

  const spritesheet = new Spritesheet(Assets.get(pack.name), {
    frames,
    meta: {
      scale: 1,
    },
  });

  await spritesheet.parse();

  spritesheet.baseTexture.wrapMode = WRAP_MODES.REPEAT;
  spritesheet.baseTexture.scaleMode = SCALE_MODES.LINEAR;
  spritesheet.baseTexture.mipmap = MIPMAP_MODES.OFF;

  iconPacks[pack.name] = spritesheet;
}

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
