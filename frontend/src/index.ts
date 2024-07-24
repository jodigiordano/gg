import { Point } from "pixi.js";
import { app } from "./pixi.js";
import { viewport } from "./viewport.js";
import {
  getVisibleBoundaries,
  loadSimulation,
  tickFlowPlayer,
} from "./simulation.js";
import { BlockSize } from "./consts.js";
import { initializeDropdowns } from "./dropdown.js";
import example1 from "./assets/basic.yml?raw";
import example2 from "./assets/complex.yml?raw";
import { state, resetState, pushChange } from "./state.js";
import { redrawGrid, setGridVisible } from "./grid.js";
import Operation from "./operation.js";
import addSystemOperation from "./operations/systemAdd.js";
import setSystemTitleOperation from "./operations/systemSetTitle.js";
import moveSystemOperation from "./operations/systemMove.js";
import setSystemParentOperation from "./operations/systemSetParent.js";
import addLinkOperation from "./operations/linkAdd.js";
import eraseOperation from "./operations/erase.js";
import setSystemHideSystemsOperation from "./operations/systemToggleSystems.js";
import transferDataOperation from "./operations/flowTransferData.js";
import {
  getYamlEditorValue,
  isYamlEditorOpen,
  openYamlEditor,
  setYamlEditorValue,
} from "./yamlEditor.js";

//
// Events
//

viewport.on("pointermove", (event: any) => {
  updateStatePosition(event.data.global);
  state.operation.onPointerMove(state);
  tick();
});

viewport.on("pointerdown", (event: any) => {
  updateStatePosition(event.data.global);
  state.operation.onPointerDown(state);
  tick();
});

// The user cursor enters the canvas.
viewport.on("pointerenter", () => {
  state.operation.onUnmute(state);
  tick();
});

// The user cursor leaves the canvas.
viewport.on("pointerleave", () => {
  state.operation.onMute(state);
  tick();
});

viewport.on("pointerup", (event: any) => {
  updateStatePosition(event.data.global);
  state.operation.onPointerUp(state);
  tick();
});

// Move the grid when the viewport is moved.
viewport.on("moved", () => {
  redrawGrid();
  tick();
});

// Resize the container when the window is resized.
window.addEventListener(
  "resize",
  debounce(() => {
    const canvasContainer = document.getElementById("canvas") as HTMLDivElement;

    app.renderer.resize(
      canvasContainer.clientWidth,
      canvasContainer.clientHeight,
    );

    viewport.resize(canvasContainer.clientWidth, canvasContainer.clientHeight);

    redrawGrid();
    tick();
  }, 30),
);

window.addEventListener("keydown", event => {
  if (isYamlEditorOpen()) {
    return;
  }

  // The user press "Esc" to cancel any ongoing operation.
  if (event.key === "Escape" || event.key === "1") {
    switchOperation(moveSystemOperation);
  } else if (event.key === "2") {
    switchOperation(addSystemOperation);
  } else if (event.key === "3") {
    switchOperation(setSystemTitleOperation);
  } else if (event.key === "4") {
    switchOperation(addLinkOperation);
  } else if (event.key === "q") {
    switchOperation(setSystemParentOperation);
  } else if (event.key === "w") {
    switchOperation(eraseOperation);
  } else if (event.key === "e") {
    switchOperation(setSystemHideSystemsOperation);
  } else if (event.key === "r") {
    switchOperation(transferDataOperation);
  }

  tick();
});

//
// YAML editor operations
//

document
  .getElementById("operation-yaml-editor-open")
  ?.addEventListener("click", function () {
    state.operation.onEnd(state);
    openYamlEditor();
  });

document
  .getElementById("operation-yaml-editor-apply-changes")
  ?.addEventListener("click", function () {
    const value = getYamlEditorValue();

    if (value) {
      state.operation.onEnd(state);
      pushChange(value);
      loadSimulation(value);
      tick();
    }
  });

//
// Help operations
//

const guide = document.getElementById("guide") as HTMLDialogElement;

