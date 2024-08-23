import {
  Graphics,
  WRAP_MODES,
  SCALE_MODES,
  MIPMAP_MODES,
  TilingSprite,
} from "pixi.js";
import { BlockSize } from "../helpers.js";
import { app } from "./pixi.js";
import viewport from "./viewport.js";
import { state } from "../state.js";

let grid: TilingSprite;

const canvasContainer = document.getElementById("canvas") as HTMLDivElement;

//
// Light grid
//

const lightGridGraphic = new Graphics()
  .beginFill(0xcccccc)
  .drawRect(0, 0, BlockSize, BlockSize)
  .endFill()
  .beginFill(0xdddddd)
  .drawRect(1, 1, BlockSize - 1, BlockSize - 1)
  .endFill();

const lightGridTexture = app.renderer.generateTexture(lightGridGraphic);

lightGridTexture.baseTexture.wrapMode = WRAP_MODES.REPEAT;
lightGridTexture.baseTexture.scaleMode = SCALE_MODES.LINEAR;
lightGridTexture.baseTexture.mipmap = MIPMAP_MODES.ON;

//
// Dark grid
//

const darkGridGraphic = new Graphics()
  .beginFill(0x333333)
  .drawRect(0, 0, BlockSize, BlockSize)
  .endFill()
  .beginFill(0x222222)
  .drawRect(1, 1, BlockSize - 1, BlockSize - 1)
  .endFill();

const darkGridTexture = app.renderer.generateTexture(darkGridGraphic);

darkGridTexture.baseTexture.wrapMode = WRAP_MODES.REPEAT;
darkGridTexture.baseTexture.scaleMode = SCALE_MODES.LINEAR;
darkGridTexture.baseTexture.mipmap = MIPMAP_MODES.ON;

grid = new TilingSprite(
  state.theme === "light" ? lightGridTexture : darkGridTexture,
  canvasContainer.clientWidth,
  canvasContainer.clientHeight,
);

grid.x = viewport.left;
grid.y = viewport.top;
grid.zIndex = -1;

// @ts-ignore
viewport.addChild(grid);

export function setGridTheme(theme: "light" | "dark"): void {
  if (theme === "light") {
    grid.texture = lightGridTexture;
  } /* dark */ else {
    grid.texture = darkGridTexture;
  }
}

export function redrawGrid(): void {
  grid.tilePosition.x = -viewport.left;
  grid.tilePosition.y = -viewport.top;

  grid.x = viewport.left;
  grid.y = viewport.top;

  grid.width = canvasContainer.clientWidth / viewport.scale.x;
  grid.height = canvasContainer.clientHeight / viewport.scale.y;
}

export function setGridVisible(visible: boolean): void {
  grid.visible = visible;
}
