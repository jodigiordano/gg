import {
  Application,
  Graphics,
  TilingSprite,
  settings,
  MIPMAP_MODES,
  SCALE_MODES,
  WRAP_MODES,
  BaseTexture,
  DisplayObject,
  Container,
  Assets,
  Sprite,
  Spritesheet,
  Text,
} from "pixi.js";
import { dump as saveYaml } from "js-yaml";
// @ts-ignore
import { Viewport } from "pixi-viewport";
import {
  addLink,
  addSubsystem,
  loadYaml,
  removeSubsystem,
  removeLink,
  moveSystem,
  RuntimeLink,
  RuntimePosition,
  RuntimeSystem,
  RuntimeSubsystem,
  moveSubsystemToParent,
  TitleCharsPerSquare,
  setSubsystemTitle,
} from "@gg/spec";
import { CanvasSimulator, CanvasFlowPlayer } from "./simulation.js";
import { BlockSize } from "./consts.js";
import { initializeDropdowns } from "./dropdown.js";
import example1 from "./assets/basic.yml?raw";
import example2 from "./assets/complex.yml?raw";

//@ts-ignore
import spritesheetData from "./assets/spritesheet.png?base64";

//@ts-ignore
import fontData from "./assets/ibm.woff?base64";

interface MoveSystemOperation {
  type: "moveSystem";
  subsystem: RuntimeSubsystem | null;
  pickedUpAt: RuntimePosition | null;
}

interface ToggleHideSystemsOperation {
  type: "toggleHideSystems";
  subsystem: RuntimeSubsystem | null;
}

interface SetSystemTitleOperation {
  type: "setSystemTitle";
  subsystem: RuntimeSubsystem | null;
  editing: boolean;
}

interface AddSystemOperation {
  type: "addSystem";
  position: RuntimePosition | null;
}

interface RemoveSystemOrLinkOperation {
  type: "removeSystemOrLink";
  subsystem: RuntimeSubsystem | null;
  link: RuntimeLink | null;
}

interface SetSystemParentOperation {
  type: "setSystemParent";
  parent: RuntimeSystem | RuntimeSubsystem | null;
  parentAt: RuntimePosition | null;
  subsystem: RuntimeSubsystem | null;
}

interface AddLinkOperation {
  type: "addLink";
  a: RuntimeSubsystem | null;
  b: RuntimeSubsystem | null;
}

// State.

interface State {
  changes: string[];
  changeIndex: number;
  operation:
    | MoveSystemOperation
    | SetSystemTitleOperation
    | AddSystemOperation
    | RemoveSystemOrLinkOperation
    | SetSystemParentOperation
    | ToggleHideSystemsOperation
    | AddLinkOperation;
}

const state: State = {
  changes: [],
  changeIndex: -1,
  operation: { type: "moveSystem", subsystem: null, pickedUpAt: null },
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

  // TODO: Hmmm...
  teardownAnyOperation();
}

// Setup PixiJS.
BaseTexture.defaultOptions.mipmap = MIPMAP_MODES.ON;
BaseTexture.defaultOptions.scaleMode = SCALE_MODES.NEAREST;
BaseTexture.defaultOptions.wrapMode = WRAP_MODES.REPEAT;

settings.ROUND_PIXELS = true;

// HTML selectors.
const yamlEditorDialog = document.getElementById(
  "yaml-editor",
) as HTMLDialogElement;

const yamlEditor = yamlEditorDialog.querySelector(
  "textarea",
) as HTMLTextAreaElement;

const canvasContainer = document.getElementById("canvas") as HTMLDivElement;

const singleChoiceButtons = document.querySelectorAll(
  "#toolbox .single-choice button",
);

