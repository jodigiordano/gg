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
  RuntimeSubsystem,
  moveSubsystemToParent,
  TitleCharsPerSquare,
  setSubsystemTitle,
  SystemMinSize,
} from "@gg/spec";
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
  Spritesheet,
  Text,
  Point,
} from "pixi.js";
import { CanvasSimulator, CanvasFlowPlayer } from "./simulation.js";
import { BlockSize } from "./consts.js";
import { initializeDropdowns } from "./dropdown.js";
import example1 from "./assets/basic.yml?raw";
import example2 from "./assets/complex.yml?raw";
import spritesheetData from "./assets/spritesheet.png?base64";
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
}

interface RemoveSystemOrLinkOperation {
  type: "removeSystemOrLink";
  subsystem: RuntimeSubsystem | null;
  link: RuntimeLink | null;
}

interface SetSystemParentOperation {
  type: "setSystemParent";
  subsystem: RuntimeSubsystem | null;
  pickedUpAt: RuntimePosition | null;
}

interface AddLinkOperation {
  type: "addLink";
  a: RuntimeSubsystem | null;
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
  x: number;
  y: number;
}

const state: State = {
  changes: [],
  changeIndex: -1,
  operation: { type: "moveSystem", subsystem: null, pickedUpAt: null },
  x: -999999,
  y: -999999,
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
  setupOperationSystemMove();
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
  backgroundAlpha: 0,
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
  screenWidth: canvasContainer.offsetWidth,
  screenHeight: canvasContainer.offsetHeight,
  worldWidth: canvasContainer.offsetWidth,
  worldHeight: canvasContainer.offsetHeight,
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
  updateStatePosition(event.data.global);

  if (
    (state.operation.type === "moveSystem" ||
      state.operation.type === "setSystemParent") &&
    state.operation.subsystem &&
    state.operation.pickedUpAt
  ) {
    const deltaX = state.x - state.operation.pickedUpAt.x;
    const deltaY = state.y - state.operation.pickedUpAt.y;

    dragAndDrop.x = (state.operation.subsystem.position.x + deltaX) * BlockSize;

    dragAndDrop.y = (state.operation.subsystem.position.y + deltaY) * BlockSize;
  } else if (state.operation.type === "addSystem") {
    dragAndDrop.x = state.x * BlockSize;
    dragAndDrop.y = state.y * BlockSize;
  }
});

viewport.on("pointerdown", (event: any) => {
  if (!canvasSimulator) {
    return;
  }

  updateStatePosition(event.data.global);

  if (state.operation.type === "toggleHideSystems") {
    state.operation.subsystem = canvasSimulator.systemSimulator.getSubsystemAt(
      state.x,
      state.y,
    );
  } else if (state.operation.type === "removeSystemOrLink") {
    const link = canvasSimulator.systemSimulator.getLinkAt(state.x, state.y);

    if (link) {
      state.operation.link = link;
    } else {
      state.operation.subsystem =
        canvasSimulator.systemSimulator.getSubsystemAt(state.x, state.y);
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
      state.x,
      state.y,
    );
  } else if (state.operation.type === "addLink") {
    const subsystem = canvasSimulator.systemSimulator.getSubsystemAt(
      state.x,
      state.y,
    );

    if (!subsystem) {
      return;
    }

    viewport.pause = true;

    state.operation.a = subsystem;
  } else if (
    state.operation.type === "moveSystem" ||
    state.operation.type === "setSystemParent"
  ) {
    // Operation: Move system.
    // Operation: Set system parent.
    const subsystem = canvasSimulator.systemSimulator.getSubsystemAt(
      state.x,
      state.y,
    );

    if (!subsystem) {
      return;
    }

    viewport.pause = true;

    state.operation.subsystem = subsystem;
    state.operation.pickedUpAt = { x: state.x, y: state.y };

    dragAndDrop.x = subsystem.position.x * BlockSize;
    dragAndDrop.y = subsystem.position.y * BlockSize;
    dragAndDrop.width = subsystem.size.width * BlockSize;
    dragAndDrop.height = subsystem.size.height * BlockSize;

    // @ts-ignore
    dragAndDropContainer.addChild(dragAndDrop);
  } else if (state.operation.type === "addSystem") {
    // This code is only necessary on mobile.
    //
    // On mobile, there is no mouse pointer being drag around
    // when adding a system. Therefore, the position of the overlay
    // is only updated on "pointerdown". Here we update the position
    // of the overlay so it appears under the pointer for this event.
    dragAndDrop.x = state.x * BlockSize;
    dragAndDrop.y = state.y * BlockSize;
  }
});

// The user cursor enters the canvas.
viewport.on("pointerenter", () => {
  dragAndDropContainer.visible = true;
});

// The user cursor leaves the canvas.
viewport.on("pointerleave", () => {
  dragAndDropContainer.visible = false;
});

