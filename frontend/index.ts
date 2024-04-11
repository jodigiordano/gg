import {
  Application,
  Graphics,
  TilingSprite,
  settings,
  MIPMAP_MODES,
  SCALE_MODES,
  WRAP_MODES,
  BaseTexture,
} from "pixi.js";
// @ts-ignore FIXME
import { Viewport } from "pixi-viewport";
import {
  getFlowToRender,
  getObjectsToRender,
  getSystemBoundaries,
} from "./simulation.js";
import { BlockSize } from "./consts.js";

// Setup PixiJS.
BaseTexture.defaultOptions.mipmap = MIPMAP_MODES.ON;
BaseTexture.defaultOptions.scaleMode = SCALE_MODES.LINEAR;
BaseTexture.defaultOptions.wrapMode = WRAP_MODES.REPEAT;

settings.ROUND_PIXELS = true;

const domContainer = document.getElementById("canvas") as HTMLDivElement;

// Create PixiJS app.
const app = new Application({
  background: "#1099bb",
  resizeTo: domContainer,
  autoDensity: true,
  resolution: window.devicePixelRatio,
  antialias: false,
});

// Create PixiJS viewport.
const viewport = new Viewport({
  screenWidth: window.innerWidth,
  screenHeight: window.innerHeight,
  worldWidth: domContainer.clientWidth,
  worldHeight: domContainer.clientHeight,
  events: app.renderer.events,
});

viewport.drag().pinch().wheel({ smooth: 5 }).clampZoom({
  minScale: 0.5,
  maxScale: 2.0,
});

app.stage.addChild(viewport);

// Create grid background.
const backgroundGraphic = new Graphics()
  .beginFill(0xcccccc)
  .drawRect(0, 0, BlockSize, BlockSize)
  .endFill()
  .beginFill(0xdddddd)
  .drawRect(1, 1, BlockSize - 1, BlockSize - 1)
  .endFill();

const backgroundTexture = app.renderer.generateTexture(backgroundGraphic);

const grid = new TilingSprite(
  backgroundTexture,
  viewport.worldWidth,
  viewport.worldHeight,
);

grid.y = viewport.top;
grid.x = viewport.left;

// Build the graph of rendered objects.
viewport.addChild(grid);

for (const objectToRender of getObjectsToRender(app, {
  x: viewport.top,
  y: viewport.left,
})) {
  viewport.addChild(objectToRender);
}

for (const objectToRender of getFlowToRender(
  app,
  {
    x: viewport.top,
    y: viewport.left,
  },
  "f1",
)) {
  viewport.addChild(objectToRender);
}

// Redraw the grid when some event occurs.
function redrawGrid(): void {
  grid.tilePosition.y = -viewport.top;
  grid.tilePosition.x = -viewport.left;
  grid.y = viewport.top;
  grid.x = viewport.left;

  grid.width = domContainer.clientWidth / viewport.scale.x;
  grid.height = domContainer.clientHeight / viewport.scale.y;
}

// Move the grid when the viewport is moved.
// TODO: debounce ?
viewport.on("moved", redrawGrid);

// TODO: debounce
window.addEventListener("resize", () => {
  app.renderer.resize(domContainer.clientWidth, domContainer.clientHeight);

  viewport.resize(domContainer.clientWidth, domContainer.clientHeight);

  redrawGrid();
});

document
  .getElementById("operation-recenter")
  ?.addEventListener("click", function () {
    const boundaries = getSystemBoundaries();
    const width = boundaries.right - boundaries.left;
    const height = boundaries.bottom - boundaries.top;

    viewport.moveCenter(
      boundaries.left + width / 2,
      boundaries.top + height / 2,
    );
    viewport.fit(true, width, height);

    redrawGrid();
  });

document
  .getElementById("operation-zoom-in")
  ?.addEventListener("click", function () {
    viewport.zoomPercent(0.25, true);

    redrawGrid();
  });

document
  .getElementById("operation-zoom-out")
  ?.addEventListener("click", function () {
    viewport.zoomPercent(-0.25, true);

    redrawGrid();
  });

// add PixiJS to the DOM.
// @ts-ignore FIXME
document.getElementById("canvas")?.replaceChildren(app.view);

// TODO: make sure the app consume the least amount of CPU / memory possible.
// TODO: the ticker should be controlled manually so when nothing moves on the
// TODO: screen, we don't refresh.
// app.ticker.stop();
