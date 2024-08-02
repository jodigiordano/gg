import { Point } from "pixi.js";
import { app, tick } from "./pixi.js";
import { viewport } from "./viewport.js";
import {
  loadSimulation,
  fitSimulation,
  modifySpecification,
  getKeyframesCount,
} from "./simulation.js";
import { BlockSize, debounce, sanitizeHtml } from "./helpers.js";
import { initializeDropdowns } from "./dropdown.js";
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
import { getUrlParams, setUrlParams, load, save } from "./persistence.js";

//
// Events
//

// The user moves the cursor in the canvas.
viewport.on("pointermove", (event: any) => {
  updateStatePosition(event.data.global);
  state.operation.onPointerMove(state);
  tick();
});

// The user press the pointer in the canvas.
viewport.on("pointerdown", (event: any) => {
  // Only consider left mouse button.
  if (event.pointerType === "mouse" && event.button !== 0) {
    return;
  }

  updateStatePosition(event.data.global);
  state.operation.onPointerDown(state);
  tick();
});

// The user release the pointer in the canvas.
viewport.on("pointerup", (event: any) => {
  // Only consider left mouse button.
  if (event.pointerType === "mouse" && event.button !== 0) {
    return;
  }

  updateStatePosition(event.data.global);
  state.operation.onPointerUp(state);
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
  if (
    isYamlEditorOpen() ||
    options.open ||
    guide.open ||
    about.open ||
    privacy.open ||
    flowStepSetTitleDialog.open
  ) {
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
  }

  tick();
});

// Fired when the user modifes the URL manually.
window.addEventListener("hashchange", () => {
  resetState();

  const urlParams = getUrlParams();

  state.flowPlay = urlParams.autoplay;
  state.flowSpeed = urlParams.speed;

  loadSaveData();
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
      save(value);
      loadSimulation(value);
      updateFlowProgression();
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

    resetState();
    setYamlEditorValue(value);
    loadSimulation(value);
    updateFlowProgression();
    pushChange(value);

    const urlParams = getUrlParams();

    urlParams.autoplay = false;
    urlParams.speed = 1;

    setUrlParams(urlParams);
    save(value);

    const canvasContainer = document.getElementById("canvas") as HTMLDivElement;

    const width = canvasContainer.offsetWidth * 1.5;
    const height = canvasContainer.offsetHeight * 1.5;

    viewport.moveCenter(width / 2, height / 2);

    viewport.fit(true, width, height);

    redrawGrid();
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
    state.flowPlayer?.draw();

    app.start();
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

document
  .getElementById("operation-undo")
  ?.addEventListener("click", function () {
    if (state.changeIndex > 0) {
      state.changeIndex -= 1;

      const value = state.changes[state.changeIndex];

      state.operation.onEnd(state);
      setYamlEditorValue(value);
      loadSimulation(value);
      updateFlowProgression();
      save(value);
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
      updateFlowProgression();
      save(value);
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
    redrawGrid();
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

const flowPreviousKeyframe = document.getElementById(
  "operation-flow-previous-keyframe",
)!;

const flowNextKeyframe = document.getElementById(
  "operation-flow-next-keyframe",
)!;

function playFlow(): void {
  state.flowPlay = true;
  app.ticker.start();

  flowPlay.classList.add("hidden");
  flowPause.classList.remove("hidden");
}

function pauseFlow(): void {
  state.flowPlay = false;
  app.ticker.stop();

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
    tick();
  }
}

function goToNextKeyframe(): void {
  state.flowKeyframe = (state.flowKeyframe | 0) + 1;

  updateFlowProgression();

  if (state.flowPlayer) {
    state.flowPlayer.setTargetKeyframe(state.flowKeyframe);
    state.flowPlayer.setKeyframe(state.flowKeyframe);
    state.flowPlayer.draw();
    tick();
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
});

flowRepeatAll.addEventListener("click", function () {
  state.flowPlayMode = "repeatOne";

  flowRepeatOne.classList.remove("hidden");
  flowRepeatAll.classList.add("hidden");
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
      state.system.flows
        .at(0)
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
        state.system.flows
          .at(0)
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

app.ticker.add<void>(() => {
  if (state.flowPlay && state.flowPlayer) {
    updateFlowProgression();
  }
});

function updateFlowProgression(): void {
  const keyframe = state.flowKeyframe | 0;

  // Set number.
  currentKeyframe.innerHTML = keyframe.toString();

  // Set title.
  if (state.system.flows.at(0)?.steps.some(step => step.description)) {
    const steps =
      state.system.flows
        .at(0)
        ?.steps?.filter(step => step.keyframe === keyframe) ?? [];

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

// Load saved data.
loadSaveData();

// Initial update / draw.
tick();

//
// Utility functions
//

function loadSaveData(): void {
  const loaded = load();

  if (loaded) {
    setYamlEditorValue(loaded);
    loadSimulation(loaded);
    updateFlowProgression();
    pushChange(loaded);
    save(loaded);
    fitSimulation();
    redrawGrid();
    state.flowPlayer?.draw();
    tick();
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

  state.x = (coordinates.x / BlockSize) | 0;
  state.y = (coordinates.y / BlockSize) | 0;
}
