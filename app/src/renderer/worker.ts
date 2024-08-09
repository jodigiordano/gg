import {
  Application,
  AbstractRenderer,
  TilingSprite,
  Container,
  Spritesheet,
  DOMAdapter,
  WebWorkerAdapter,
} from "pixi.js";
import { createGrid, redrawGrid } from "./grid.js";
import { createSimulation, drawSimulation } from "./simulation.js";
import { createFlow, drawFlow, drawFlowTick } from "./flow.js";
import SystemSelector from "./systemSelector.js";
import SystemLinker from "./systemLinker.js";
import { loadFonts, loadSpritesheet } from "./assets.js";
import { Viewport } from "./viewport.js";

AbstractRenderer.defaultOptions.roundPixels = true;
AbstractRenderer.defaultOptions.failIfMajorPerformanceCaveat = false;

DOMAdapter.set(WebWorkerAdapter);

let app: Application;
let viewport: Viewport;
let grid: TilingSprite;
let simulation: Container;
let flow: Container;
let spritesheet: Spritesheet;

const systemSelectors: Record<string, SystemSelector> = {};
const systemLinkers: Record<string, SystemLinker> = {};

self.onmessage = async event => {
  if (event.data.operation === "initialize") {
    // Initialize PixiJS app.
    app = new Application();

    await app.init({
      backgroundAlpha: 0,
      width: event.data.width,
      height: event.data.height,
      resolution: event.data.resolution,
      canvas: event.data.view,
      autoDensity: false,
      antialias: false,
      autoStart: false,
      sharedTicker: false,
    });

    await loadFonts();

    spritesheet = await loadSpritesheet();

    app.stage.eventMode = "static";
    app.stage.interactiveChildren = true;

    app.ticker.stop();

    viewport = new Viewport(event.data.width, event.data.height);

    app.stage.addChild(viewport);

    // Initialize background grid layer.
    grid = createGrid(app);

    viewport.addChild(grid);

    if (event.data.grid) {
      redrawGrid(grid, viewport);
      grid.visible = true;
    } else {
      grid.visible = false;
    }

    // Initialize the simulation layer.
    simulation = createSimulation();

    viewport.addChild(simulation);

    // Initialize the flow layer.
    flow = createFlow();

    viewport.addChild(flow);

    postMessage({
      operationId: event.data.operationId,
      operation: event.data.operation,
      success: true,
    });
  } else if (event.data.operation === "startTicker") {
    app.ticker.start();
  } else if (event.data.operation === "stopTicker") {
    app.ticker.stop();
  } else if (event.data.operation === "resizeCanvas") {
    app.renderer.resize(event.data.width, event.data.height);

    viewport.resize(event.data.width, event.data.height);

    if (grid.visible) {
      redrawGrid(grid, viewport);
    }

    app.ticker.update();

    postMessage({
      operationId: event.data.operationId,
      operation: event.data.operation,
    });
  } else if (event.data.operation === "screenshotCanvas") {
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

    postMessage({
      operationId: event.data.operationId,
      operation: event.data.operation,
      imageData,
    });
  } else if (event.data.operation === "setViewport") {
    viewport.scale.set(event.data.scale);
    viewport.position.set(event.data.x, event.data.y);

    if (grid.visible) {
      redrawGrid(grid, viewport);
    }

    app.ticker.update();

    postMessage({
      operationId: event.data.operationId,
      operation: event.data.operation,
    });
  } else if (event.data.operation === "setGridVisible") {
    grid.visible = event.data.visible;

    app.ticker.update();

    postMessage({
      operationId: event.data.operationId,
      operation: event.data.operation,
    });
  } else if (event.data.operation === "drawSimulation") {
    drawSimulation(
      simulation,
      event.data.layout,
      event.data.boundaries,
      spritesheet,
    );

    drawFlow(flow, event.data.flow, spritesheet);

    app.ticker.update();

    postMessage({
      operationId: event.data.operationId,
      operation: event.data.operation,
    });
  } else if (event.data.operation === "drawFlowTick") {
    drawFlowTick(flow, event.data.dataPositions, event.data.boundaries);

    app.ticker.update();

    postMessage({
      operationId: event.data.operationId,
      operation: event.data.operation,
    });
  } else if (event.data.operation === "setFlowVisible") {
    flow.visible = event.data.visible;

    app.ticker.update();

    postMessage({
      operationId: event.data.operationId,
      operation: event.data.operation,
    });
  } else if (event.data.operation === "createSystemSelector") {
    const selector = new SystemSelector(spritesheet);
    systemSelectors[event.data.id] = selector;

    viewport.addChild(selector);
  } else if (event.data.operation === "setSystemSelectorVisible") {
    const selector = systemSelectors[event.data.id];

    selector.visible = event.data.visible;

    app.ticker.update();
  } else if (event.data.operation === "setSystemSelectorPosition") {
    const selector = systemSelectors[event.data.id];

    selector.setPosition(
      event.data.x1,
      event.data.y1,
      event.data.x2,
      event.data.y2,
    );

    app.ticker.update();
  } else if (event.data.operation === "createSystemLinker") {
    const linker = new SystemLinker();
    systemLinkers[event.data.id] = linker;

    viewport.addChild(linker);
  } else if (event.data.operation === "setSystemLinkerVisible") {
    const linker = systemLinkers[event.data.id];

    linker.visible = event.data.visible;

    app.ticker.update();
  } else if (event.data.operation === "setSystemLinkerPosition") {
    const linker = systemLinkers[event.data.id];

    linker.setPosition(
      event.data.x1,
      event.data.y1,
      event.data.x2,
      event.data.y2,
    );

    app.ticker.update();
  }
};

postMessage({ operation: "ready" });
