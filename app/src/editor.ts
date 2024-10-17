import { app, tick } from "./renderer/pixi.js";
import viewport from "./renderer/viewport.js";
import {
  loadSimulation,
  fitSimulation,
  drawSimulation,
} from "./simulator/api.js";
import { BlockSize, debounce } from "./helpers.js";
import { initializeDropdowns } from "./dropdown.js";
import { state, resetState, pushChange } from "./state.js";
import { redrawGrid, setGridTheme, setGridVisible } from "./renderer/grid.js";
import Operation from "./operation.js";
import addBoxOperation from "./operations/addBox.js";
import addListOperation from "./operations/addList.js";
import selectOperation from "./operations/select.js";
import panOperation from "./operations/pan.js";
import linkOperation from "./operations/link.js";
import eraseOperation from "./operations/erase.js";
import paintOperation from "./operations/paint.js";
import debugOperation from "./operations/debug.js";
import {
  getJsonEditorValue,
  isJsonEditorOpen,
  openJsonEditor,
  setJsonEditorValue,
} from "./jsonEditor.js";
import {
  getUrlParams,
  setUrlParams,
  load,
  save,
  resetUrlParams,
  isNewUser,
} from "./persistence.js";
import { getThemeOnLoad } from "./theme.js";
import { setConnectivity, connectivityStatus } from "./connectivity.js";

const canvasContainer = document.getElementById("canvas") as HTMLDivElement;

const saveDataIsLoading = document.getElementById(
  "save-data-is-loading",
) as HTMLElement;

const loadFileFailed = document.getElementById(
  "load-file-failed-dialog",
) as HTMLDialogElement;

//
// State
//

let operation: Operation = selectOperation;

//
// Events
//

// The user moves the cursor in the canvas.
canvasContainer.addEventListener("pointermove", event => {
  if (isModalOpen() || isInitialLoad()) {
    return;
  }

  if (viewport.moving || viewport.mobileMoving) {
    viewport.move(event.pointerId, event.x, event.y);
  }

  updateStatePosition(event.x, event.y);

  if (viewport.mobileMoving) {
    operation.onEnd(state);
  }

  if (viewport.moving || viewport.mobileMoving) {
    redrawGrid();
  } else {
    operation.onPointerMove(state);
  }

  tick();
});

canvasContainer.addEventListener("dblclick", () => {
  operation.onPointerDoublePress(state);
});

// The user press the pointer in the canvas.
canvasContainer.addEventListener("pointerdown", event => {
  if (isModalOpen() || isInitialLoad()) {
    return;
  }

  viewport.startMoving(event.pointerId, event.x, event.y);

  // Only consider left mouse button for operations.
  if (event.pointerType === "mouse" && event.button !== 0) {
    return;
  }

  if (viewport.mobileMoving) {
    operation.onEnd(state);
    return;
  }

  updateStatePosition(event.x, event.y);
  operation.onPointerDown(state);
  tick();
});

// The user release the pointer in the canvas.
canvasContainer.addEventListener("pointerup", event => {
  if (isModalOpen() || isInitialLoad()) {
    return;
  }

  viewport.stopMoving(event.pointerId);

  if (viewport.moving) {
    return;
  }

  if (viewport.mobileMoving) {
    operation.onEnd(state);
    return;
  }

  // Only consider left mouse button for operations.
  if (event.pointerType === "mouse" && event.button !== 0) {
    return;
  }

  updateStatePosition(event.x, event.y);
  operation.onPointerUp(state);
  tick();
});

// The user spin the mouse wheel.
canvasContainer.addEventListener("wheel", event => {
  if (event.deltaY > 0) {
    viewport.zoomAt(-0.1, event.x, event.y);

    redrawGrid();
    tick();
  } else if (event.deltaY < 0) {
    viewport.zoomAt(0.1, event.x, event.y);

    redrawGrid();
    tick();
  }
});

// The user cursor enters the canvas.
canvasContainer.addEventListener("pointerenter", () => {
  if (isModalOpen() || isInitialLoad()) {
    return;
  }

  operation.onPointerEnter(state);
  tick();
});

