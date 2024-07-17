// @ts-ignore
import { Viewport } from "pixi-viewport";
import { app } from "./pixi.js";

const canvasContainer = document.getElementById("canvas") as HTMLDivElement;

export const viewport = new Viewport({
  screenWidth: canvasContainer.offsetWidth,
  screenHeight: canvasContainer.offsetHeight,
  worldWidth: canvasContainer.offsetWidth,
  worldHeight: canvasContainer.offsetHeight,
  events: app.renderer.events,
  eventMode: "static",
  interactiveChildren: false,
  disableOnContextMenu: true,
});

viewport.drag().pinch().wheel({ smooth: 5 }).clampZoom({
  minScale: 0.2,
  maxScale: 2.0,
});

viewport.sortableChildren = true;

app.stage.addChild(viewport);