// Create PixiJS app.
const app = new Application({
  background: "#dddddd",
  resizeTo: canvasContainer,
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

// Load assets.
await Assets.load({
  name: "ibm",
  src: `data:font/woff;base64,${fontData}`,
  data: {
    family: "ibm",
  },
});

await Assets.load({
  name: "spritesheet",
  src: `data:image/png;base64,${spritesheetData}`,
});

const spritesheet = new Spritesheet(Assets.get("spritesheet"), {
  frames: {
    systemTopLeft: {
      frame: { x: 0, y: 0, w: 8, h: 8 },
    },
    systemTopRight: {
      frame: { x: 16, y: 0, w: 8, h: 8 },
    },
    systemBottomLeft: {
      frame: { x: 0, y: 16, w: 8, h: 8 },
    },
    systemBottomRight: {
      frame: { x: 16, y: 16, w: 8, h: 8 },
    },
    systemCenterLeft: {
      frame: { x: 0, y: 8, w: 8, h: 8 },
    },
    systemCenterRight: {
      frame: { x: 16, y: 8, w: 8, h: 8 },
    },
    systemTopCenter: {
      frame: { x: 8, y: 0, w: 8, h: 8 },
    },
    systemBottomCenter: {
      frame: { x: 8, y: 16, w: 8, h: 8 },
    },
    systemCenterCenter: {
      frame: { x: 8, y: 8, w: 8, h: 8 },
    },
    link: {
      frame: { x: 24, y: 8, w: 8, h: 8 },
    },
    linkCorner: {
      frame: { x: 24, y: 16, w: 8, h: 8 },
    },
  },
  meta: {
    image: "spritesheet.png",
    format: "RGBA8888",
    size: { w: 128, h: 128 },
    scale: 1,
  },
});

await spritesheet.parse();

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

gridTexture.baseTexture.scaleMode = SCALE_MODES.LINEAR;

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

viewport.addChild(canvasSimulatorContainer);

// FIXME: instead of always having the callback registered,
// FIXME it should be added / removed when switching simulations / flows.
app.ticker.add<void>(deltaTime => {
  if (canvasFlowPlayer) {
    canvasFlowPlayer.update(deltaTime);
  }
});

// Set system title
const setSystemTitleContainer = new Container();

setSystemTitleContainer.sortableChildren = true;
setSystemTitleContainer.zIndex = 100;

viewport.addChild(setSystemTitleContainer);

const setSystemTitleGraphic = new Graphics()
  .beginFill(0x000000)
  .drawRect(0, 0, BlockSize, BlockSize)
  .endFill();

const setSystemTitleTexture = app.renderer.generateTexture(
  setSystemTitleGraphic,
);

const setSystemTitleMask = new Sprite(setSystemTitleTexture);
setSystemTitleMask.zIndex = 1;

const setSystemTitleEditor = new Text("", {
  fontFamily: "Ibm",
  fontSize: BlockSize,
  lineHeight: BlockSize,
});

setSystemTitleEditor.style.fill = "0xffffff";
setSystemTitleEditor.resolution = 2;
setSystemTitleEditor.zIndex = 2;

const setSystemTitleCursor = new Text("▋", {
  fontFamily: "Ibm",
  fontSize: BlockSize,
  lineHeight: BlockSize,
});

setSystemTitleCursor.style.fill = "0xffffff";
setSystemTitleCursor.resolution = 2;
setSystemTitleCursor.zIndex = 3;

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

  if (state.operation.type === "moveSystem") {
    if (state.operation.subsystem && state.operation.pickedUpAt) {
      const deltaX = x - state.operation.pickedUpAt.x;
      const deltaY = y - state.operation.pickedUpAt.y;

      dragAndDrop.x =
        (state.operation.subsystem.position.x + deltaX) * BlockSize;
      dragAndDrop.y =
        (state.operation.subsystem.position.y + deltaY) * BlockSize;
    }
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
  } else if (state.operation.type === "removeSystemOrLink") {
    const link = canvasSimulator.systemSimulator.getLinkAt(x, y);

    if (link) {
      state.operation.link = link;
    } else {
      state.operation.subsystem =
        canvasSimulator.systemSimulator.getSubsystemAt(x, y);
    }
  } else if (state.operation.type === "setSystemTitle") {
    // Happens when the user selects the subsystem B
    // while editing the subsystem A.
    if (state.operation.subsystem && state.operation.editing) {
      // Apply operation.
      modifySpecification(() => {
        setSubsystemTitle(
          (state.operation as SetSystemTitleOperation).subsystem!,
          setSystemTitleEditor.text.replace(/\n/g, "\\n"),
        );
      });

      // Reset operation.
      setSystemTitleContainer.removeChildren();

      state.operation = {
        type: "setSystemTitle",
        subsystem: null,
        editing: false,
      };
    }

    state.operation.subsystem = canvasSimulator.systemSimulator.getSubsystemAt(
      x,
      y,
    );
  } else if (state.operation.type === "setSystemParent") {
    const subsystem = canvasSimulator.systemSimulator.getSubsystemAt(x, y);

    if (state.operation.subsystem) {
      state.operation.parent = subsystem ?? canvasSimulator.system;
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
  } else if (state.operation.type === "moveSystem") {
    // Operation: Move system.
    const subsystem = canvasSimulator.systemSimulator.getSubsystemAt(x, y);

    if (!subsystem) {
      return;
    }

    viewport.pause = true;

    state.operation.subsystem = subsystem;
    state.operation.pickedUpAt = { x, y };

    dragAndDrop.x = subsystem.position.x * BlockSize;
    dragAndDrop.y = subsystem.position.y * BlockSize;
    dragAndDrop.width = subsystem.size.width * BlockSize;
    dragAndDrop.height = subsystem.size.height * BlockSize;

    dragAndDropContainer.addChild(dragAndDrop as DisplayObject);
  }
});

viewport.on("pointerup", (event: any) => {
  if (!canvasSimulator) {
    return;
  }

  // Operation: Hide systems toggle.
  if (state.operation.type === "toggleHideSystems") {
    if (state.operation.subsystem) {
      // Apply operation.
      modifySpecification(() => {
        const { specification } = (
          state.operation as ToggleHideSystemsOperation
        ).subsystem!;

        specification.hideSystems = !specification.hideSystems;
      });

      // Reset operation.
      state.operation = {
        type: "toggleHideSystems",
        subsystem: null,
      };
    }
  } else if (state.operation.type === "addSystem") {
    if (state.operation.position) {
      // Apply operation.
      const system =
        canvasSimulator.systemSimulator.getSubsystemAt(
          state.operation.position.x,
          state.operation.position.y,
        ) ?? canvasSimulator.system;

      modifySpecification(() => {
        addSubsystem(
          system,
          (state.operation as AddSystemOperation).position!.x,
          (state.operation as AddSystemOperation).position!.y,
        );
      });

      // Reset operation.
      state.operation = {
        type: "addSystem",
        position: null,
      };
    }
  } else if (state.operation.type === "removeSystemOrLink") {
    // Apply operation.
    if (state.operation.subsystem) {
      modifySpecification(() => {
        removeSubsystem(
          (state.operation as RemoveSystemOrLinkOperation).subsystem!,
        );
      });
    } else if (state.operation.link) {
      modifySpecification(() => {
        removeLink(
          canvasSimulator!.system,
          (state.operation as RemoveSystemOrLinkOperation).link!,
        );
      });
    }

    // Reset the operation.
    if (state.operation.subsystem || state.operation.link) {
      state.operation = {
        type: "removeSystemOrLink",
        subsystem: null,
        link: null,
      };
    }
  } else if (state.operation.type === "setSystemTitle") {
    if (state.operation.subsystem) {
      const { subsystem } = state.operation;

      if (state.operation.editing) {
        // Apply operation.
        modifySpecification(() => {
          setSubsystemTitle(
            subsystem,
            setSystemTitleEditor.text.replace(/\n/g, "\\n"),
          );
        });

        // Reset operation.
        setSystemTitleContainer.removeChildren();

        state.operation = {
          type: "setSystemTitle",
          subsystem: null,
          editing: false,
        };
      } else {
        const titleX =
          (subsystem.position.x + subsystem.titlePosition.x) * BlockSize;
        const titleY =
          (subsystem.position.y + subsystem.titlePosition.y) * BlockSize;

        setSystemTitleMask.x = titleX;
        setSystemTitleMask.y = titleY;
        setSystemTitleMask.width = subsystem.titleSize.width * BlockSize;
        setSystemTitleMask.height = subsystem.titleSize.height * BlockSize;

        setSystemTitleContainer.addChild(setSystemTitleMask as DisplayObject);

        const title = subsystem.title.replace(/\\n/g, "\n");

        setSystemTitleEditor.text = title;
        setSystemTitleEditor.x = titleX;
        setSystemTitleEditor.y = titleY;

        setSystemTitleContainer.addChild(setSystemTitleEditor as DisplayObject);

        const titleLastLineLength = title.split("\n").at(-1)!.length;

        setSystemTitleCursor.x =
          setSystemTitleEditor.x +
          (titleLastLineLength % 2 === 0
            ? (titleLastLineLength / TitleCharsPerSquare) * BlockSize
            : ((titleLastLineLength - 1) / TitleCharsPerSquare) * BlockSize +
              BlockSize / TitleCharsPerSquare);

        setSystemTitleCursor.y =
          setSystemTitleEditor.y + setSystemTitleEditor.height - BlockSize;

        setSystemTitleContainer.addChild(setSystemTitleCursor as DisplayObject);

        state.operation.editing = true;
      }
    }
  } else if (state.operation.type === "setSystemParent") {
    if (
      state.operation.parent &&
      state.operation.parentAt &&
      state.operation.subsystem
    ) {
      // Apply operation.
      const { parent, parentAt, subsystem } = state.operation;

      if (
        parent.canonicalId !== subsystem.canonicalId &&
        parent.canonicalId !== subsystem.parent?.canonicalId
      ) {
        const positionInParent = {
          x: parentAt.x - parent.position.x,
          y: parentAt.y - parent.position.y,
        };

        modifySpecification(() => {
          moveSubsystemToParent(subsystem, parent, positionInParent);

          if (parent.canonicalId) {
            parent.specification.hideSystems = false;
          }
        });
      }

      // Reset operation.
      state.operation = {
        type: "setSystemParent",
        subsystem: null,
        parent: null,
        parentAt: null,
      };
    }
  } else if (state.operation.type === "addLink") {
    if (state.operation.a && state.operation.b) {
      // Apply operation.
      modifySpecification(() => {
        addLink(
          canvasSimulator!.system,
          (state.operation as AddLinkOperation).a!.canonicalId,
          (state.operation as AddLinkOperation).b!.canonicalId,
        );
      });

      // Reset operation.
      state.operation = { type: "addLink", a: null, b: null };
    }
  }

  // Operation: Move system.
  else if (state.operation.type === "moveSystem") {
    if (state.operation.subsystem && state.operation.pickedUpAt) {
      // Apply operation.

      // World coordinates, in block size.
      const coordinates = viewport.toWorld(event.data.global);

      // World coordinates, in spec size.
      const x = Math.floor(coordinates.x / BlockSize) | 0;
      const y = Math.floor(coordinates.y / BlockSize) | 0;

      // Delta coordinates, in spec size.
      const deltaX = x - state.operation.pickedUpAt.x;
      const deltaY = y - state.operation.pickedUpAt.y;

      modifySpecification(() => {
        moveSystem(
          (state.operation as MoveSystemOperation).subsystem!,
          deltaX,
          deltaY,
        );
      });

      // Reset operation.
      dragAndDropContainer.removeChildren();

      viewport.pause = false;

      state.operation = {
        type: "moveSystem",
        subsystem: null,
        pickedUpAt: null,
      };
    }
  }
});

// FIXME: instead of always having the callback registered,
// FIXME it should be added / removed when switching simulations / flows.
app.ticker.add<void>(() => {
  if (state.operation.type === "setSystemTitle" && state.operation.editing) {
    setSystemTitleCursor.visible = ((Date.now() / 500) | 0) % 2 === 0;
  }
});

window.addEventListener("click", () => {
  if (state.operation.type === "setSystemTitle" && state.operation.subsystem) {
    // Trick to show the virtual keyboard on mobile.
    const input = document.getElementById("operation-system-set-title-input")!;

    input.style.display = "inline-block";
    input.focus();
  }
});

window.addEventListener("keydown", event => {
  if (state.operation.type === "setSystemTitle" && state.operation.subsystem) {
    const { subsystem } = state.operation;

    let titleModified = false;
    let finishOperation = false;

    if (event.key === "Backspace") {
      setSystemTitleEditor.text = setSystemTitleEditor.text.slice(0, -1);
      titleModified = true;
    } else if (event.key === "Escape") {
      finishOperation = true;
    } else if (event.shiftKey && event.key === "Enter") {
      setSystemTitleEditor.text = setSystemTitleEditor.text + "\n";
      titleModified = true;
    } else if (event.key === "Enter") {
      modifySpecification(() => {
        setSubsystemTitle(
          subsystem!,
          setSystemTitleEditor.text.replace(/\n/g, "\\n"),
        );
      });

      // Trick to hide the virtual keyboard on mobile.
      document.getElementById(
        "operation-system-set-title-input",
      )!.style.display = "none";

      finishOperation = true;
    } else if (event.key.length === 1) {
      setSystemTitleEditor.text = setSystemTitleEditor.text + event.key;

      // Example: prevents "/" from opening the Quick Search in Firefox.
      event.preventDefault();

      titleModified = true;
    }

    if (titleModified) {
      const currentTitleWidth = subsystem!.titleSize.width;
      const currentTitleHeight = subsystem!.titleSize.height;

      const titleLengths = setSystemTitleEditor.text
        .split("\n")
        .map(line => line.length);

      const newTitleWidth =
        Math.ceil(Math.max(...titleLengths) / TitleCharsPerSquare) | 0;
      const newTitleHeight = titleLengths.length;

      setSystemTitleMask.width =
        Math.max(currentTitleWidth, newTitleWidth) * BlockSize;

      setSystemTitleMask.height =
        Math.max(currentTitleHeight, newTitleHeight) * BlockSize;

      setSystemTitleCursor.x =
        setSystemTitleEditor.x +
        (titleLengths.at(-1)! % 2 === 0
          ? (titleLengths.at(-1)! / TitleCharsPerSquare) * BlockSize
          : ((titleLengths.at(-1)! - 1) / TitleCharsPerSquare) * BlockSize +
            BlockSize / TitleCharsPerSquare);

      setSystemTitleCursor.y =
        setSystemTitleEditor.y + setSystemTitleEditor.height - BlockSize;
    }

    // Reset operation.
    if (finishOperation) {
      setSystemTitleContainer.removeChildren();

      state.operation = {
        type: "setSystemTitle",
        subsystem: null,
        editing: false,
      };
    }
    // The user press "Esc" to cancel any ongoing operation.
  } else if (event.key === "Escape") {
    teardownAnyOperation();
  }
});

/**
 * Finish an ongoing operation.
 */
function teardownAnyOperation(): void {
  // TODO: hmmm...
  setSystemTitleContainer.removeChildren();
  dragAndDropContainer.removeChildren();

  state.operation = { type: "moveSystem", subsystem: null, pickedUpAt: null };
  viewport.pause = false;

  for (const button of singleChoiceButtons) {
    button.classList.remove("selected");
  }

  document.getElementById("operation-move")?.classList?.add("selected");
}

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
    yamlEditor.value = newSpecification;
  } else {
    // Rollback if the new configuration is invalid.
    loadSimulation(currentSpecification);
  }
}