document
  .getElementById("operation-help-guide")
  ?.addEventListener("click", function () {
    state.operation.onMute(state);

    guide.inert = true;
    guide.showModal();
    guide.inert = false;
  });

const about = document.getElementById("about") as HTMLDialogElement;

document
  .getElementById("operation-help-about")
  ?.addEventListener("click", function () {
    state.operation.onMute(state);

    about.inert = true;
    about.showModal();
    about.inert = false;
  });

const privacy = document.getElementById("privacy") as HTMLDialogElement;

document
  .getElementById("operation-help-privacy")
  ?.addEventListener("click", function () {
    state.operation.onMute(state);

    privacy.inert = true;
    privacy.showModal();
    privacy.inert = false;
  });

//
// File operations
//

document
  .getElementById("operation-file-new")
  ?.addEventListener("click", function () {
    const value = ["specificationVersion: 1.0.0", "title: New system"].join(
      "\n",
    );

    setYamlEditorValue(value);
    loadSimulation(value);
    resetState();
    pushChange(value);

    const canvasContainer = document.getElementById("canvas") as HTMLDivElement;

    const width = canvasContainer.offsetWidth * 1.5;
    const height = canvasContainer.offsetHeight * 1.5;

    viewport.moveCenter(width / 2, height / 2);

    viewport.fit(true, width, height);

    redrawGrid();
    tick();
  });

document
  .getElementById("operation-file-load")
  ?.addEventListener("click", function () {
    loadFile();
    tick();
  });

document
  .getElementById("operation-file-save")
  ?.addEventListener("click", function () {
    const value = getYamlEditorValue();

    if (value) {
      window.localStorage.setItem("file", value);
    }
  });

document
  .getElementById("operation-examples-load-1")
  ?.addEventListener("click", function () {
    setYamlEditorValue(example1);
    loadSimulation(example1);
    resetState();
    pushChange(example1);
    fitSimulation();
    tick();
  });

document
  .getElementById("operation-examples-load-2")
  ?.addEventListener("click", function () {
    setYamlEditorValue(example2);
    loadSimulation(example2);
    resetState();
    pushChange(example2);
    fitSimulation();
    tick();
  });

document
  .getElementById("operation-export-png")
  ?.addEventListener("click", async function () {
    state.operation.onEnd(state);

    app.stop();

    setGridVisible(false);
    state.flowPlayer?.hide();

    viewport.backgroundColor = "0xffffff";

    // @ts-ignore
    const dataUri = await app.renderer.extract.image(viewport);

    const link = document.createElement("a");

    link.setAttribute("href", dataUri.src);

    link.setAttribute(
      "download",
      `gg.${new Date().toJSON().replaceAll(":", ".")}.png`,
    );

    link.click();

    setGridVisible(true);
    state.flowPlayer?.show();

    app.start();
  });

//
// Undo / Redo operations.
//

document
  .getElementById("operation-undo")
  ?.addEventListener("click", function () {
    if (state.changeIndex > 0) {
      state.changeIndex -= 1;

      const value = state.changes[state.changeIndex];

      state.operation.onEnd(state);
      setYamlEditorValue(value);
      loadSimulation(value);
      tick();
    }
  });

document
  .getElementById("operation-redo")
  ?.addEventListener("click", function () {
    if (state.changeIndex < state.changes.length - 1) {
      state.changeIndex += 1;

      const value = state.changes[state.changeIndex];

      state.operation.onEnd(state);
      setYamlEditorValue(value);
      loadSimulation(value);
      tick();
    }
  });

//
// Camera operations.
//

document
  .getElementById("operation-camera-fit")
  ?.addEventListener("click", function () {
    fitSimulation();

    tick();
  });

document
  .getElementById("operation-camera-zoom-in")
  ?.addEventListener("click", function () {
    viewport.zoomPercent(0.25, true);

    redrawGrid();
    tick();
  });

document
  .getElementById("operation-camera-zoom-out")
  ?.addEventListener("click", function () {
    viewport.zoomPercent(-0.25, true);

    redrawGrid();
    tick();
  });

//
// Flow operations
//

