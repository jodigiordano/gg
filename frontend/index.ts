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
import {
  addLink,
  addSubsystem,
  loadYaml,
  removeSubsystem,
  removeLink,
  RuntimeLink,
  RuntimePosition,
  RuntimeSubsystem,
} from "@dataflows/spec";
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
  pickedUpAt: RuntimePosition;
}

interface ToggleHideSystemsOperation {
  type: "toggleHideSystems";
  subsystem: RuntimeSubsystem | null;
}

interface SetSystemTitleOperation {
  type: "setSystemTitle";
  subsystem: RuntimeSubsystem | null;
}

interface AddSystemOperation {
  type: "addSystem";
  position: RuntimePosition | null;
}

interface RemoveSystemOperation {
  type: "removeSystem";
  subsystem: RuntimeSubsystem | null;
}

interface SetSystemParentOperation {
  type: "setSystemParent";
  parentAt: RuntimePosition | null;
  subsystem: RuntimeSubsystem | null;
}

interface AddLinkOperation {
  type: "addLink";
  a: RuntimeSubsystem | null;
  b: RuntimeSubsystem | null;
}

interface RemoveLinkOperation {
  type: "removeLink";
  link: RuntimeLink | null;
}

// State.

interface State {
  changes: string[];
  changeIndex: number;
  operation:
    | IdleOperation
    | MoveSystemOperation
    | SetSystemTitleOperation
    | AddSystemOperation
    | RemoveSystemOperation
    | SetSystemParentOperation
    | ToggleHideSystemsOperation
    | AddLinkOperation
    | RemoveLinkOperation;
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