// The user cursor leaves the canvas.
canvasContainer.addEventListener("pointerleave", event => {
  if (isModalOpen() || isInitialLoad()) {
    return;
  }

  viewport.stopMoving(event.pointerId);

  // On mobile / tablet, the user cannot drag the mouse outside the canvas.
  // Yet, the event is triggered on pointer up.
  if (event.pointerType !== "mouse") {
    return;
  }

  operation.onPointerLeave(state);
  tick();
});

// The user adds a box, list, etc.
window.addEventListener("system-added", event => {
  switchOperation(selectOperation);

  selectOperation.onEvent(state, event as CustomEvent);
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

// The user press a key on the keyboard.
window.addEventListener("keydown", event => {
  if (isModalOpen()) {
    return;
  }

  // The user press "ctrl+a" to select everything,
  // so we switch to the move operation.
  if (event.ctrlKey && event.key === "a") {
    event.preventDefault();
    switchOperation(selectOperation);
  }

  // The user press "ctrl+v" to paste a selection,
  // so we switch to the move operation.
  if (event.ctrlKey && event.key === "v") {
    event.preventDefault();
    switchOperation(selectOperation);
  }

  if (!event.ctrlKey) {
    // The user press "Esc" to cancel any ongoing operation.
    if (event.key === "Escape" || event.key === "1") {
      switchOperation(selectOperation);
    } else if (event.key === "2") {
      switchOperation(eraseOperation);
    } else if (event.key === "3") {
      switchOperation(addBoxOperation);
    } else if (event.key === "4") {
      switchOperation(linkOperation);
    } else if (event.key === "5") {
      switchOperation(addListOperation);
    } else if (event.key === "6") {
      switchOperation(paintOperation);
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
    } else {
      operation.onKeyDown(state, event);
    }
  } else if (event.ctrlKey && event.key === "z") {
    undo();
  } else if (event.ctrlKey && event.key === "y") {
    redo();
  } else {
    operation.onKeyDown(state, event);
  }

  tick();
});

// The user modifies the URL manually.
window.addEventListener("hashchange", () => {
  resetState();
  switchOperation(selectOperation);

  const urlParams = getUrlParams();

  state.zoomControls = urlParams.zoomControls;
  state.editorButton = urlParams.editorButton;

  loadSaveData({ newUser: false });
});

//
// JSON editor operations
//

document
  .getElementById("operation-json-editor-open")
  ?.addEventListener("click", function () {
    operation.onEnd(state);
    openJsonEditor();
  });

document
  .getElementById("operation-json-editor-apply-changes")
  ?.addEventListener("click", async function () {
    const json = getJsonEditorValue();

    if (!json) {
      return;
    }

    try {
      await loadSimulation(json);
    } catch {
      setJsonEditorValue(state.changes[state.changeIndex]);
      loadFileFailed.showModal();

      return;
    }

    operation.onEnd(state);
    pushChange(json);
    setDocumentTitle(json);

    save(json)
      .then(() => setConnectivity(isLocalFile() ? "local-file" : "ok"))
      .catch(() => setConnectivity("save-failed"));

    tick();
  });

//
// Feedback operations
//

const feedback = document.getElementById("feedback") as HTMLDialogElement;

const feedbackEmail = document.getElementById(
  "feedback-email",
) as HTMLInputElement;

const feedbackMessage = document.getElementById(
  "feedback-message",
) as HTMLInputElement;

const feedbackIncludeChart = document.getElementById(
  "feedback-include-chart",
) as HTMLInputElement;

feedback.addEventListener("keydown", event => {
  event.stopPropagation();
});

const feedbackSent = document.getElementById(
  "feedback-sent-dialog",
) as HTMLDialogElement;

document
  .getElementById("operation-feedback-open")
  ?.addEventListener("click", function () {
    feedback.inert = true;
    feedback.showModal();
    feedback.inert = false;
  });

document
  .getElementById("operation-feedback-send")
  ?.addEventListener("click", async function () {
    fetch("/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: feedbackEmail.value,
        message: feedbackMessage.value,
        chart: feedbackIncludeChart.checked ? getJsonEditorValue() : undefined,
      }),
    })
      .then(async response => {
        if (response.ok) {
          feedbackSent.showModal();
        } else {
          // TODO: handle error.
        }
      })
      .catch(() => {
        /* TODO: handle error */
      });
  });

