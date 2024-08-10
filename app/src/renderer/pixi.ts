import { Application, AbstractRenderer } from "pixi.js";

AbstractRenderer.defaultOptions.roundPixels = true;
AbstractRenderer.defaultOptions.failIfMajorPerformanceCaveat = false;

const canvasContainer = document.getElementById("canvas") as HTMLDivElement;

// Prevent opening right-click context menu.
canvasContainer.addEventListener("contextmenu", event => {
  event.preventDefault();
  event.stopPropagation();
});

export const app = new Application();

await app.init({
  backgroundAlpha: 0,
  resolution: window.devicePixelRatio,
  width: canvasContainer.clientWidth,
  height: canvasContainer.clientHeight,
  autoDensity: true,
  antialias: false,
  autoStart: false,
  sharedTicker: false,
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

app.ticker.stop();

export function tick() {
  app.ticker.update();
}

// Add PixiJS to the DOM.
canvasContainer.replaceChildren(app.canvas as unknown as Node);
