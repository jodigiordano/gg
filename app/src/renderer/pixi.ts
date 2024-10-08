import {
  Application,
  BaseTexture,
  MIPMAP_MODES,
  SCALE_MODES,
  WRAP_MODES,
  settings,
} from "pixi.js";

BaseTexture.defaultOptions.mipmap = MIPMAP_MODES.ON;
BaseTexture.defaultOptions.scaleMode = SCALE_MODES.NEAREST;
BaseTexture.defaultOptions.wrapMode = WRAP_MODES.REPEAT;

settings.ROUND_PIXELS = true;

const canvasContainer = document.getElementById("canvas") as HTMLDivElement;

// Prevent opening right-click context menu.
canvasContainer.addEventListener("contextmenu", event => {
  event.preventDefault();
  event.stopPropagation();
});

export const app = new Application({
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

app.ticker.stop();

export function tick() {
  app.ticker.update();
}

// Add PixiJS to the DOM.
canvasContainer.replaceChildren(app.view as unknown as Node);
