import {
  resizeCanvas,
  stopTicker,
  startTicker,
  onTick,
  initializeRenderer,
  screenshotCanvas,
} from "./renderer/api.js";
import {
  loadSimulation,
  modifySpecification,
  getKeyframesCount,
  initializeDrawingSimulation,
  getSimulationBoundaries,
} from "./simulator/api.js";
import { fitViewport } from "./viewport.js";
import { BlockSize, debounce, sanitizeHtml } from "./helpers.js";
import { initializeDropdowns } from "./dropdown.js";
import { state, resetState, pushChange } from "./state.js";
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
  getJsonEditorValue,
  isJsonEditorOpen,
  openJsonEditor,
  setJsonEditorValue,
} from "./jsonEditor.js";
import { getUrlParams, setUrlParams, load, save } from "./persistence.js";
import {
  moveViewport,
  startMovingViewport,
  stopMovingViewport,
  zoomViewport,
  screenToWorld,
} from "./viewport.js";

const canvasContainer = document.getElementById("canvas") as HTMLCanvasElement;

//
// Events
//

// The user moves the cursor in the canvas.
canvasContainer.addEventListener("pointermove", event => {
  if (isModalOpen() || isInitialLoad()) {
    return;
  }

  moveViewport(event.x, event.y);

  updateStatePosition(event.x, event.y);
  state.operation.onPointerMove(state);
});

// The user press the pointer in the canvas.
canvasContainer.addEventListener("pointerdown", event => {
  if (isModalOpen() || isInitialLoad()) {
    return;
  }

  // Only consider left mouse button.
  if (event.pointerType === "mouse" && event.button !== 0) {
    return;
  }

  startMovingViewport(event.x, event.y);

  updateStatePosition(event.x, event.y);
  state.operation.onPointerDown(state);
});

// The user release the pointer in the canvas.
canvasContainer.addEventListener("pointerup", event => {
  if (isModalOpen() || isInitialLoad()) {
    return;
  }

  // Only consider left mouse button.
  if (event.pointerType === "mouse" && event.button !== 0) {
    return;
  }

  stopMovingViewport();

  updateStatePosition(event.x, event.y);
  state.operation.onPointerUp(state);
});

// The user cursor enters the canvas.
canvasContainer.addEventListener("pointerenter", () => {
  if (isModalOpen() || isInitialLoad()) {
    return;
  }

  state.operation.onUnmute(state);
});

// The user cursor leaves the canvas.
canvasContainer.addEventListener("pointerleave", () => {
  if (isModalOpen() || isInitialLoad()) {
    return;
  }

  stopMovingViewport();

  state.operation.onMute(state);
});

// Resize the container when the window is resized.
window.addEventListener(
  "resize",
  debounce(() => {
    resizeCanvas();
  }, 10),
);

// The user press a key on the keyboard.
window.addEventListener("keydown", event => {
  if (isModalOpen()) {
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
  } else if (event.key === " ") {
    if (state.flowPlay) {
      pauseFlow();
    } else {
      playFlow();
    }
  } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
    goToPreviousKeyframe();
  } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
    goToNextKeyframe();
  } else if (event.key === "[") {
    undo();
  } else if (event.key === "]") {
    redo();
  } else if (event.key === "=") {
    cameraFit();
  } else if (event.key === "+") {
    cameraZoomIn();
  } else if (event.key === "-") {
    cameraZoomOut();
  }
});

// The user modifies the URL manually.
window.addEventListener("hashchange", () => {
  resetState();

  const urlParams = getUrlParams();

  state.flowPlay = urlParams.autoplay;
  state.flowSpeed = urlParams.speed;

  loadSaveData();
});

//
// JSON editor operations
//

document
  .getElementById("operation-json-editor-open")
  ?.addEventListener("click", function () {
    state.operation.onEnd(state);
    openJsonEditor();
  });

