// Current layout:
//
// app stage (receives events)
//   viewport (receives viewport events)
//     grid (no events)
//     out of bounds (no events)
//     simulator container (no events)
//       simulator objects (no events)

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
  Assets,
  Sprite,
} from "pixi.js";
import { dump as saveYaml } from "js-yaml";
// @ts-ignore FIXME
import { Viewport } from "pixi-viewport";
import { loadYaml, RuntimeLimits, RuntimeSubsystem } from "@dataflows/spec";
import {
  CanvasSimulator,
  CanvasFlowPlayer,
  generateCanvasSimulatorTextures,
} from "./simulation.js";
import { BlockSize } from "./consts.js";
import example1 from "./examples/basic.yml?raw";
import example2 from "./examples/dataflows.yml?raw";

interface IdleOperation {
  type: "idle";
}

interface MoveSystemOperation {
  type: "move";
  subsystem: RuntimeSubsystem;
  pickedUpAt: {
    x: number;
    y: number;
  };
}

interface ToggleHideSystemsOperation {
  type: "toggleHideSystems";
  subsystem: RuntimeSubsystem;
}

// State.

interface State {
  changes: string[];
  changeIndex: number;
  operation: IdleOperation | MoveSystemOperation | ToggleHideSystemsOperation;
}

const state: State = {
  changes: [],
  changeIndex: -1,
  operation: { type: "idle" },
};

function pushChange(change: string) {
  // A same change cannot be pushed multiple times consecutively.
  if (change === state.changes[state.changeIndex]) {
    return;
  }

  state.changes.splice(state.changeIndex + 1, state.changes.length, change);
  state.changeIndex = state.changes.length - 1;
}

function resetState(): void {
  state.changes.length = 0;
  state.changeIndex = -1;
  state.operation = { type: "idle" };

  // TODO: NOPE! should broadcast event instead.
  dragAndDropContainer.removeChildren();
}

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

const mainMenu = document.getElementById("main-menu") as HTMLDivElement;
const domContainer = document.getElementById("canvas") as HTMLDivElement;
const positionInfo = document.getElementById(
  "information-position",
) as HTMLSpanElement;

// Create PixiJS app.
const app = new Application({
  background: "#1099bb",
  resizeTo: domContainer,
  autoDensity: true,
  resolution: window.devicePixelRatio,
  antialias: false,
  eventMode: "none",
  eventFeatures: {
    move: true,
    globalMove: false,
    click: true,
    wheel: true,
  },
});

app.stage.eventMode = "static";
app.stage.interactiveChildren = true;

// Create PixiJS viewport.
const outOfBoundsMargin = 10 * BlockSize;

const viewport = new Viewport({
  screenWidth: window.innerWidth,
  screenHeight: window.innerHeight,
  worldWidth: RuntimeLimits.MaxSystemWidth * BlockSize,
  worldHeight: RuntimeLimits.MaxSystemHeight * BlockSize,
  events: app.renderer.events,
  eventMode: "static",
  interactiveChildren: false,
  disableOnContextMenu: true,
});

viewport
  .drag({ mouseButtons: "right" })
  .pinch()
  .wheel({ smooth: 5 })
  .clampZoom({
    minScale: 0.2,
    maxScale: 2.0,
  })
  .clamp({
    left: -outOfBoundsMargin,
    right: RuntimeLimits.MaxSystemWidth * BlockSize + outOfBoundsMargin,
    top: -outOfBoundsMargin,
    bottom: RuntimeLimits.MaxSystemHeight * BlockSize + outOfBoundsMargin,
    underflow: "center",
  });

viewport.sortableChildren = true;

app.stage.addChild(viewport);

// Canvas layer: grid background.
const gridGraphic = new Graphics()
  .beginFill(0xcccccc)
  .drawRect(0, 0, BlockSize, BlockSize)
  .endFill()
  .beginFill(0xdddddd)
  .drawRect(1, 1, BlockSize - 1, BlockSize - 1)
  .endFill();

const gridTexture = app.renderer.generateTexture(gridGraphic);

const grid = new TilingSprite(
  gridTexture,
  viewport.worldWidth,
  viewport.worldHeight,
);

grid.x = viewport.left;
grid.y = viewport.top;

viewport.addChild(grid);

// Canvas layer: boundaries
const outOfBoundGraphic = new Graphics()
  .beginFill(0xff0000)
  .drawRect(0, 0, BlockSize, BlockSize)
  .endFill();

const outOfBoundTexture = app.renderer.generateTexture(outOfBoundGraphic);

const outOfBoundsTop = new TilingSprite(
  outOfBoundTexture,
  RuntimeLimits.MaxSystemWidth * BlockSize,
  outOfBoundsMargin,
);

outOfBoundsTop.x = 0;
outOfBoundsTop.y = -outOfBoundsMargin;

viewport.addChild(outOfBoundsTop);

const outOfBoundsBottom = new TilingSprite(
  outOfBoundTexture,
  RuntimeLimits.MaxSystemWidth * BlockSize,
  outOfBoundsMargin,
);

