import { Graphics, SCALE_MODES, TilingSprite } from "pixi.js";
import { BlockSize } from "../helpers.js";
import { app } from "../pixi.js";
import { viewport } from "../viewport.js";

let grid: TilingSprite;

const canvasContainer = document.getElementById("canvas") as HTMLDivElement;

const gridGraphic = new Graphics()
  .beginFill(0xcccccc)
  .drawRect(0, 0, BlockSize, BlockSize)
  .endFill()
  .beginFill(0xdddddd)
  .drawRect(1, 1, BlockSize - 1, BlockSize - 1)
  .endFill();

const gridTexture = app.renderer.generateTexture(gridGraphic);

gridTexture.baseTexture.scaleMode = SCALE_MODES.LINEAR;

grid = new TilingSprite(gridTexture, viewport.worldWidth, viewport.worldHeight);

grid.x = viewport.left;
grid.y = viewport.top;
grid.zIndex = -1;

viewport.addChild(grid);

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
