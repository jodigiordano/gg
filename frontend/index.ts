import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { getObjectsToRender } from './simulation.js';
import { BlockSize } from './consts.js';

// Setup PixiJS.
PIXI.settings.MIPMAP_TEXTURES = PIXI.MIPMAP_MODES.ON
PIXI.settings.ROUND_PIXELS = true
PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.LINEAR
PIXI.settings.WRAP_MODE = PIXI.WRAP_MODES.REPEAT

// Create PixiJS app.
const app = new PIXI.Application<HTMLCanvasElement>({
  background: '#1099bb',
  resizeTo: window,
  autoDensity: true,
  resolution: window.devicePixelRatio,
  antialias: false,
});

// Create PixiJS viewport.
const viewport = new Viewport({
  screenWidth: window.innerWidth,
  screenHeight: window.innerHeight,
  worldWidth: window.innerWidth,
  worldHeight: window.innerHeight,
  events: app.renderer.events,
})

viewport
  .drag()
  .pinch()
  .wheel({ smooth: 5 })
  .clampZoom({
    minScale: 0.5,
    maxScale: 2.0,
  })

app.stage.addChild(viewport);

// Create grid background.
const backgroundGraphic = new PIXI.Graphics()
  .beginFill(0xcccccc)
  .drawRect(0, 0, BlockSize, BlockSize)
  .endFill()
  .beginFill(0xdddddd)
  .drawRect(1, 1, BlockSize - 1, BlockSize - 1)
  .endFill();

const backgroundTexture = app.renderer.generateTexture(backgroundGraphic);

const grid = new PIXI.TilingSprite(
  backgroundTexture,
  viewport.worldWidth,
  viewport.worldHeight
);

grid.y = viewport.top
grid.x = viewport.left

// Build the graph of rendered objects.
viewport.addChild(grid);

for (const objectToRender of getObjectsToRender(app, { x: viewport.top, y: viewport.left })) {
  viewport.addChild(objectToRender);
}

// Redraw the grid when some event occurs.
function redrawGrid(): void {
  grid.tilePosition.y = -viewport.top
  grid.tilePosition.x = -viewport.left
  grid.y = viewport.top
  grid.x = viewport.left

  grid.width = window.innerWidth / viewport.scale.x
  grid.height = window.innerHeight / viewport.scale.y
}

// Move the grid when the viewport is moved.
// TODO: debounce ?
viewport.on('moved', redrawGrid);

// TODO: debounce
window.addEventListener('resize', () => {
  app.renderer.resize(window.innerWidth, window.innerHeight);

  viewport.resize(
    window.innerWidth,
    window.innerHeight,
  );

  redrawGrid();
});

// add PixiJS to the DOM.
document.body.appendChild(app.view);

// TODO: make sure the app consume the least amount of CPU / memory possible.
// TODO: the ticker should be controlled manually so when nothing moves on the
// TODO: screen, we don't refresh.
// app.ticker.stop();
