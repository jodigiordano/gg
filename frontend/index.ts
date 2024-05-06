import {
  Application,
  Graphics,
  TilingSprite,
  settings,
  MIPMAP_MODES,
  SCALE_MODES,
  WRAP_MODES,
  BaseTexture,
  Container,
} from "pixi.js";
// @ts-ignore FIXME
import { Viewport } from "pixi-viewport";
import { CanvasSimulator, CanvasFlowPlayer } from "./simulation.js";
import { BlockSize } from "./consts.js";
import example1 from "./examples/basic.yml?raw";
import example2 from "./examples/dataflows.yml?raw";

// Setup PixiJS.
BaseTexture.defaultOptions.mipmap = MIPMAP_MODES.ON;
BaseTexture.defaultOptions.scaleMode = SCALE_MODES.LINEAR;
BaseTexture.defaultOptions.wrapMode = WRAP_MODES.REPEAT;

settings.ROUND_PIXELS = true;

const yamlEditor = document.getElementById("yaml-editor") as HTMLDivElement;

const yamlEditorDefinition = document.getElementById(
  "yaml-editor-definition",
) as HTMLTextAreaElement;

const yamlEditorMessages = document.getElementById(
  "yaml-editor-messages",
) as HTMLTextAreaElement;

const debugMenu = document.getElementById("debug-menu") as HTMLDivElement;
const examplesMenu = document.getElementById("examples-menu") as HTMLDivElement;
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
  minScale: 0.2,
  maxScale: 2.0,
});

app.stage.addChild(viewport);

// Canvas layer: grid background.
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

grid.eventMode = "static";
grid.interactiveChildren = false;

viewport.addChild(grid);

// Canvas layer: simulation
let canvasSimulator: CanvasSimulator | null = null;
let canvasFlowPlayer: CanvasFlowPlayer | null = null;
const canvasSimulatorContainer = new Container();

viewport.addChild(canvasSimulatorContainer);

// FIXME: instead of always having the callback registered,
// FIXME it should be added / removed when switching simulations / flows.
app.ticker.add<void>(deltaTime => {
  if (canvasFlowPlayer) {
    canvasFlowPlayer.update(deltaTime);
  }
});

function loadSimulation(yaml: string): void {
  canvasSimulator = new CanvasSimulator(yaml);

  if (canvasSimulator.errors.length) {
    yamlEditorMessages.value = canvasSimulator.errors
      .map(error => [error.path, error.message].join(": "))
      .join("\n");

    return;
  }

  yamlEditorMessages.value = "";

  canvasSimulatorContainer.removeChildren();

  for (const objectToRender of canvasSimulator.getObjectsToRender(app)) {
    // @ts-ignore FIXME
    canvasSimulatorContainer.addChild(objectToRender);
  }

  if (canvasSimulator.system.flows.length) {
    canvasFlowPlayer = canvasSimulator.createFlowPlayer(app, 0);

    for (const objectToRender of canvasFlowPlayer.getObjectsToRender()) {
      // @ts-ignore FIXME
      canvasSimulatorContainer.addChild(objectToRender);
    }
  }
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

function resizeContainer(): void {
  app.renderer.resize(domContainer.clientWidth, domContainer.clientHeight);

  viewport.resize(domContainer.clientWidth, domContainer.clientHeight);

  redrawGrid();
}

function fitSimulation() {
  if (!canvasSimulator) {
    return;
  }

  const boundaries = canvasSimulator.getBoundaries();
  const width = boundaries.right - boundaries.left + BlockSize; /* padding */
  const height = boundaries.bottom - boundaries.top + BlockSize; /* padding */

  viewport.moveCenter(boundaries.left + width / 2, boundaries.top + height / 2);

  viewport.fit(true, width, height);

  redrawGrid();
}

//
// Events
//

// Move the grid when the viewport is moved.
viewport.on("moved", redrawGrid);

// Resize the container when the window is resized.
window.addEventListener("resize", resizeContainer);

//
// Operations performed manually by the user.
//

document
  .getElementById("operation-camera-fit")
  ?.addEventListener("click", fitSimulation);

document
  .getElementById("operation-camera-zoom-in")
  ?.addEventListener("click", function () {
    viewport.zoomPercent(0.25, true);

    redrawGrid();
  });

document
  .getElementById("operation-camera-zoom-out")
  ?.addEventListener("click", function () {
    viewport.zoomPercent(-0.25, true);

    redrawGrid();
  });

document
  .getElementById("operation-yaml-editor-toggle")
  ?.addEventListener("click", function () {
    if (yamlEditor.classList.contains("closed")) {
      yamlEditor.classList.remove("closed");
    } else {
      yamlEditor.classList.add("closed");
    }

    resizeContainer();
  });

document
  .getElementById("operation-debug-menu-toggle")
  ?.addEventListener("click", function () {
    if (debugMenu.classList.contains("closed")) {
      debugMenu.classList.remove("closed");
    } else {
      debugMenu.classList.add("closed");
    }

    resizeContainer();
  });

document
  .getElementById("operation-examples-menu-toggle")
  ?.addEventListener("click", function () {
    if (examplesMenu.classList.contains("closed")) {
      examplesMenu.classList.remove("closed");
    } else {
      examplesMenu.classList.add("closed");
    }

    resizeContainer();
  });

document
  .getElementById("operation-yaml-editor-apply-changes")
  ?.addEventListener("click", function () {
    if (yamlEditorDefinition.value) {
      loadSimulation(yamlEditorDefinition.value);
    }
  });

document
  .getElementById("operation-file-new")
  ?.addEventListener("click", function () {
    yamlEditorDefinition.value = [
      "specificationVersion: 1.0.0",
      "title: New system",
    ].join("\n");

    loadSimulation(yamlEditorDefinition.value);
    fitSimulation();
  });

document
  .getElementById("operation-file-load")
  ?.addEventListener("click", function () {
    const value = window.localStorage.getItem("file");

    if (value) {
      yamlEditorDefinition.value = value;

      loadSimulation(yamlEditorDefinition.value);
      fitSimulation();
    }
  });

document
  .getElementById("operation-file-save")
  ?.addEventListener("click", function () {
    if (yamlEditorDefinition.value) {
      window.localStorage.setItem("file", yamlEditorDefinition.value);
    }
  });

document
  .getElementById("operation-examples-load-1")
  ?.addEventListener("click", function () {
    yamlEditorDefinition.value = example1;

    loadSimulation(example1);
    fitSimulation();
  });

document
  .getElementById("operation-examples-load-2")
  ?.addEventListener("click", function () {
    yamlEditorDefinition.value = example2;

    loadSimulation(example2);
    fitSimulation();
  });

// Add PixiJS to the DOM.
// @ts-ignore FIXME
document.getElementById("canvas")?.replaceChildren(app.view);

// TODO: debug show elements under the cursor
// grid.on('mousemove', (event) => {
//   // TODO.
// });

// TODO: make sure the app consume the least amount of CPU / memory possible.
// TODO: the ticker should be controlled manually so when nothing moves on the
// TODO: screen, we don't refresh.
// app.ticker.stop();

// TODO: introduce when needed.
// function debounce(callback: () => void, waitMs: number) {
//   let timeoutId: number | undefined = undefined;

//   return () => {
//     window.clearTimeout(timeoutId);
//     timeoutId = window.setTimeout(() => {
//       callback();
//     }, waitMs);
//   };
// }