//
// Help operations
//

const guide = document.getElementById("guide") as HTMLDialogElement;

document
  .getElementById("operation-help-guide")
  ?.addEventListener("click", function () {
    guide.inert = true;
    guide.showModal();
    guide.inert = false;
  });

const privacy = document.getElementById("privacy") as HTMLDialogElement;

document
  .getElementById("operation-help-privacy")
  ?.addEventListener("click", function () {
    privacy.inert = true;
    privacy.showModal();
    privacy.inert = false;
  });

//
// Theme operations
//

const theme = document.getElementById("theme") as HTMLDialogElement;

document
  .getElementById("operation-theme")
  ?.addEventListener("click", function () {
    theme.inert = true;
    theme.showModal();
    theme.inert = false;
  });

document
  .getElementById("operation-theme-light")
  ?.addEventListener("click", function () {
    state.theme = "light";

    window.localStorage.setItem("theme", state.theme);
    document.documentElement.setAttribute("theme", state.theme);

    setGridTheme(state.theme);

    drawSimulation();

    theme.close();
  });

document
  .getElementById("operation-theme-dark")
  ?.addEventListener("click", function () {
    state.theme = "dark";

    window.localStorage.setItem("theme", state.theme);
    document.documentElement.setAttribute("theme", state.theme);

    setGridTheme(state.theme);

    drawSimulation();

    theme.close();
  });

document
  .getElementById("operation-theme-system")
  ?.addEventListener("click", function () {
    window.localStorage.removeItem("theme");
    document.documentElement.removeAttribute("theme");

    state.theme = getThemeOnLoad();
    setGridTheme(state.theme);

    drawSimulation();

    theme.close();
  });

//
// File operations
//

async function newFile(): Promise<void> {
  resetUrlParams();

  // Local file.
  let json = JSON.stringify(
    {
      specificationVersion: "1.0.0",
      title: "Untitled chart",
    },
    null,
    2,
  );

  // Cloud file.
  if (state.profile.authenticated) {
    if (state.profile.readOnly) {
      // When in read-only, a local file is created.
      setConnectivity("read-only");
    } else {
      try {
        const response = await fetch("/api/charts", { method: "POST" });

        if (response.ok) {
          const chart = await response.json();

          json = JSON.stringify(chart.data, null, 2);

          const urlParams = getUrlParams();

          urlParams.id = chart.id;

          setUrlParams(urlParams);

          setConnectivity("ok");
        } else {
          // Fallback: a local file is created.
          setConnectivity("local-file");
        }
      } catch {
        // Fallback: a local file is created.
        setConnectivity("local-file");
      }
    }
  }

  resetState();
  switchOperation(selectOperation);
  setJsonEditorValue(json);
  setDocumentTitle(json);

  await loadSimulation(json);

  pushChange(json);

  save(json)
    .then(() => setConnectivity(isLocalFile() ? "local-file" : "ok"))
    .catch(() => setConnectivity("save-failed"));

  const canvasContainer = document.getElementById("canvas") as HTMLDivElement;

  const width = canvasContainer.offsetWidth * 1.5;
  const height = canvasContainer.offsetHeight * 1.5;

  viewport.fit(width / 2, height / 2, width, height);

  redrawGrid();
  tick();
}

function isLocalFile(): boolean {
  return !!getUrlParams().file;
}

document
  .getElementById("operation-file-new")
  ?.addEventListener("click", function () {
    // When the user creates a new file, we save the current file in the browser
    // history. That way, we don't need a confirmation dialog that asks
    // "are you sure you want to abandon the current work?" as the current work
    // is not lost.
    window.history.pushState({}, "");

    newFile().then(() => {
      saveDataIsLoading.classList.add("hidden");
    });
  });

document
  .getElementById("operation-file-save-to-disk")
  ?.addEventListener("click", function () {
    const json = getJsonEditorValue();

    // Create a download link.
    const link = document.createElement("a");

    link.setAttribute("href", `data:application/json;base64,${btoa(json)}`);

    link.setAttribute(
      "download",
      `gg.${new Date().toJSON().replaceAll(":", ".")}.json`,
    );

    // Click on the download link.
    link.click();
  });

