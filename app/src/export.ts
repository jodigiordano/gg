import { app } from "./renderer/pixi.js";
import viewport from "./renderer/viewport.js";
import { drawSimulation } from "./simulator/api.js";
import { state } from "./state.js";
import { setGridVisible } from "./renderer/grid.js";
import { getUrlParams, load } from "./persistence.js";
import { loadSimulation } from "./simulator/api.js";

// Get URL params.
const params = getUrlParams();

// Load the save.
const json = await load();

// Start the simulation.
await loadSimulation(json);

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

// Add margin around the graph.
// Add some space at the bottom of the image for the backlink.
exportCanvas.width = viewportCanvas.width + margin * 2;

exportCanvas.height = viewportCanvas.height + margin * 2;

// Start drawing.
const context = exportCanvas.getContext("2d")!;

// Draw a white background.
context.fillStyle = "#ffffff";
context.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

// Draw the viewport on the canvas.
context.drawImage(viewportCanvas as HTMLCanvasElement, margin, margin);

// Export the canvas to a data URL.
const dataUri = exportCanvas.toDataURL();

// Create a download link.
const link = document.createElement("a");

link.setAttribute("href", dataUri);

link.setAttribute("download", `gg.${params.id}.png`);

// Click on the download link.
link.click();