  // TODO: Hmmm...
  viewport.pause = false;
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
  background: "#dddddd",
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
const viewport = new Viewport({
  screenWidth: window.innerWidth,
  screenHeight: window.innerHeight,
  worldWidth: window.innerWidth,
  worldHeight: window.innerHeight,
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
    const deltaX = x - state.operation.pickedUpAt.x;
    const deltaY = y - state.operation.pickedUpAt.y;

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

  if (state.operation.type === "addSystem") {
    state.operation.position = { x, y };
  } else if (state.operation.type === "toggleHideSystems") {
    state.operation.subsystem = canvasSimulator.systemSimulator.getSubsystemAt(
      x,
      y,
    );
  } else if (state.operation.type === "removeSystem") {
    state.operation.subsystem = canvasSimulator.systemSimulator.getSubsystemAt(
      x,
      y,
    );
  } else if (state.operation.type === "setSystemTitle") {
    state.operation.subsystem = canvasSimulator.systemSimulator.getSubsystemAt(
      x,
      y,
    );
  } else if (state.operation.type === "setSystemParent") {
    const subsystem = canvasSimulator.systemSimulator.getSubsystemAt(x, y);

    if (state.operation.subsystem) {
      state.operation.parentAt = { x, y };
    } else {
      state.operation.subsystem = subsystem;
    }
  } else if (state.operation.type === "addLink") {
    const subsystem = canvasSimulator.systemSimulator.getSubsystemAt(x, y);

    if (!subsystem) {
      return;
    }

    if (
      state.operation.a?.canonicalId === subsystem.canonicalId ||
      state.operation.b?.canonicalId === subsystem.canonicalId
    ) {
      return;
    }

    if (state.operation.a) {
      state.operation.b = subsystem;
    } else {
      state.operation.a = subsystem;
    }
  } else if (state.operation.type === "removeLink") {
    state.operation.link = canvasSimulator.systemSimulator.getLinkAt(x, y);
  } else {
    // Operation: Move system.
    const subsystem = canvasSimulator.systemSimulator.getSubsystemAt(x, y);

    if (!subsystem) {
      return;
    }

    viewport.pause = true;

    const operation: MoveSystemOperation = {
      type: "move",
      subsystem,
      pickedUpAt: { x, y },
    };

    state.operation = operation;

    dragAndDrop.x = subsystem.position.x * BlockSize;
    dragAndDrop.y = subsystem.position.y * BlockSize;
    dragAndDrop.width = subsystem.size.width * BlockSize;
    dragAndDrop.height = subsystem.size.height * BlockSize;

    // @ts-ignore FIXME
    dragAndDropContainer.addChild(dragAndDrop);
  }
});

viewport.on("pointerup", (event: any) => {
  if (!canvasSimulator) {
    return;
  }

  let operationInProgress = false;

  // Operation: Hide systems toggle.
  if (state.operation.type === "toggleHideSystems") {
    if (state.operation.subsystem) {
      modifySpecification(() => {
        const { specification } = (
          state.operation as ToggleHideSystemsOperation
        ).subsystem!;

        specification.hideSystems = !specification.hideSystems;
      });
    }
  } else if (state.operation.type === "addSystem") {
    if (state.operation.position) {
      const system =
        canvasSimulator.systemSimulator.getSubsystemAt(
          state.operation.position.x,
          state.operation.position.y,
        ) ?? canvasSimulator.system;

      modifySpecification(() => {
        const newSystem = addSubsystem(
          system,
          (state.operation as AddSystemOperation).position!.x,
          (state.operation as AddSystemOperation).position!.y,
        );

        canvasSimulator!.moveSystem(newSystem, 0, 0);
      });
    }
  } else if (state.operation.type === "removeSystem") {
    if (state.operation.subsystem) {
      modifySpecification(() => {
        removeSubsystem((state.operation as RemoveSystemOperation).subsystem!);
      });
    }
  } else if (state.operation.type === "setSystemTitle") {
    if (state.operation.subsystem) {
      // TODO.
    }
  } else if (state.operation.type === "setSystemParent") {
    if (state.operation.parentAt && state.operation.subsystem) {
      const parent =
        canvasSimulator.systemSimulator.getSubsystemAt(
          state.operation.parentAt.x,
          state.operation.parentAt.y,
        ) ?? canvasSimulator.system;

      if (parent.canonicalId !== state.operation.subsystem.canonicalId) {
        modifySpecification(() => {
          // TODO: move from current parent subsystems to new parent subsystems.
          // TODO: set subsystem to new position => move other systems.
          // TODO: move links.
          // TODO: move flows.
        });
      }
    } else if (state.operation.parentAt || state.operation.subsystem) {
      operationInProgress = true;
    }
  } else if (state.operation.type === "addLink") {
    if (state.operation.a && state.operation.b) {
      modifySpecification(() => {
        addLink(
          canvasSimulator!.system,
          (state.operation as AddLinkOperation).a!.canonicalId,
          (state.operation as AddLinkOperation).b!.canonicalId,
        );
      });
    } else if (state.operation.a || state.operation.b) {
      operationInProgress = true;
    }
  } else if (state.operation.type === "removeLink") {
    if (state.operation.link) {
      modifySpecification(() => {
        removeLink(
          canvasSimulator!.system,
          (state.operation as RemoveLinkOperation).link!,
        );
      });
    }
  }

  // Operation: Move system.
  else if (state.operation.type === "move") {
    // World coordinates, in block size.
    const coordinates = viewport.toWorld(event.data.global);

    // World coordinates, in spec size.
    const x = Math.floor(coordinates.x / BlockSize) | 0;
    const y = Math.floor(coordinates.y / BlockSize) | 0;

    // Delta coordinates, in spec size.
    const deltaX = x - state.operation.pickedUpAt.x;
    const deltaY = y - state.operation.pickedUpAt.y;

    modifySpecification(() => {
      canvasSimulator!.moveSystem(
        (state.operation as MoveSystemOperation).subsystem!,
        deltaX,
        deltaY,
      );
    });

    dragAndDropContainer.removeChildren();
  }

  if (!operationInProgress) {
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

/**
 * Modifies the specification transactionally.
 */
function modifySpecification(modifier: () => void): void {
  if (!canvasSimulator) {
    return;
  }

  // Make a copy of the specification.
  const currentSpecification = saveYaml(canvasSimulator.system.specification);

  // Call a function that modifies the specification.
  modifier();

  // Try to apply the new configuration.
  const newSpecification = saveYaml(canvasSimulator.system.specification);

  if (loadSimulation(newSpecification)) {
    pushChange(newSpecification);
    yamlEditorDefinition.value = newSpecification;
  } else {
    // Rollback if the new configuration is invalid.
    loadSimulation(currentSpecification);
  }
}

// Simulation.

const canvasSimulatorTextures = generateCanvasSimulatorTextures(app);

function loadSimulation(yaml: string): boolean {
  let result: ReturnType<typeof loadYaml>;

  try {
    result = loadYaml(yaml);
  } catch (error) {
    yamlEditorMessages.value = (error as Error).message;

    return false;
  }

  if (result.errors.length) {
    yamlEditorMessages.value = result.errors
      .map(error => [error.path, error.message].join(": "))
      .join("\n");

    return false;
  }

  const newCanvasSimulator = new CanvasSimulator(result.system);

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

  const boundaries = canvasSimulator.getVisibleBoundaries();

  const left = boundaries.left - BlockSize; /* margin */
  const top = boundaries.top - BlockSize; /* margin */

  const width =
    boundaries.right - boundaries.left + BlockSize + BlockSize * 2; /* margin */

  const height =
    boundaries.bottom - boundaries.top + BlockSize + BlockSize * 2; /* margin */

  // The operation is executed twice because of a weird issue that I don't
  // understand yet. Somehow, because we are using "viewport.clamp", the first
  // tuple ["viewport.moveCenter", "viewport.fit"] below doesn't quite do its
  // job and part of the simulation is slightly out of the viewport.
  //
  // This code feels like slapping the side of the CRT.
  for (let i = 0; i < 2; i++) {
    viewport.moveCenter(left + width / 2, top + height / 2);

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

document
  .getElementById("operation-system-hide-systems")
  ?.addEventListener("click", function () {
    state.operation = { type: "toggleHideSystems", subsystem: null };
  });

document
  .getElementById("operation-system-add")
  ?.addEventListener("click", function () {
    state.operation = { type: "addSystem", position: null };
  });

document
  .getElementById("operation-system-remove")
  ?.addEventListener("click", function () {
    state.operation = { type: "removeSystem", subsystem: null };
  });

document
  .getElementById("operation-system-set-title")
  ?.addEventListener("click", function () {
    state.operation = { type: "setSystemTitle", subsystem: null };
  });

document
  .getElementById("operation-system-set-parent")
  ?.addEventListener("click", function () {
    state.operation = {
      type: "setSystemParent",
      subsystem: null,
      parentAt: null,
    };
  });

document
  .getElementById("operation-link-add")
  ?.addEventListener("click", function () {
    state.operation = { type: "addLink", a: null, b: null };
  });

document
  .getElementById("operation-link-remove")
  ?.addEventListener("click", function () {
    state.operation = { type: "removeLink", link: null };
  });

// Load assets.
await Assets.load("assets/ibm.woff");

// Add PixiJS to the DOM.
// @ts-ignore FIXME
document.getElementById("canvas")?.replaceChildren(app.view);