const flowPlay = document.getElementById("operation-flow-play")!;
const flowPause = document.getElementById("operation-flow-pause")!;
const flowRepeatOne = document.getElementById("operation-flow-repeat-one")!;
const flowRepeatAll = document.getElementById("operation-flow-repeat-all")!;

flowPlay.addEventListener("click", function () {
  state.flowPlay = false;
  app.ticker.stop();

  flowPlay.classList.add("hidden");
  flowPause.classList.remove("hidden");
});

flowPause.addEventListener("click", function () {
  state.flowPlay = true;
  app.ticker.start();

  flowPlay.classList.remove("hidden");
  flowPause.classList.add("hidden");
});

flowRepeatOne.addEventListener("click", function () {
  state.flowPlayMode = "all";

  flowRepeatOne.classList.add("hidden");
  flowRepeatAll.classList.remove("hidden");
});

flowRepeatAll.addEventListener("click", function () {
  state.flowPlayMode = "one";

  flowRepeatOne.classList.remove("hidden");
  flowRepeatAll.classList.add("hidden");
});

document
  .getElementById("operation-flow-previous-keyframe")
  ?.addEventListener("click", function () {

    const value = getYamlEditorValue();

    if (value) {
      state.flowKeyframe -= 1;

      loadSimulation(value);
      tickFlowPlayer();
      tick();
    }
  });

document
  .getElementById("operation-flow-next-keyframe")
  ?.addEventListener("click", function () {
    const value = getYamlEditorValue();

    if (value) {
      state.flowKeyframe += 1;

      loadSimulation(value);
      tickFlowPlayer();
      tick();
    }
  });

//
// Toolbox
//

// Initialize toolbox
addSystemOperation.setup(state);
setSystemTitleOperation.setup(state);
moveSystemOperation.setup(state);
setSystemParentOperation.setup(state);
addLinkOperation.setup(state);
eraseOperation.setup(state);
setSystemHideSystemsOperation.setup(state);
transferDataOperation.setup(state);

const singleChoiceButtons = document.querySelectorAll(
  "#toolbox .single-choice button",
);

for (const button of singleChoiceButtons) {
  button.addEventListener("click", function () {
    for (const other of singleChoiceButtons) {
      other.classList.remove("selected");
    }

    state.operation.onEnd(state);

    button.classList.add("selected");

    if (button.id === "operation-link-add") {
      state.operation = addLinkOperation;
    } else if (button.id === "operation-system-add") {
      state.operation = addSystemOperation;
    } else if (button.id === "operation-system-move") {
      state.operation = moveSystemOperation;
    } else if (button.id === "operation-erase") {
      state.operation = eraseOperation;
    } else if (button.id === "operation-system-set-parent") {
      state.operation = setSystemParentOperation;
    } else if (button.id === "operation-system-set-title") {
      state.operation = setSystemTitleOperation;
    } else if (button.id === "operation-system-hide-systems") {
      state.operation = setSystemHideSystemsOperation;
    } else if (button.id === "operation-flow-data-transfer") {
      state.operation = transferDataOperation;
    }

    state.operation.onBegin(state);
    state.operation.onMute(state);

    tick();
  });
}

function switchOperation(operation: Operation): void {
  state.operation.onEnd(state);
  state.operation = operation;
  state.operation.onBegin(state);

  for (const button of singleChoiceButtons) {
    if (button.id === operation.id) {
      button.classList.add("selected");
    } else {
      button.classList.remove("selected");
    }
  }
}

// Initialize dropdowns.
initializeDropdowns();

// Load saved file.
loadFile();

// Initial update / draw.
tick();

//
// Utility functions
//

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

function fitSimulation() {
  const boundaries = getVisibleBoundaries();

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
    setYamlEditorValue(value);
    loadSimulation(value);
    resetState();
    pushChange(value);
    fitSimulation();
  }
}

function tick() {
  app.ticker.update();
}

function debounce(callback: () => void, waitMs: number) {
  let timeoutId: number | undefined = undefined;

  return () => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      callback();
    }, waitMs);
  };
}