document
  .getElementById("operation-file-save-to-cloud")
  ?.addEventListener("click", function () {
    save(getJsonEditorValue())
      .then(() => setConnectivity(isLocalFile() ? "local-file" : "ok"))
      .catch(() => setConnectivity("save-failed"));
  });

const fileFromDisk = document.getElementById(
  "file-from-disk",
) as HTMLInputElement;

document
  .getElementById("operation-file-open-from-disk")
  ?.addEventListener("click", function () {
    fileFromDisk.click();
  });

fileFromDisk.addEventListener("change", async function () {
  if (fileFromDisk.files && fileFromDisk.files.length > 0) {
    const reader = new FileReader();

    reader.readAsText(fileFromDisk.files[0]);

    reader.addEventListener("load", function () {
      if (reader.result) {
        resetUrlParams();
        loadSaveData({ newUser: false, saveData: reader.result?.toString() });
      }
    });
  }
});

document
  .getElementById("operation-export-png")
  ?.addEventListener("click", function () {
    // Finish any ongoing operation.
    operation.onEnd(state);

    // Hide the grid.
    setGridVisible(false);

    // Set light theme.
    state.theme = "light";

    // Draw the simulation with the right theme.
    drawSimulation();

    // Extract the viewport on an HTML canvas.
    // @ts-ignore
    const viewportCanvas = app.renderer.extract.canvas(viewport);

    // Create a destination canvas that will be exported in PNG.
    const exportCanvas = document.createElement("canvas");

    const margin = 20;

    const backlinkWidth =
      state.profile.authenticated && !state.profile.readOnly ? 0 : 150;

    const backlinkHeight =
      state.profile.authenticated && !state.profile.readOnly ? 0 : 22;

    // Add margin around the chart.
    // Add some space at the bottom of the image for the backlink.
    exportCanvas.width =
      Math.max(backlinkWidth, viewportCanvas.width) + margin * 2;

    exportCanvas.height = viewportCanvas.height + margin * 2 + backlinkHeight;

    // Start drawing.
    const context = exportCanvas.getContext("2d")!;

    // Draw a white background.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Draw the viewport on the canvas.
    context.drawImage(viewportCanvas as HTMLCanvasElement, margin, margin);

    // Draw the backlink.
    context.fillStyle = "#000000";

    context.fillRect(
      0,
      exportCanvas.height - backlinkHeight,
      exportCanvas.width,
      backlinkHeight,
    );

    context.fillStyle = "#ffffff";
    context.font = "16px ibm";
    context.textAlign = "end";

    context.fillText(
      "made with gg-charts.com",
      exportCanvas.width - 6,
      exportCanvas.height - 6,
    );

    // Export the canvas to a data URL.
    const dataUri = exportCanvas.toDataURL();

    // Create a download link.
    const link = document.createElement("a");

    link.setAttribute("href", dataUri);

    link.setAttribute(
      "download",
      `gg.${new Date().toJSON().replaceAll(":", ".")}.png`,
    );

    // Click on the download link.
    link.click();

    // Show the grid.
    setGridVisible(true);

    // Set user theme.
    state.theme = getThemeOnLoad();

    // Draw the simulation with the right theme.
    drawSimulation();
  });

//
// View operations
//

document
  .getElementById("operation-goto-viewer")
  ?.addEventListener("click", function () {
    window.location.href = `/viewer.html${window.location.hash}`;
  });

const fileProperties = document.getElementById(
  "file-properties",
) as HTMLDialogElement;

const chartTitle = document.getElementById(
  "option-chart-title",
) as HTMLInputElement;

document
  .getElementById("operation-file-properties-open")
  ?.addEventListener("click", function () {
    const params = getUrlParams();

    if (params.id) {
      window.location.href = `/chart.html#id=${params.id}`;
      return;
    }

    chartTitle.value = JSON.parse(getJsonEditorValue()).title;

    fileProperties.inert = true;
    fileProperties.showModal();
    fileProperties.inert = false;
  });

