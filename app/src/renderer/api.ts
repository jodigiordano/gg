import {
  Application,
  AbstractRenderer,
  TilingSprite,
  Container,
  Spritesheet,
  Ticker,
} from "pixi.js";
import { createGrid, redrawGrid } from "./grid.js";
import { createSimulation, drawSimulation as drawVisualSimulation } from "./simulation.js";
import { createFlow, drawFlow, drawFlowTick as drawVisualFlowTick } from "./flow.js";
import SystemSelector from "./systemSelector.js";
import SystemLinker from "./systemLinker.js";
import { loadFonts, loadSpritesheet } from "./assets.js";
import { Viewport } from "./viewport.js";
import {
  SimulatorObject,
  SimulatorBoundaries,
  RuntimeFlow,
  RuntimeSubsystem,
  RuntimePosition,
} from "@gg/core";

//
// Initialize.
//

AbstractRenderer.defaultOptions.roundPixels = true;
AbstractRenderer.defaultOptions.failIfMajorPerformanceCaveat = false;

let app: Application;
let viewport: Viewport;
let grid: TilingSprite;
let simulation: Container;
let flow: Container;
let spritesheet: Spritesheet;

const systemSelectors: Record<string, SystemSelector> = {};
const systemLinkers: Record<string, SystemLinker> = {};

const rendererContainer = document.getElementById(
  "renderer",
) as HTMLCanvasElement;

const canvasContainer = document.getElementById("canvas") as HTMLCanvasElement;

// Prevent opening right-click context menu.
rendererContainer.addEventListener("contextmenu", event => {
  event.preventDefault();
  event.stopPropagation();
});

// Initialize PixiJS app.
app = new Application();

await app.init({
  backgroundAlpha: 0,
  width: rendererContainer.clientWidth,
  height: rendererContainer.clientHeight,
  resolution: window.devicePixelRatio,
  canvas: canvasContainer,
  autoDensity: true,
  antialias: false,
  autoStart: false,
  sharedTicker: false,
});

await loadFonts();

spritesheet = await loadSpritesheet();

app.stage.eventMode = "static";
app.stage.interactiveChildren = true;

app.ticker.stop();

viewport = new Viewport(rendererContainer.clientWidth, rendererContainer.clientHeight);

app.stage.addChild(viewport);

// Initialize background grid layer.
grid = createGrid(app);

viewport.addChild(grid);

redrawGrid(grid, viewport);

// Initialize the simulation layer.
simulation = createSimulation();

viewport.addChild(simulation);

// Initialize the flow layer.
flow = createFlow();

viewport.addChild(flow);

//
// Canvas operations
//

export function resizeCanvas(): void {
  app.renderer.resize(rendererContainer.clientWidth, rendererContainer.clientHeight);

  viewport.resize(rendererContainer.clientWidth, rendererContainer.clientHeight);

  if (grid.visible) {
    redrawGrid(grid, viewport);
  }

  app.ticker.update();
}

export async function screenshotCanvas(): Promise<Blob> {
  const gridWasVisible = grid.visible;
  const flowWasVisible = flow.visible;

  grid.visible = false;
  flow.visible = false;

  const texture = app.renderer.textureGenerator.generateTexture(viewport);
  const canvas = app.renderer.texture.generateCanvas(texture);

  texture.destroy();

  // @ts-ignore
  const imageData = await canvas.convertToBlob();

  grid.visible = gridWasVisible;
  flow.visible = flowWasVisible;

  return imageData;
}

//
// Viewport operations
//

export function setViewport(
  x: number,
  y: number,
  scale: number,
): void {
  viewport.scale.set(scale);
  viewport.position.set(x, y);

  if (grid.visible) {
    redrawGrid(grid, viewport);
  }

  app.ticker.update();
}

//
// Ticker operations
//

const ticker = new Ticker();

ticker.stop();

export function startTicker() {
  ticker.start();
}

export function stopTicker() {
  ticker.stop();
}

export function onTick(callback: (t: Ticker) => void): void {
  ticker.add(callback);
}

//
// Grid operations
//

export function setGridVisible(visible: boolean): void {
  grid.visible = visible;

  app.ticker.update();
}

//
// Simulation operations
//

export function drawSimulation(
  layout: SimulatorObject[][][],
  boundaries: SimulatorBoundaries,
  flowData: RuntimeFlow,
): void {
  drawVisualSimulation(
    simulation,
    layout,
    boundaries,
    spritesheet,
  );

  drawFlow(flow, flowData, spritesheet);

  app.ticker.update();
}

//
// Flow operations
//

export function drawFlowTick(
  dataPositions: number[][],
  boundaries: SimulatorBoundaries,
): void {
  drawVisualFlowTick(flow, dataPositions, boundaries);

  app.ticker.update();
}

export function setFlowVisible(visible: boolean): void {
  flow.visible = visible;

  app.ticker.update();
}

//
// System linker operations
//

export function createSystemLinker(): string {
  const id = crypto.randomUUID();

  const linker = new SystemLinker();

  systemLinkers[id] = linker;

  viewport.addChild(linker);

  return id;
}

export function setSystemLinkerVisible(id: string, visible: boolean): void {
  const linker = systemLinkers[id];

  linker.visible = visible;

  app.ticker.update();
}

export function setSystemLinkerPosition(
  id: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  const linker = systemLinkers[id];

  linker.setPosition(
    x1,
    y1,
    x2,
    y2,
  );

  app.ticker.update();
}

//
// System selector operations
//

export function createSystemSelector(): string {
  const id = crypto.randomUUID();

  const selector = new SystemSelector(spritesheet);

  systemSelectors[id] = selector;

  viewport.addChild(selector);

  return id;
}

export function setSystemSelectorVisible(id: string, visible: boolean): void {
  const selector = systemSelectors[id];

  selector.visible = visible;

  app.ticker.update();
}

export function setSystemSelectorPosition(
  id: string,
  subsystem: RuntimeSubsystem,
  delta: RuntimePosition,
): void {
  const x1 = subsystem.position.x + delta.x;
  const y1 = subsystem.position.y + delta.y;
  const x2 = subsystem.position.x + delta.x + subsystem.size.width - 1;
  const y2 = subsystem.position.y + delta.y + subsystem.size.height - 1;

  setSystemSelectorPositionRect(id, x1, y1, x2, y2);
}

export function setSystemSelectorPositionRect(
  id: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  const selector = systemSelectors[id];

  selector.setPosition(
    x1,
    y1,
    x2,
    y2,
  );

  app.ticker.update();
}