viewport.on("pointerup", (event: any) => {
  if (!canvasSimulator) {
    return;
  }

  updateStatePosition(event.data.global);

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
    // Apply operation.
    const system =
      canvasSimulator.systemSimulator.getSubsystemAt(state.x, state.y) ??
      canvasSimulator.system;

    modifySpecification(() => {
      addSubsystem(system, state.x, state.y, "");
    });

    // Reset operation.
    state.operation = {
      type: "addSystem",
    };
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

        // @ts-ignore
        setSystemTitleContainer.addChild(setSystemTitleMask);

        const title = subsystem.title.replace(/\\n/g, "\n");

        setSystemTitleEditor.text = title;
        setSystemTitleEditor.x = titleX;
        setSystemTitleEditor.y = titleY;

        // @ts-ignore
        setSystemTitleContainer.addChild(setSystemTitleEditor);

        const titleLastLineLength = title.split("\n").at(-1)!.length;

        setSystemTitleCursor.x =
          setSystemTitleEditor.x +
          (titleLastLineLength % 2 === 0
            ? (titleLastLineLength / TitleCharsPerSquare) * BlockSize
            : ((titleLastLineLength - 1) / TitleCharsPerSquare) * BlockSize +
              BlockSize / TitleCharsPerSquare);

        setSystemTitleCursor.y =
          setSystemTitleEditor.y + setSystemTitleEditor.height - BlockSize;

        // @ts-ignore
        setSystemTitleContainer.addChild(setSystemTitleCursor);

        state.operation.editing = true;
      }
    }
  } else if (state.operation.type === "setSystemParent") {
    if (state.operation.subsystem) {
      // Apply operation.
      const { subsystem } = state.operation;

      const parent =
        canvasSimulator.systemSimulator.getSubsystemAt(state.x, state.y) ??
        canvasSimulator.system;

      if (
        parent.canonicalId !== subsystem.canonicalId &&
        parent.canonicalId !== subsystem.parent?.canonicalId
      ) {
        const positionInParent = {
          x: state.x - parent.position.x,
          y: state.y - parent.position.y,
        };

        modifySpecification(() => {
          moveSubsystemToParent(subsystem, parent, positionInParent);

          if (parent.canonicalId) {
            parent.specification.hideSystems = false;
          }
        });
      }

      // Reset operation.
      dragAndDropContainer.removeChildren();

      viewport.pause = false;

      state.operation = {
        type: "setSystemParent",
        subsystem: null,
        pickedUpAt: null,
      };
    }
  } else if (state.operation.type === "addLink") {
    if (state.operation.a) {
      // Apply operation.
      const { a } = state.operation;
      const b = canvasSimulator.systemSimulator.getSubsystemAt(
        state.x,
        state.y,
      );

      if (b && b.canonicalId !== a.canonicalId) {
        modifySpecification(() => {
          addLink(canvasSimulator!.system, a.canonicalId, b.canonicalId);
        });
      }

      // Reset operation.
      viewport.pause = false;

      state.operation = { type: "addLink", a: null };
    }
  }

  // Operation: Move system.
  else if (state.operation.type === "moveSystem") {
    if (state.operation.subsystem && state.operation.pickedUpAt) {
      // Apply operation.

      const deltaX = state.x - state.operation.pickedUpAt.x;
      const deltaY = state.y - state.operation.pickedUpAt.y;

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
    setupOperationSystemMove();
  } else if (event.key === "1") {
    setupOperationSystemMove();
  } else if (event.key === "2") {
    setupOperationSystemAdd();
  } else if (event.key === "3") {
    setupOperationSystemSetTitle();
  } else if (event.key === "4") {
    setupOperationLinkAdd();
  } else if (event.key === "q") {
    setupOperationSystemSetParent();
  } else if (event.key === "w") {
    setupOperationErase();
  } else if (event.key === "e") {
    setupOperationSystemHideSystems();
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

/**
 * Update the state position from the screen position.
 *
 * The screen position is first transformed to the world position.
 * Then, this world position is transformed to the grid position.
 */
function updateStatePosition(screenPosition: Point): void {
  const coordinates = viewport.toWorld(screenPosition);

  state.x = Math.floor(coordinates.x / BlockSize) | 0;
  state.y = Math.floor(coordinates.y / BlockSize) | 0;
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
    // @ts-ignore
    canvasSimulatorContainer.addChild(objectToRender);
  }

  if (canvasSimulator.system.flows.length) {
    canvasFlowPlayer = canvasSimulator.createFlowPlayer(app, 0);

    for (const objectToRender of canvasFlowPlayer.getObjectsToRender()) {
      // @ts-ignore
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
  .getElementById("operation-file-new")
  ?.addEventListener("click", function () {
    yamlEditor.value = [
      "specificationVersion: 1.0.0",
      "title: New system",
    ].join("\n");

    loadSimulation(yamlEditor.value);
    resetState();
    pushChange(yamlEditor.value);

    const width = canvasContainer.offsetWidth * 1.5;
    const height = canvasContainer.offsetHeight * 1.5;

    viewport.moveCenter(width / 2, height / 2);

    viewport.fit(true, width, height);

    redrawGrid();
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
  .getElementById("operation-export-png")
  ?.addEventListener("click", async function () {
    app.stop();
    grid.visible = false;

    viewport.backgroundColor = "0xffffff";

    // @ts-ignore
    const dataUri = await app.renderer.extract.image(viewport, "test");

    const link = document.createElement("a");

    link.setAttribute("href", dataUri.src);
    link.setAttribute("download", "gg.png");
    link.click();

    grid.visible = true;
    app.start();
  });

//
// Toolbox
//

// Operation: SystemMove

const operationSystemMove = document.getElementById("operation-system-move")!;

function setupOperationSystemMove() {
  teardownAnyOperation();

  state.operation = { type: "moveSystem", subsystem: null, pickedUpAt: null };

  operationSystemMove.classList.add("selected");
}

operationSystemMove.addEventListener("click", setupOperationSystemMove);

// Operation: SystemAdd

const operationSystemAdd = document.getElementById("operation-system-add")!;

function setupOperationSystemAdd() {
  teardownAnyOperation();

  state.operation = { type: "addSystem" };

  dragAndDrop.x = state.x * BlockSize;
  dragAndDrop.y = state.y * BlockSize;
  dragAndDrop.width = SystemMinSize.width * BlockSize;
  dragAndDrop.height = SystemMinSize.height * BlockSize;

  // @ts-ignore
  dragAndDropContainer.addChild(dragAndDrop);

  operationSystemAdd.classList.add("selected");
}

operationSystemAdd.addEventListener("click", setupOperationSystemAdd);

// Operation: SystemSetTitle

const operationSystemSetTitle = document.getElementById(
  "operation-system-set-title",
)!;

function setupOperationSystemSetTitle() {
  teardownAnyOperation();

  state.operation = {
    type: "setSystemTitle",
    subsystem: null,
    editing: false,
  };

  operationSystemSetTitle.classList.add("selected");
}

operationSystemSetTitle.addEventListener("click", setupOperationSystemSetTitle);

// Operation: LinkAdd

const operationLinkAdd = document.getElementById("operation-link-add")!;

function setupOperationLinkAdd() {
  teardownAnyOperation();

  state.operation = { type: "addLink", a: null };

  operationLinkAdd.classList.add("selected");
}

operationLinkAdd.addEventListener("click", setupOperationLinkAdd);

// Operation: SystemSetParent

const operationSystemSetParent = document.getElementById(
  "operation-system-set-parent",
)!;

function setupOperationSystemSetParent() {
  teardownAnyOperation();

  state.operation = {
    type: "setSystemParent",
    subsystem: null,
    pickedUpAt: null,
  };

  operationSystemSetParent.classList.add("selected");
}

operationSystemSetParent.addEventListener(
  "click",
  setupOperationSystemSetParent,
);

// Operation: Erase

const operationErase = document.getElementById("operation-erase")!;

function setupOperationErase() {
  teardownAnyOperation();

  state.operation = {
    type: "removeSystemOrLink",
    subsystem: null,
    link: null,
  };

  operationErase.classList.add("selected");
}

operationErase.addEventListener("click", setupOperationErase);

// Operation: SystemHideSystems

const operationSystemHideSystems = document.getElementById(
  "operation-system-hide-systems",
)!;

function setupOperationSystemHideSystems() {
  teardownAnyOperation();

  state.operation = { type: "toggleHideSystems", subsystem: null };

  operationSystemHideSystems.classList.add("selected");
}

operationSystemHideSystems.addEventListener(
  "click",
  setupOperationSystemHideSystems,
);

// Operation: Undo

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

// Operation: Redo

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

// Operation: CameraFit

document
  .getElementById("operation-camera-fit")
  ?.addEventListener("click", fitSimulation);

// Operation: CameraZoomIn

document
  .getElementById("operation-camera-zoom-in")
  ?.addEventListener("click", function () {
    viewport.zoomPercent(0.25, true);

    redrawGrid();
  });

// Operation: CameraZoomOut

document
  .getElementById("operation-camera-zoom-out")
  ?.addEventListener("click", function () {
    viewport.zoomPercent(-0.25, true);

    redrawGrid();
  });

// Initialize toolbox
for (const button of singleChoiceButtons) {
  button.addEventListener("click", function () {
    for (const other of singleChoiceButtons) {
      other.classList.remove("selected");
    }

    button.classList.add("selected");
  });
}

// Initialize dropdowns.
initializeDropdowns();

// Add PixiJS to the DOM.
canvasContainer.replaceChildren(app.view as unknown as Node);

// Load saved file.
loadFile();
