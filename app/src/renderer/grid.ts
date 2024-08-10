import { Graphics, TilingSprite } from "pixi.js";
import { BlockSize } from "../helpers.js";
import { app } from "./pixi.js";
import viewport from "./viewport.js";

let grid: TilingSprite;

const canvasContainer = document.getElementById("canvas") as HTMLDivElement;

const gridGraphic = new Graphics()
  .rect(0, 0, BlockSize, BlockSize)
  .fill(0xcccccc)
  .rect(1, 1, BlockSize - 1, BlockSize - 1)
  .fill(0xdddddd);

const gridTexture = app.renderer.generateTexture(gridGraphic);

gridTexture.source.antialias = true;
gridTexture.source.autoGenerateMipmaps = true;
gridTexture.source.scaleMode = "linear";
gridTexture.source.addressMode = "clamp-to-edge";

grid = new TilingSprite({
  texture: gridTexture,
  width: canvasContainer.clientWidth,
  height: canvasContainer.clientHeight,
});

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