outOfBoundsBottom.x = 0;
outOfBoundsBottom.y = RuntimeLimits.MaxSystemHeight * BlockSize;

viewport.addChild(outOfBoundsBottom);

const outOfBoundsLeft = new TilingSprite(
  outOfBoundTexture,
  outOfBoundsMargin,
  RuntimeLimits.MaxSystemHeight * BlockSize + 2 * outOfBoundsMargin,
);

outOfBoundsLeft.x = -outOfBoundsMargin;
outOfBoundsLeft.y = -outOfBoundsMargin;

viewport.addChild(outOfBoundsLeft);

const outOfBoundsRight = new TilingSprite(
  outOfBoundTexture,
  outOfBoundsMargin,
  RuntimeLimits.MaxSystemHeight * BlockSize + 2 * outOfBoundsMargin,
);

outOfBoundsRight.x = RuntimeLimits.MaxSystemWidth * BlockSize;
outOfBoundsRight.y = -outOfBoundsMargin;

viewport.addChild(outOfBoundsRight);

// Canvas layer: simulation
let canvasSimulator: CanvasSimulator | null = null;
let canvasFlowPlayer: CanvasFlowPlayer | null = null;

const canvasSimulatorContainer = new Container();

// Drag & drop
const dragAndDropContainer = new Container();

dragAndDropContainer.sortableChildren = true;
dragAndDropContainer.zIndex = 100;

viewport.addChild(dragAndDropContainer);

const dragAndDropGraphic = new Graphics()
  .beginFill(0x00ff00)
  .drawRect(0, 0, BlockSize, BlockSize)
  .endFill();

const dragAndDropTexture = app.renderer.generateTexture(dragAndDropGraphic);

const dragAndDrop = new Sprite(dragAndDropTexture);
dragAndDrop.zIndex = 1;

viewport.on("pointermove", (event: any) => {
  const coordinates = viewport.toWorld(event.data.global);

  const x = Math.floor(coordinates.x / BlockSize) | 0;
  const y = Math.floor(coordinates.y / BlockSize) | 0;

  positionInfo.textContent = `[${x}, ${y}]`;

  if (state.operation.type === "move") {
    const deltaX =
      ((coordinates.x - state.operation.pickedUpAt.x) / BlockSize) | 0;
    const deltaY =
      ((coordinates.y - state.operation.pickedUpAt.y) / BlockSize) | 0;

    dragAndDrop.x = (state.operation.subsystem.position.x + deltaX) * BlockSize;
    dragAndDrop.y = (state.operation.subsystem.position.y + deltaY) * BlockSize;
  }
});

viewport.on("pointerdown", (event: any) => {
  if (!canvasSimulator) {
    return;
  }

  const coordinates = viewport.toWorld(event.data.global);

  const x = Math.floor(coordinates.x / BlockSize) | 0;
  const y = Math.floor(coordinates.y / BlockSize) | 0;

  const subsystem = canvasSimulator.getSubsystemAt(x, y);

  if (!subsystem) {
    return;
  }

  viewport.pause = true;

  // Operation: Hide systems toggle.
  if (canvasSimulator.getisSystemTopRightCorner(x, y)) {
    const operation: ToggleHideSystemsOperation = {
      type: "toggleHideSystems",
      subsystem,
    };

    state.operation = operation;

    return;
  }

  // Operation: Move system.
  const operation: MoveSystemOperation = {
    type: "move",
    subsystem,
    pickedUpAt: {
      x: coordinates.x,
      y: coordinates.y,
    },
  };

  state.operation = operation;

  dragAndDrop.x = subsystem.position.x * BlockSize;
  dragAndDrop.y = subsystem.position.y * BlockSize;
  dragAndDrop.width = subsystem.size.width * BlockSize;
  dragAndDrop.height = subsystem.size.height * BlockSize;

  // @ts-ignore FIXME
  dragAndDropContainer.addChild(dragAndDrop);

  for (const objectToRender of canvasSimulator.getAvailableSpaceForSystemToRender(
    canvasSimulatorTextures,
    subsystem,
  )) {
    // @ts-ignore FIXME
    dragAndDropContainer.addChild(objectToRender);
  }
});