chartTitle.addEventListener("change", function () {
  const currentSpecification = JSON.parse(getJsonEditorValue());

  const newTitle = chartTitle.value;

  if (newTitle === currentSpecification.title) {
    return;
  }

  currentSpecification.title = newTitle;

  const newSpecification = JSON.stringify(currentSpecification, null, 2);

  setJsonEditorValue(newSpecification);
  setDocumentTitle(newSpecification);

  pushChange(newSpecification);

  save(newSpecification)
    .then(() => setConnectivity(isLocalFile() ? "local-file" : "ok"))
    .catch(() => setConnectivity("save-failed"));
});

//
// Undo / Redo operations.
//

function undo(): void {
  if (state.changeIndex > 0) {
    state.changeIndex -= 1;

    // We skip the end/begin for that operation because it clears the color on
    // the icon (end) and opens a modal (begin).
    if (operation.id !== "operation-set-color") {
      operation.onEnd(state);
      operation.onBegin(state);
    }

    const json = state.changes[state.changeIndex];

    setJsonEditorValue(json);
    setDocumentTitle(json);

    loadSimulation(json)
      .then(() => {
        save(json)
          .then(() => setConnectivity(isLocalFile() ? "local-file" : "ok"))
          .catch(() => setConnectivity("save-failed"));
      })
      .catch(() => {
        /* NOOP */
      });
  }
}

function redo(): void {
  if (state.changeIndex < state.changes.length - 1) {
    state.changeIndex += 1;

    // We skip the end/begin for that operation because it clears the color on
    // the icon (end) and opens a modal (begin).
    if (operation.id !== "operation-set-color") {
      operation.onEnd(state);
      operation.onBegin(state);
    }

    const json = state.changes[state.changeIndex];

    setJsonEditorValue(json);
    setDocumentTitle(json);

    loadSimulation(json)
      .then(() => {
        save(json)
          .then(() => setConnectivity(isLocalFile() ? "local-file" : "ok"))
          .catch(() => setConnectivity("save-failed"));
      })
      .catch(() => {
        /* NOOP */
      });
  }
}

document.getElementById("operation-undo")?.addEventListener("click", undo);
document.getElementById("operation-redo")?.addEventListener("click", redo);

//
// Camera operations.
//

function cameraFit(): void {
  fitSimulation();
  redrawGrid();
  tick();
}

function cameraZoomIn(): void {
  viewport.zoomCenter(0.25);

  redrawGrid();
  tick();
}

function cameraZoomOut(): void {
  viewport.zoomCenter(-0.25);

  redrawGrid();
  tick();
}

document
  .getElementById("operation-camera-fit")
  ?.addEventListener("click", cameraFit);

document
  .getElementById("operation-camera-zoom-in")
  ?.addEventListener("click", cameraZoomIn);

document
  .getElementById("operation-camera-zoom-out")
  ?.addEventListener("click", cameraZoomOut);

//
// Profile operations
//

document
  .getElementById("operation-sign-out")
  ?.addEventListener("click", function () {
    fetch("/api/sign-out", {
      method: "POST",
    })
      .then(async response => {
        if (response.redirected) {
          window.location.replace(response.url);
        } else {
          // TODO: handle error.
        }
      })
      .catch(() => {
        /* TODO: handle error */
      });
  });

//
// Toolbox
//

// Initialize operations.
addBoxOperation.setup(state);
addListOperation.setup(state);
selectOperation.setup(state);
panOperation.setup(state);
linkOperation.setup(state);
eraseOperation.setup(state);
paintOperation.setup(state);
debugOperation.setup(state);

// Initialize buttons.
const singleChoiceButtons = document.querySelectorAll(
  "#toolbox button.single-choice",
);

