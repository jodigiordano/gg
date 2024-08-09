import { Application, Graphics, TilingSprite } from "pixi.js";
import { BlockSize } from "./helpers.js";
import { Viewport } from "./viewport.js";

export function createGrid(app: Application): TilingSprite {
  const gridGraphic = new Graphics()
    .rect(0, 0, BlockSize, BlockSize)
    .fill(0xcccccc)
    .rect(1, 1, BlockSize - 1, BlockSize - 1)
    .fill(0xdddddd);

  const gridTexture = app.renderer.generateTexture(gridGraphic);

  gridTexture.source.scaleMode = "linear";

  const grid = new TilingSprite({
    texture: gridTexture,
    width: app.stage.width,
    height: app.stage.height,
  });

  grid.x = app.stage.x;
  grid.y = app.stage.y;
  grid.zIndex = -1;

  return grid;
}

export function redrawGrid(grid: TilingSprite, viewport: Viewport): void {
  grid.tilePosition.x = -viewport.getLeft();
  grid.tilePosition.y = -viewport.getTop();

  grid.x = viewport.getLeft();
  grid.y = viewport.getTop();

  grid.width = viewport.getWorldScreenWidth();
  grid.height = viewport.getWorldScreenHeight();
}