viewport.on("pointerup", (event: any) => {
  if (!canvasSimulator) {
    return;
  }

  // Operation: Hide systems toggle.
  if (state.operation.type === "toggleHideSystems") {
    state.operation.subsystem.specification.hideSystems =
      !state.operation.subsystem.specification.hideSystems;

    const newSpecification = saveYaml(canvasSimulator.system.specification);

    if (loadSimulation(newSpecification)) {
      // TODO: broadcast event.
      pushChange(newSpecification);

      yamlEditorDefinition.value = newSpecification;
    } else {
      // Rollback.
      state.operation.subsystem.specification.hideSystems =
        !state.operation.subsystem.specification.hideSystems;
    }
  }

  // Operation: Move system.
  else if (state.operation.type === "move") {
    const coordinates = viewport.toWorld(event.data.global);

    const deltaX =
      ((coordinates.x - state.operation.pickedUpAt.x) / BlockSize) | 0;
    const deltaY =
      ((coordinates.y - state.operation.pickedUpAt.y) / BlockSize) | 0;

    // TODO: wrong type (any)?
    const currentPosition = state.operation.subsystem.specification.position;

    state.operation.subsystem.specification.position = {
      x: currentPosition.x + deltaX,
      y: currentPosition.y + deltaY,
    };

    const newSpecification = saveYaml(canvasSimulator.system.specification);

    if (loadSimulation(newSpecification)) {
      // TODO: broadcast event.
      pushChange(newSpecification);

      yamlEditorDefinition.value = newSpecification;
    } else {
      // Rollback.
      state.operation.subsystem.specification.position = currentPosition;
    }

    dragAndDropContainer.removeChildren();
  }

  if (state.operation.type !== "idle") {
    state.operation = { type: "idle" };
    viewport.pause = false;
  }
});

viewport.addChild(canvasSimulatorContainer);

// FIXME: instead of always having the callback registered,
// FIXME it should be added / removed when switching simulations / flows.
app.ticker.add<void>(deltaTime => {
  if (canvasFlowPlayer) {
    canvasFlowPlayer.update(deltaTime);
  }
});

// Simulation.

const canvasSimulatorTextures = generateCanvasSimulatorTextures(app);

function loadSimulation(yaml: string): boolean {
  const { system, errors } = loadYaml(yaml);

  if (errors.length) {
    yamlEditorMessages.value = errors
      .map(error => [error.path, error.message].join(": "))
      .join("\n");

    return false;
  }

  const newCanvasSimulator = new CanvasSimulator(system);

  canvasSimulator = newCanvasSimulator;
  yamlEditorMessages.value = "";

  canvasSimulatorContainer.removeChildren();

  for (const objectToRender of canvasSimulator.getObjectsToRender(
    canvasSimulatorTextures,
  )) {
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

  return true;
}

// Redraw the grid when some event occurs.
function redrawGrid(): void {
  grid.tilePosition.x = -viewport.left;
  grid.tilePosition.y = -viewport.top;

  grid.x = viewport.left;
  grid.y = viewport.top;

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
  const width = boundaries.right - boundaries.left + BlockSize * 2; /* margin */
  const height =
    boundaries.bottom - boundaries.top + BlockSize * 2; /* margin */

  // The operation is executed twice because of a weird issue that I don't
  // understand yet. Somehow, because we are using "viewport.clamp", the first
  // tuple ["viewport.moveCenter", "viewport.fit"] below doesn't quite do its
  // job and part of the simulation is slightly out of the viewport.
  //
  // This code feels like slapping the side of the CRT.
  for (let i = 0; i < 2; i++) {
    viewport.moveCenter(
      (boundaries.left + width) / 2,
      (boundaries.top + height) / 2,
    );

    viewport.fit(true, width, height);
  }

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
  .getElementById("operation-main-menu-toggle")
  ?.addEventListener("click", function () {
    if (mainMenu.classList.contains("closed")) {
      mainMenu.classList.remove("closed");
    } else {
      mainMenu.classList.add("closed");
    }

    resizeContainer();
  });

document
  .getElementById("operation-yaml-editor-apply-changes")
  ?.addEventListener("click", function () {
    if (yamlEditorDefinition.value) {
      pushChange(yamlEditorDefinition.value);
      loadSimulation(yamlEditorDefinition.value);
    }
  });

document
  .getElementById("operation-yaml-editor-redo")
  ?.addEventListener("click", function () {
    if (state.changeIndex < state.changes.length - 1) {
      state.changeIndex += 1;

      const value = state.changes[state.changeIndex];

      yamlEditorDefinition.value = value;
      loadSimulation(yamlEditorDefinition.value);
    }
  });

document
  .getElementById("operation-yaml-editor-undo")
  ?.addEventListener("click", function () {
    if (state.changeIndex > 0) {
      state.changeIndex -= 1;

      const value = state.changes[state.changeIndex];

      yamlEditorDefinition.value = value;
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
    resetState();
    pushChange(yamlEditorDefinition.value);
    fitSimulation();
  });

document
  .getElementById("operation-file-load")
  ?.addEventListener("click", function () {
    const value = window.localStorage.getItem("file");

    if (value) {
      yamlEditorDefinition.value = value;

      loadSimulation(yamlEditorDefinition.value);
      resetState();
      pushChange(yamlEditorDefinition.value);
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
    resetState();
    pushChange(yamlEditorDefinition.value);
    fitSimulation();
  });

document
  .getElementById("operation-examples-load-2")
  ?.addEventListener("click", function () {
    yamlEditorDefinition.value = example2;

    loadSimulation(example2);
    resetState();
    pushChange(yamlEditorDefinition.value);
    fitSimulation();
  });

// Load assets.
await Assets.load("assets/ibm.woff");

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

// TODO: handle out-of-bounds objects
// TODO: reset state func and do it at various places
