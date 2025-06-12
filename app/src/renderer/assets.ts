import {
  Assets,
  ISpritesheetFrameData,
  MIPMAP_MODES,
  SCALE_MODES,
  Spritesheet,
  WRAP_MODES,
} from "pixi.js";
import spritesheetData from "../assets/spritesheet.png?base64";
import awsSpritesheetAtlas from "@gg/icons/dist/aws.json" with { type: "json" };
import awsSpritesheetDataUrl from "@gg/icons/dist/aws.png";
import gcpSpritesheetAtlas from "@gg/icons/dist/gcp.json" with { type: "json" };
import gcpSpritesheetUrl from "@gg/icons/dist/gcp.png";
import azureSpritesheetAtlas from "@gg/icons/dist/azure.json" with { type: "json" };
import azureSpritesheetUrl from "@gg/icons/dist/azure.png";
import k8sSpritesheetAtlas from "@gg/icons/dist/k8s.json" with { type: "json" };
import k8sSpritesheetUrl from "@gg/icons/dist/k8s.png";
import networkSpritesheetAtlas from "@gg/icons/dist/network.json" with { type: "json" };
import networkSpritesheetUrl from "@gg/icons/dist/network.png";

//
// Assets to load.
//

const toLoad: { name: string; url: string; data: Record<string, unknown> }[] = [
  { name: "text", url: "arimo-regular.woff2", data: { family: "text" } },
  { name: "text-bold", url: "arimo-bold.woff2", data: { family: "text-bold" } },
  {
    name: "sketch",
    url: "monaspace-radon-regular.woff2",
    data: { family: "sketch" },
  },
  {
    name: "sketch-bold",
    url: "monaspace-radon-bold.woff2",
    data: { family: "sketch-bold" },
  },
  { name: "code", url: "jetbrains-regular.woff2", data: { family: "code" } },
  {
    name: "code-bold",
    url: "jetbrains-bold.woff2",
    data: { family: "code-bold" },
  },
  { name: "emoji", url: "twemoji.ttf", data: { family: "emoji" } },
  { name: "icons-aws", url: awsSpritesheetDataUrl, data: {} },
  { name: "icons-gcp", url: gcpSpritesheetUrl, data: {} },
  { name: "icons-azure", url: azureSpritesheetUrl, data: {} },
  { name: "icons-k8s", url: k8sSpritesheetUrl, data: {} },
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
const boxDotted = loadRectangle(2, 80);
const boxSolid = loadRectangle(28, 54);
const boxRound = loadRectangle(80, 2);
const boxRoundDotted = loadRectangle(80, 80);
const boxRoundSolid = loadRectangle(80, 54);
const listItem = loadRectangle(28, 80);
const listItemRound = loadRectangle(80, 28);
const systemSelector = loadRectangle(2, 28);
const linkLabel = loadRectangle(2, 54);
const linkLabelDotted = loadRectangle(54, 80);
const linkLabelSolid = loadRectangle(54, 54);
const linkLabelRound = loadRectangle(106, 28);
const linkLabelRoundDotted = loadRectangle(106, 80);
const linkLabelRoundSolid = loadRectangle(106, 54);

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
    boxDottedTopLeft: { frame: boxDotted.topLeft },
    boxDottedTopRight: { frame: boxDotted.topRight },
    boxDottedBottomLeft: { frame: boxDotted.bottomLeft },
    boxDottedBottomRight: { frame: boxDotted.bottomRight },
    boxDottedCenterLeft: { frame: boxDotted.centerLeft },
    boxDottedCenterRight: { frame: boxDotted.centerRight },
    boxDottedTopCenter: { frame: boxDotted.topCenter },
    boxDottedBottomCenter: { frame: boxDotted.bottomCenter },
    boxDottedCenterCenter: { frame: boxDotted.centerCenter },
    boxSolidTopLeft: { frame: boxSolid.topLeft },
    boxSolidTopRight: { frame: boxSolid.topRight },
    boxSolidBottomLeft: { frame: boxSolid.bottomLeft },
    boxSolidBottomRight: { frame: boxSolid.bottomRight },
    boxSolidCenterLeft: { frame: boxSolid.centerLeft },
    boxSolidCenterRight: { frame: boxSolid.centerRight },
    boxSolidTopCenter: { frame: boxSolid.topCenter },
    boxSolidBottomCenter: { frame: boxSolid.bottomCenter },
    boxSolidCenterCenter: { frame: boxSolid.centerCenter },
    boxRoundTopLeft: { frame: boxRound.topLeft },
    boxRoundTopRight: { frame: boxRound.topRight },
    boxRoundBottomLeft: { frame: boxRound.bottomLeft },
    boxRoundBottomRight: { frame: boxRound.bottomRight },
    boxRoundCenterLeft: { frame: boxRound.centerLeft },
    boxRoundCenterRight: { frame: boxRound.centerRight },
    boxRoundTopCenter: { frame: boxRound.topCenter },
    boxRoundBottomCenter: { frame: boxRound.bottomCenter },
    boxRoundCenterCenter: { frame: boxRound.centerCenter },
    boxRoundDottedTopLeft: { frame: boxRoundDotted.topLeft },
    boxRoundDottedTopRight: { frame: boxRoundDotted.topRight },
    boxRoundDottedBottomLeft: { frame: boxRoundDotted.bottomLeft },
    boxRoundDottedBottomRight: { frame: boxRoundDotted.bottomRight },
    boxRoundDottedCenterLeft: { frame: boxRoundDotted.centerLeft },
    boxRoundDottedCenterRight: { frame: boxRoundDotted.centerRight },
    boxRoundDottedTopCenter: { frame: boxRoundDotted.topCenter },
    boxRoundDottedBottomCenter: { frame: boxRoundDotted.bottomCenter },
    boxRoundDottedCenterCenter: { frame: boxRoundDotted.centerCenter },
    boxRoundSolidTopLeft: { frame: boxRoundSolid.topLeft },
    boxRoundSolidTopRight: { frame: boxRoundSolid.topRight },
    boxRoundSolidBottomLeft: { frame: boxRoundSolid.bottomLeft },
    boxRoundSolidBottomRight: { frame: boxRoundSolid.bottomRight },
    boxRoundSolidCenterLeft: { frame: boxRoundSolid.centerLeft },
    boxRoundSolidCenterRight: { frame: boxRoundSolid.centerRight },
    boxRoundSolidTopCenter: { frame: boxRoundSolid.topCenter },
    boxRoundSolidBottomCenter: { frame: boxRoundSolid.bottomCenter },
    boxRoundSolidCenterCenter: { frame: boxRoundSolid.centerCenter },
    listItemTopLeft: { frame: listItem.topLeft },
    listItemTopRight: { frame: listItem.topRight },
    listItemBottomLeft: { frame: listItem.bottomLeft },
    listItemBottomRight: { frame: listItem.bottomRight },
    listItemCenterLeft: { frame: listItem.centerLeft },
    listItemCenterRight: { frame: listItem.centerRight },
    listItemTopCenter: { frame: listItem.topCenter },
    listItemBottomCenter: { frame: listItem.bottomCenter },
    listItemCenterCenter: { frame: listItem.centerCenter },
    listItemRoundTopLeft: { frame: listItemRound.topLeft },
    listItemRoundTopRight: { frame: listItemRound.topRight },
    listItemRoundBottomLeft: { frame: listItemRound.bottomLeft },
    listItemRoundBottomRight: { frame: listItemRound.bottomRight },
    listItemRoundCenterLeft: { frame: listItemRound.centerLeft },
    listItemRoundCenterRight: { frame: listItemRound.centerRight },
    listItemRoundTopCenter: { frame: listItemRound.topCenter },
    listItemRoundBottomCenter: { frame: listItemRound.bottomCenter },
    listItemRoundCenterCenter: { frame: listItemRound.centerCenter },
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
    linkLabelDottedTopLeft: { frame: linkLabelDotted.topLeft },
    linkLabelDottedTopRight: { frame: linkLabelDotted.topRight },
    linkLabelDottedBottomLeft: { frame: linkLabelDotted.bottomLeft },
    linkLabelDottedBottomRight: { frame: linkLabelDotted.bottomRight },
    linkLabelDottedCenterLeft: { frame: linkLabelDotted.centerLeft },
    linkLabelDottedCenterRight: { frame: linkLabelDotted.centerRight },
    linkLabelDottedTopCenter: { frame: linkLabelDotted.topCenter },
    linkLabelDottedBottomCenter: { frame: linkLabelDotted.bottomCenter },
    linkLabelDottedCenterCenter: { frame: linkLabelDotted.centerCenter },
    linkLabelSolidTopLeft: { frame: linkLabelSolid.topLeft },
    linkLabelSolidTopRight: { frame: linkLabelSolid.topRight },
    linkLabelSolidBottomLeft: { frame: linkLabelSolid.bottomLeft },
    linkLabelSolidBottomRight: { frame: linkLabelSolid.bottomRight },
    linkLabelSolidCenterLeft: { frame: linkLabelSolid.centerLeft },
    linkLabelSolidCenterRight: { frame: linkLabelSolid.centerRight },
    linkLabelSolidTopCenter: { frame: linkLabelSolid.topCenter },
    linkLabelSolidBottomCenter: { frame: linkLabelSolid.bottomCenter },
    linkLabelSolidCenterCenter: { frame: linkLabelSolid.centerCenter },
    linkLabelRoundTopLeft: { frame: linkLabelRound.topLeft },
    linkLabelRoundTopRight: { frame: linkLabelRound.topRight },
    linkLabelRoundBottomLeft: { frame: linkLabelRound.bottomLeft },
    linkLabelRoundBottomRight: { frame: linkLabelRound.bottomRight },
    linkLabelRoundCenterLeft: { frame: linkLabelRound.centerLeft },
    linkLabelRoundCenterRight: { frame: linkLabelRound.centerRight },
    linkLabelRoundTopCenter: { frame: linkLabelRound.topCenter },
    linkLabelRoundBottomCenter: { frame: linkLabelRound.bottomCenter },
    linkLabelRoundCenterCenter: { frame: linkLabelRound.centerCenter },
    linkLabelRoundDottedTopLeft: { frame: linkLabelRoundDotted.topLeft },
    linkLabelRoundDottedTopRight: { frame: linkLabelRoundDotted.topRight },
    linkLabelRoundDottedBottomLeft: { frame: linkLabelRoundDotted.bottomLeft },
    linkLabelRoundDottedBottomRight: {
      frame: linkLabelRoundDotted.bottomRight,
    },
    linkLabelRoundDottedCenterLeft: { frame: linkLabelRoundDotted.centerLeft },
    linkLabelRoundDottedCenterRight: {
      frame: linkLabelRoundDotted.centerRight,
    },
    linkLabelRoundDottedTopCenter: { frame: linkLabelRoundDotted.topCenter },
    linkLabelRoundDottedBottomCenter: {
      frame: linkLabelRoundDotted.bottomCenter,
    },
    linkLabelRoundDottedCenterCenter: {
      frame: linkLabelRoundDotted.centerCenter,
    },
    linkLabelRoundSolidTopLeft: { frame: linkLabelRoundSolid.topLeft },
    linkLabelRoundSolidTopRight: { frame: linkLabelRoundSolid.topRight },
    linkLabelRoundSolidBottomLeft: { frame: linkLabelRoundSolid.bottomLeft },
    linkLabelRoundSolidBottomRight: { frame: linkLabelRoundSolid.bottomRight },
    linkLabelRoundSolidCenterLeft: { frame: linkLabelRoundSolid.centerLeft },
    linkLabelRoundSolidCenterRight: { frame: linkLabelRoundSolid.centerRight },
    linkLabelRoundSolidTopCenter: { frame: linkLabelRoundSolid.topCenter },
    linkLabelRoundSolidBottomCenter: {
      frame: linkLabelRoundSolid.bottomCenter,
    },
    linkLabelRoundSolidCenterCenter: {
      frame: linkLabelRoundSolid.centerCenter,
    },
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
    linkDoubleSolidArrow: { frame: { x: 48, y: 22, w: 8, h: 8 } },
  },
  meta: {
    image: "spritesheet.png",
    format: "RGBA8888",
    size: { w: 256, h: 256 },
    scale: 1,
  },
});

await spritesheet.parse();

spritesheet.baseTexture.wrapMode = WRAP_MODES.REPEAT;
spritesheet.baseTexture.scaleMode = SCALE_MODES.NEAREST;
spritesheet.baseTexture.mipmap = MIPMAP_MODES.POW2;