// Simulation.

function loadSimulation(yaml: string): boolean {
  let result: ReturnType<typeof loadYaml>;

  try {
    result = loadYaml(yaml);
  } catch (error) {
    console.warn((error as Error).message);

    return false;
  }

  if (result.errors.length) {
    for (const error of result.errors) {
      console.warn(error.path, error.message);
    }

    return false;
  }

  const newCanvasSimulator = new CanvasSimulator(result.system);

  canvasSimulator = newCanvasSimulator;

  canvasSimulatorContainer.removeChildren();

  for (const objectToRender of canvasSimulator.getObjectsToRender(
    spritesheet,
  )) {
    canvasSimulatorContainer.addChild(objectToRender as DisplayObject);
  }

  if (canvasSimulator.system.flows.length) {
    canvasFlowPlayer = canvasSimulator.createFlowPlayer(app, 0);

    for (const objectToRender of canvasFlowPlayer.getObjectsToRender()) {
      canvasSimulatorContainer.addChild(objectToRender as DisplayObject);
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

  grid.width = canvasContainer.clientWidth / viewport.scale.x;
  grid.height = canvasContainer.clientHeight / viewport.scale.y;
}

function resizeContainer(): void {
  app.renderer.resize(
    canvasContainer.clientWidth,
    canvasContainer.clientHeight,
  );

  viewport.resize(canvasContainer.clientWidth, canvasContainer.clientHeight);

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

function loadFile(): void {
  const value = window.localStorage.getItem("file");

  if (value) {
    yamlEditor.value = value;

    loadSimulation(yamlEditor.value);
    resetState();
    pushChange(yamlEditor.value);
    fitSimulation();
  }
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
  .getElementById("operation-yaml-editor-open")
  ?.addEventListener("click", function () {
    // Disable autofocus on the first input when opening the modal.
    yamlEditorDialog.inert = true;

    yamlEditorDialog.showModal();

    yamlEditorDialog.inert = false;
  });

document
  .getElementById("operation-yaml-editor-apply-changes")
  ?.addEventListener("click", function () {
    if (yamlEditor.value) {
      pushChange(yamlEditor.value);
      loadSimulation(yamlEditor.value);
    }
  });

document
  .getElementById("operation-help-about")
  ?.addEventListener("click", function () {
    const dialog = document.getElementById("about") as HTMLDialogElement;

    dialog.showModal();
  });

document
  .getElementById("operation-help-privacy")
  ?.addEventListener("click", function () {
    const dialog = document.getElementById("privacy") as HTMLDialogElement;

    dialog.showModal();
  });

document
  .getElementById("operation-redo")
  ?.addEventListener("click", function () {
    if (state.changeIndex < state.changes.length - 1) {
      state.changeIndex += 1;

      const value = state.changes[state.changeIndex];

      yamlEditor.value = value;
      loadSimulation(yamlEditor.value);
    }
  });

document
  .getElementById("operation-undo")
  ?.addEventListener("click", function () {
    if (state.changeIndex > 0) {
      state.changeIndex -= 1;

      const value = state.changes[state.changeIndex];

      yamlEditor.value = value;
      loadSimulation(yamlEditor.value);
    }
  });

document
  .getElementById("operation-file-new")
  ?.addEventListener("click", function () {
    yamlEditor.value = [
      "specificationVersion: 1.0.0",
      "title: New system",
    ].join("\n");

    loadSimulation(yamlEditor.value);
    resetState();
    pushChange(yamlEditor.value);
    fitSimulation();
  });

document
  .getElementById("operation-file-load")
  ?.addEventListener("click", loadFile);

document
  .getElementById("operation-file-save")
  ?.addEventListener("click", function () {
    if (yamlEditor.value) {
      window.localStorage.setItem("file", yamlEditor.value);
    }
  });

document
  .getElementById("operation-examples-load-1")
  ?.addEventListener("click", function () {
    yamlEditor.value = example1;

    loadSimulation(example1);
    resetState();
    pushChange(yamlEditor.value);
    fitSimulation();
  });

document
  .getElementById("operation-examples-load-2")
  ?.addEventListener("click", function () {
    yamlEditor.value = example2;

    loadSimulation(example2);
    resetState();
    pushChange(yamlEditor.value);
    fitSimulation();
  });

document
  .getElementById("operation-move")
  ?.addEventListener("click", function () {
    teardownAnyOperation();

    state.operation = { type: "moveSystem", subsystem: null, pickedUpAt: null };
  });

document
  .getElementById("operation-system-hide-systems")
  ?.addEventListener("click", function () {
    teardownAnyOperation();

    state.operation = { type: "toggleHideSystems", subsystem: null };
  });

document
  .getElementById("operation-system-add")
  ?.addEventListener("click", function () {
    teardownAnyOperation();

    state.operation = { type: "addSystem", position: null };
  });

document
  .getElementById("operation-erase")
  ?.addEventListener("click", function () {
    teardownAnyOperation();

    state.operation = {
      type: "removeSystemOrLink",
      subsystem: null,
      link: null,
    };
  });

document
  .getElementById("operation-system-set-title")
  ?.addEventListener("click", function () {
    teardownAnyOperation();

    state.operation = {
      type: "setSystemTitle",
      subsystem: null,
      editing: false,
    };
  });

document
  .getElementById("operation-system-set-parent")
  ?.addEventListener("click", function () {
    teardownAnyOperation();

    state.operation = {
      type: "setSystemParent",
      subsystem: null,
      parent: null,
      parentAt: null,
    };
  });

document
  .getElementById("operation-link-add")
  ?.addEventListener("click", function () {
    teardownAnyOperation();

    state.operation = { type: "addLink", a: null, b: null };
  });

for (const button of singleChoiceButtons) {
  button.addEventListener("click", function () {
    for (const other of singleChoiceButtons) {
      other.classList.remove("selected");
    }

    button.classList.add("selected");
  });
}

initializeDropdowns();

// Add PixiJS to the DOM.
canvasContainer.replaceChildren(app.view as unknown as Node);

// Load saved file.
loadFile();