document
  .getElementById("operation-json-editor-apply-changes")
  ?.addEventListener("click", function () {
    const json = getJsonEditorValue();

    if (json) {
      state.operation.onEnd(state);
      pushChange(json);
      save(json);

      loadSimulation(json)
        .then(() => {
          updateFlowProgression();
        })
        .catch(() => {
          /* NOOP */
        });
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
  ?.addEventListener("click", async function () {
    const json = JSON.stringify(
      {
        specificationVersion: "1.0.0",
        title: "New system",
      },
      null,
      2,
    );

    resetState();
    setJsonEditorValue(json);

    await loadSimulation(json);

    updateFlowProgression();
    pushChange(json);

    const urlParams = getUrlParams();

    urlParams.autoplay = false;
    urlParams.speed = 1;

    setUrlParams(urlParams);
    save(json);

    const width = canvasContainer.offsetWidth * 1.5;
    const height = canvasContainer.offsetHeight * 1.5;

    fitViewport(width / 2, height / 2, width, height);
  });

document
  .getElementById("operation-export-png")
  ?.addEventListener("click", () => {
    screenshotCanvas().then(imageData => {
      const link = document.createElement("a");

      link.setAttribute("href", URL.createObjectURL(imageData));

      link.setAttribute(
        "download",
        `gg.${new Date().toJSON().replaceAll(":", ".")}.png`,
      );

      link.click();
    });
  });

//
// View operations
//

document
  .getElementById("operation-goto-viewer")
  ?.addEventListener("click", function () {
    window.location.replace(`/viewer.html${window.location.hash}`);
  });

const options = document.getElementById("options") as HTMLDialogElement;

document
  .getElementById("operation-options-open")
  ?.addEventListener("click", function () {
    options.inert = true;
    options.showModal();
    options.inert = false;
  });

const autoplay = document.getElementById("option-autoplay") as HTMLInputElement;

autoplay.checked = state.flowPlay;

autoplay.addEventListener("change", event => {
  const urlParams = getUrlParams();

  // @ts-ignore
  urlParams.autoplay = event.currentTarget!.checked.toString();

  setUrlParams(urlParams);
});

const speed = document.getElementById("option-speed") as HTMLInputElement;

speed.value = state.flowSpeed.toString();

speed.addEventListener("change", event => {
  // @ts-ignore
  state.flowSpeed = event.currentTarget!.value;

  const urlParams = getUrlParams();

  // @ts-ignore
  const value = Number(event.currentTarget!.value);

  urlParams.speed = !isNaN(value) ? Math.max(0.1, Math.min(5, value)) : 1;

  setUrlParams(urlParams);
});

//
// Undo / Redo operations.
//

function undo(): void {
  if (state.changeIndex > 0) {
    state.changeIndex -= 1;

    const json = state.changes[state.changeIndex];

    state.operation.onEnd(state);
    setJsonEditorValue(json);

    loadSimulation(json)
      .then(() => {
        updateFlowProgression();
        save(json);
      })
      .catch(() => {
        /* NOOP */
      });
  }
}

function redo(): void {
  if (state.changeIndex < state.changes.length - 1) {
    state.changeIndex += 1;

    const json = state.changes[state.changeIndex];

    state.operation.onEnd(state);
    setJsonEditorValue(json);

    loadSimulation(json)
      .then(() => {
        updateFlowProgression();
        save(json);
      })
      .catch(() => {
        /* NOOP */
      });
  }
}

document.getElementById("operation-undo")?.addEventListener("click", function() {
  undo();

  this.blur();
});

document.getElementById("operation-redo")?.addEventListener("click", function() {
  redo();

  this.blur();
});

//
// Camera operations.
//

function cameraFit(): void {
  const boundaries = getSimulationBoundaries();

  fitViewport(boundaries.x, boundaries.y, boundaries.width, boundaries.height);
}

function cameraZoomIn(): void {
  zoomViewport(0.25);
}

function cameraZoomOut(): void {
  zoomViewport(-0.25);
}

document
  .getElementById("operation-camera-fit")
  ?.addEventListener("click", function() {
    cameraFit();

    this.blur();
  });

document
  .getElementById("operation-camera-zoom-in")
  ?.addEventListener("click", function() {
    cameraZoomIn();

    this.blur();
  });

document
  .getElementById("operation-camera-zoom-out")
  ?.addEventListener("click", function() {
    cameraZoomOut();

    this.blur();
  });

//
// Flow operations
//

const flowPlay = document.getElementById("operation-flow-play")!;
const flowPause = document.getElementById("operation-flow-pause")!;
const flowRepeatOne = document.getElementById("operation-flow-repeat-one")!;
const flowRepeatAll = document.getElementById("operation-flow-repeat-all")!;

const flowPreviousKeyframe = document.getElementById(
  "operation-flow-previous-keyframe",
)!;

const flowNextKeyframe = document.getElementById(
  "operation-flow-next-keyframe",
)!;

function playFlow(): void {
  state.flowPlay = true;
  startTicker();

  flowPlay.classList.add("hidden");
  flowPause.classList.remove("hidden");
}

function pauseFlow(): void {
  state.flowPlay = false;
  stopTicker();

  flowPlay.classList.remove("hidden");
  flowPause.classList.add("hidden");
}

function goToPreviousKeyframe(): void {
  const keyframe = state.flowKeyframe | 0;
  const keyframeProgress = state.flowKeyframe - keyframe;

  if (keyframeProgress === 0) {
    if (keyframe === 0) {
      state.flowKeyframe = getKeyframesCount();
    } else {
      state.flowKeyframe = Math.max(0, keyframe - 1);
    }
  } else {
    state.flowKeyframe = keyframe;
  }

  updateFlowProgression();

  if (state.flowPlayer) {
    state.flowPlayer.setTargetKeyframe(state.flowKeyframe);
    state.flowPlayer.setKeyframe(state.flowKeyframe);
    state.flowPlayer.draw();
  }
}

function goToNextKeyframe(): void {
  state.flowKeyframe = (state.flowKeyframe | 0) + 1;

  updateFlowProgression();

  if (state.flowPlayer) {
    state.flowPlayer.setTargetKeyframe(state.flowKeyframe);
    state.flowPlayer.setKeyframe(state.flowKeyframe);
    state.flowPlayer.draw();
  }
}

// Initialization.
if (state.flowPlay) {
  flowPlay.classList.add("hidden");
  flowPause.classList.remove("hidden");
}

flowPlay.addEventListener("click", () => {
  playFlow();
  flowPlay.blur();
});

flowPause.addEventListener("click", () => {
  pauseFlow();
  flowPause.blur();
});

flowPreviousKeyframe.addEventListener("click", () => {
  goToPreviousKeyframe();
  flowPreviousKeyframe.blur();
});

flowNextKeyframe.addEventListener("click", () => {
  goToNextKeyframe();
  flowNextKeyframe.blur();
});

flowRepeatOne.addEventListener("click", function () {
  state.flowPlayMode = "repeatAll";

  flowRepeatOne.classList.add("hidden");
  flowRepeatAll.classList.remove("hidden");

  flowRepeatOne.blur();
});

flowRepeatAll.addEventListener("click", function () {
  state.flowPlayMode = "repeatOne";

  flowRepeatOne.classList.remove("hidden");
  flowRepeatAll.classList.add("hidden");

  flowRepeatAll.blur();
});

const flowStepSetTitleDialog = document.getElementById(
  "input-flow-step-set-title-dialog",
) as HTMLDialogElement;

flowStepSetTitleDialog.addEventListener("keydown", event => {
  event.stopPropagation();
});

const flowStepSetTitleTitle = flowStepSetTitleDialog.querySelector(
  "h1",
) as HTMLElement;

const flowStepSetTitleEditor = flowStepSetTitleDialog.querySelector(
  "input",
) as HTMLInputElement;

document
  .getElementById("operation-flow-edit-step-title")
  ?.addEventListener("click", function () {
    state.operation.onMute(state);

    const keyframe = state.flowKeyframe | 0;

    flowStepSetTitleTitle.innerHTML = `Set title for keyframe ${keyframe}`;

    const steps =
      state.simulator
        .getSystem()
        .flows.at(0)
        ?.steps?.filter(step => step.keyframe === keyframe) ?? [];

    const title = steps.find(step => step.description)?.description ?? "";

    flowStepSetTitleEditor.value = title;

    flowStepSetTitleDialog.showModal();
  });

document
  .getElementById("operation-flow-step-set-title-apply")
  ?.addEventListener("click", function () {
    let value: string | undefined = flowStepSetTitleEditor.value.trim();

    if (value === "") {
      value = undefined;
    }

    const keyframe = state.flowKeyframe | 0;

    // Apply operation.
    modifySpecification(() => {
      const steps =
        state.simulator
          .getSystem()
          .flows.at(0)
          ?.steps?.filter(step => step.keyframe === keyframe) ?? [];

      for (const step of steps) {
        step.specification.description = value;
      }
    });

    updateFlowProgression();
  });

const currentKeyframe = document.getElementById("information-flow-keyframe")!;

const currentKeyframeTitle = document.getElementById(
  "information-flow-step-title",
)!;

onTick(() => {
  if (state.flowPlay && state.flowPlayer) {
    updateFlowProgression();
  }
});

function updateFlowProgression(): void {
  const keyframe = state.flowKeyframe | 0;
  const system = state.simulator.getSystem();

  // Set number.
  currentKeyframe.innerHTML = keyframe.toString();

  // Set title.
  if (system.flows.at(0)?.steps.some(step => step.description)) {
    const steps =
      system.flows.at(0)?.steps?.filter(step => step.keyframe === keyframe) ??
      [];

    const title = steps.find(step => step.description)?.description ?? "";

    currentKeyframeTitle.innerHTML = sanitizeHtml(title);

    currentKeyframeTitle.classList.remove("hidden");
  } else {
    currentKeyframeTitle.classList.add("hidden");
  }
}

//
// Toolbox
//

// Initialize toolbox
const singleChoiceButtons = document.querySelectorAll(
  "#toolbox .single-choice button",
) as unknown as HTMLButtonElement[];

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

    button.blur();
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

// Initialize the renderer.
initializeRenderer({ withGrid: true })
  .then(() => {
    // Initialize operations.
    addSystemOperation.setup(state);
    setSystemTitleOperation.setup(state);
    moveSystemOperation.setup(state);
    setSystemParentOperation.setup(state);
    addLinkOperation.setup(state);
    eraseOperation.setup(state);
    setSystemHideSystemsOperation.setup(state);
    transferDataOperation.setup(state);

    // Initialize drawing the simulation.
    initializeDrawingSimulation();

    // Load saved data.
    loadSaveData();

    // Initialize default operation.
    switchOperation(state.operation);
  })
  .catch(() => {
    console.error("Could not initialize the canvas");
  });

//
// Utility functions
//

function loadSaveData(): void {
  const json = load();

  if (json) {
    const saveDataIsLoading = document.getElementById("save-data-is-loading")!;

    saveDataIsLoading.classList.remove("hidden");

    setJsonEditorValue(json);

    loadSimulation(json)
      .then(() => {
        updateFlowProgression();
        pushChange(json);
        save(json);

        const boundaries = getSimulationBoundaries();

        fitViewport(
          boundaries.x,
          boundaries.y,
          boundaries.width,
          boundaries.height,
        );

        state.flowPlayer?.draw();
      })
      .catch(() => {
        /* NOOP */
      })
      .finally(() => {
        saveDataIsLoading.classList.add("hidden");
      });
  }
}

function isModalOpen(): boolean {
  return (
    isJsonEditorOpen() ||
    options.open ||
    guide.open ||
    about.open ||
    privacy.open ||
    flowStepSetTitleDialog.open
  );
}

function isInitialLoad(): boolean {
  return !state.rendererInitialized || !state.simulatorInitialized;
}

/**
 * Update the state position from the screen position.
 *
 * The screen position is first transformed to the world position.
 * Then, this world position is transformed to the grid position.
 */
function updateStatePosition(x: number, y: number): void {
  const coordinates = screenToWorld(x, y);

  state.x =
    coordinates.x >= 0
      ? Math.floor(coordinates.x / BlockSize)
      : -Math.ceil(Math.abs(coordinates.x / BlockSize));

  state.y =
    coordinates.y >= 0
      ? Math.floor(coordinates.y / BlockSize)
      : -Math.ceil(Math.abs(coordinates.y / BlockSize));
}