for (const button of singleChoiceButtons) {
  button.addEventListener("click", function () {
    for (const other of singleChoiceButtons) {
      other.classList.remove("selected");
    }

    operation.onEnd(state);

    button.classList.add("selected");

    if (button.id === "operation-link") {
      operation = linkOperation;
    } else if (button.id === "operation-add-box") {
      operation = addBoxOperation;
    } else if (button.id === "operation-add-list") {
      operation = addListOperation;
    } else if (button.id === "operation-select") {
      operation = selectOperation;
    } else if (button.id === "operation-pan") {
      operation = panOperation;
    } else if (button.id === "operation-erase") {
      operation = eraseOperation;
    } else if (button.id === "operation-debug") {
      operation = debugOperation;
    } else if (button.id === "operation-set-color") {
      operation = paintOperation;
    } else {
      operation = selectOperation;
    }

    operation.onBegin(state);
    operation.onPointerLeave(state);

    tick();
  });
}

const toolboxButtons = document.querySelectorAll(
  "#toolbox button",
) as unknown as HTMLButtonElement[];

for (const button of toolboxButtons) {
  button.addEventListener("click", function () {
    // Remove focus once clicked.
    this.blur();
  });
}

function switchOperation(newOperation: Operation): void {
  operation.onEnd(state);
  operation = newOperation;
  operation.onBegin(state);

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

//
// Initial load.
//

const newUser = isNewUser();

if (newUser) {
  const params = getUrlParams();

  params.id = import.meta.env.VITE_WELCOME_CHART;

  setUrlParams(params);
}

loadSaveData({ newUser });

//
// Load profile.
//

fetch("/api/profile")
  .then(async response => {
    let toShow = "unauthenticated";
    let toHide = "authenticated";

    if (response.ok) {
      const profile = await response.json();

      if (profile.id) {
        toShow = "authenticated";
        toHide = "unauthenticated";

        state.profile.authenticated = true;
        state.profile.readOnly = profile.readOnly;

        setConnectivity(
          profile.readOnly ? "read-only" : isLocalFile() ? "local-file" : "ok",
        );
      }
    }

    for (const button of document.querySelectorAll(`#header .${toShow}`)) {
      button.classList.remove("hidden");
    }

    for (const button of document.querySelectorAll(`#header .${toHide}`)) {
      button.classList.add("hidden");
    }
  })
  .catch(() => {
    // TODO: handle error.
  });

//
// Utility functions
//

async function loadSaveData(options: {
  newUser: boolean;
  saveData?: string;
}): Promise<void> {
  saveDataIsLoading.classList.remove("hidden");

  let json: string;

  try {
    json = options.saveData ?? (await load());
  } catch {
    newFile().then(() => {
      saveDataIsLoading.classList.add("hidden");
    });

    if (!options.newUser) {
      loadFileFailed.showModal();
    }

    return;
  } finally {
    saveDataIsLoading.classList.add("hidden");
  }

  setJsonEditorValue(json);
  setDocumentTitle(json);

  try {
    await loadSimulation(json);

    pushChange(json);
    fitSimulation();
    redrawGrid();
    tick();

    save(json)
      .then(() => setConnectivity(isLocalFile() ? "local-file" : "ok"))
      .catch(() => setConnectivity("save-failed"));
  } catch {
    if (!options.newUser) {
      loadFileFailed.showModal();
    }
  } finally {
    saveDataIsLoading.classList.add("hidden");
  }
}

function isModalOpen(): boolean {
  return (
    isJsonEditorOpen() ||
    fileProperties.open ||
    theme.open ||
    guide.open ||
    privacy.open ||
    connectivityStatus.open
  );
}

function isInitialLoad(): boolean {
  return !state.simulatorInitialized;
}

/**
 * Update the state position from the screen position.
 *
 * The screen position is first transformed to the world position.
 * Then, this world position is transformed to the grid position.
 */
function updateStatePosition(x: number, y: number): void {
  const coordinates = viewport.screenToWorld(x, y);

  state.preciseX = coordinates.x / BlockSize;
  state.preciseY = coordinates.y / BlockSize;

  state.x =
    coordinates.x >= 0
      ? Math.floor(coordinates.x / BlockSize)
      : -Math.ceil(Math.abs(coordinates.x / BlockSize));

  state.y =
    coordinates.y >= 0
      ? Math.floor(coordinates.y / BlockSize)
      : -Math.ceil(Math.abs(coordinates.y / BlockSize));
}

function setDocumentTitle(specification: string): void {
  document.title = specification.match(/"title": "(.+?)"/i)?.at(1) ?? "Editor";
}
