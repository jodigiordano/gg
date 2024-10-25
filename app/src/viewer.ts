import { app, tick } from "./renderer/pixi.js";
import { state } from "./state.js";
import viewport from "./renderer/viewport.js";
import { fitSimulation, loadSimulation } from "./simulator/api.js";
import { load } from "./persistence.js";
import { debounce } from "./helpers.js";

const canvasContainer = document.getElementById("canvas") as HTMLDivElement;

//
// Events
//

// The user moves the cursor in the window.
window.addEventListener("pointermove", event => {
  if (viewport.moving) {
    viewport.move(event.pointerId, event.x, event.y);
    tick();
  }
});

// The user press the pointer in the canvas.
canvasContainer.addEventListener("pointerdown", event => {
  viewport.startMoving(event.pointerId, event.x, event.y);
});

// The user releases the pointer in the window.
window.addEventListener("pointerup", event => {
  viewport.stopMoving(event.pointerId);
});

// The user spin the mouse wheel.
canvasContainer.addEventListener("wheel", event => {
  if (event.deltaY > 0) {
    viewport.zoomAt(-0.1, event.x, event.y);
    tick();
  } else if (event.deltaY < 0) {
    viewport.zoomAt(0.1, event.x, event.y);
    tick();
  }
});

// Resize the container when the window is resized.
window.addEventListener("resize", debounce(resizeCanvas, 30));

window.addEventListener("keydown", event => {
  if (event.key === "=") {
    cameraFit();
  } else if (event.key === "+") {
    cameraZoomIn();
  } else if (event.key === "-") {
    cameraZoomOut();
  }
});

//
// Camera operations.
//

function cameraFit(): void {
  fitSimulation();
  tick();
}

function cameraZoomIn(): void {
  viewport.zoomCenter(0.25);

  tick();
}

function cameraZoomOut(): void {
  viewport.zoomCenter(-0.25);

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
// Other operations.
//

document
  .getElementById("operation-goto-editor")
  ?.addEventListener("click", function () {
    window.location.href = `/editor.html${window.location.hash}`;
  });

//
// Canvas
//

function resizeCanvas(): void {
  app.renderer.resize(
    canvasContainer.clientWidth,
    canvasContainer.clientHeight,
  );

  viewport.resize(canvasContainer.clientWidth, canvasContainer.clientHeight);

  fitSimulation();

  tick();
}

//
// Toolbox
//
const toolbox = document.getElementById("toolbox") as HTMLDivElement;

const editorButton = document.getElementById("editor-button") as HTMLDivElement;
const zoomControls = document.getElementById("zoom-controls") as HTMLDivElement;

if (state.editorButton || state.zoomControls) {
  toolbox.style.visibility = "visible";

  if (!state.editorButton) {
    editorButton.classList.add("hidden");
  }

  if (!state.zoomControls) {
    zoomControls.classList.add("hidden");
  }
} else {
  toolbox.classList.add("hidden");
}

const toolboxButtons = toolbox.querySelectorAll(
  "button",
) as unknown as HTMLButtonElement[];

for (const button of toolboxButtons) {
  button.addEventListener("click", function () {
    // Remove focus once clicked.
    this.blur();
  });
}

//
// Initialization.
//

const saveDataIsLoading = document.getElementById(
  "save-data-is-loading",
) as HTMLElement;

try {
  // Load the save.
  const json = await load();

  // Start the simulation.
  await loadSimulation(json);

  // Set the document title.
  document.title = json.match(/"title": "(.+?)"/i)?.at(1) ?? "Presentation";

  // Resize the canvas.
  resizeCanvas();

  // Remove the loading banner.
  saveDataIsLoading.classList.add("hidden");
} catch {
  saveDataIsLoading.innerHTML = "Loading the chart failed.";
}
