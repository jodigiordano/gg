import { Ticker } from "pixi.js";
import {
  SimulatorObject,
  SimulatorBoundaries,
  RuntimeFlow,
  RuntimeSubsystem,
  RuntimePosition,
} from "@gg/core";
import { state } from "../state.js";
import WebWorker from "../worker.js";

//
// Initialize.
//

const rendererContainer = document.getElementById(
  "renderer",
) as HTMLCanvasElement;

const canvasContainer = document.getElementById("canvas") as HTMLCanvasElement;

// Set CSS style on the canvas so the device pixel ratio is properly applied.
// (autoDensity in PixiJS)
canvasContainer.style.width = `${rendererContainer.clientWidth}px`;
canvasContainer.style.height = `${rendererContainer.clientHeight}px`;

// Prevent opening right-click context menu.
rendererContainer.addEventListener("contextmenu", event => {
  event.preventDefault();
  event.stopPropagation();
});

const worker = new WebWorker("renderer/worker.ts");

export async function initializeRenderer(options: {
  withGrid: boolean;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    worker.onCodeLoaded(() => {
      const view = canvasContainer.transferControlToOffscreen();

      worker
        .sendOperation(
          {
            operation: "initialize",
            width: rendererContainer.clientWidth,
            height: rendererContainer.clientHeight,
            resolution: window.devicePixelRatio,
            view,
            grid: options.withGrid,
          },
          { transfer: [view], force: true },
        )
        .then(({ success }) => {
          if (success) {
            worker.setReady();
            worker.sendDelayedOperations();
            state.rendererInitialized = true;
            resolve();
          } else {
            reject();
          }
        });
    });
  });
}

//
// Canvas operations
//

export async function resizeCanvas(): Promise<void> {
  // Set CSS style on the canvas so the device pixel ratio is properly applied.
  // (autoDensity in PixiJS)
  canvasContainer.style.width = `${rendererContainer.clientWidth}px`;
  canvasContainer.style.height = `${rendererContainer.clientHeight}px`;

  return new Promise(resolve => {
    worker
      .sendOperation({
        operation: "resizeCanvas",
        width: rendererContainer.clientWidth,
        height: rendererContainer.clientHeight,
      })
      .then(() => resolve());
  });
}

export async function screenshotCanvas(): Promise<Blob> {
  return new Promise(resolve => {
    worker
      .sendOperation({
        operation: "screenshotCanvas",
      })
      .then(data => {
        resolve(data.imageData as Blob);
      });
  });
}

//
// Viewport operations
//

export async function setViewport(
  x: number,
  y: number,
  scale: number,
): Promise<void> {
  return new Promise(resolve => {
    worker.sendOperation({ operation: "setViewport", x, y, scale }).then(() => {
      resolve();
    });
  });
}

//
// Ticker operations
//

const ticker = new Ticker();

ticker.stop();

export function startTicker() {
  ticker.start();
  worker.sendOperation({ operation: "startTicker" });
}

export function stopTicker() {
  ticker.stop();
  worker.sendOperation({ operation: "stopTicker" });
}

export function onTick(callback: (t: Ticker) => void): void {
  ticker.add(callback);
}

//
// Grid operations
//

export function setGridVisible(visible: boolean): void {
  worker.sendOperation({ operation: "setGridVisible", visible });
}

//
// Simulation operations
//

export async function drawSimulation(
  layout: SimulatorObject[][][],
  boundaries: SimulatorBoundaries,
  flow: RuntimeFlow,
): Promise<void> {
  return new Promise(resolve => {
    worker
      .sendOperation({
        operation: "drawSimulation",
        layout,
        boundaries,
        flow,
      })
      .then(() => {
        resolve();
      });
  });
}

//
// Flow operations
//

export function drawFlowTick(
  dataPositions: number[][],
  boundaries: SimulatorBoundaries,
): void {
  worker.sendOperation({
    operation: "drawFlowTick",
    dataPositions,
    boundaries,
  });
}

export function setFlowVisible(visible: boolean): void {
  worker.sendOperation({ operation: "setFlowVisible", visible });
}

//
// System linker operations
//

export function createSystemLinker(): string {
  const id = crypto.randomUUID();

  worker.sendOperation({ operation: "createSystemLinker", id });

  return id;
}

export function setSystemLinkerVisible(id: string, visible: boolean): void {
  worker.sendOperation({ operation: "setSystemLinkerVisible", id, visible });
}

export function setSystemLinkerPosition(
  id: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  worker.sendOperation({
    operation: "setSystemLinkerPosition",
    id,
    x1,
    y1,
    x2,
    y2,
  });
}

//
// System selector operations
//

export function createSystemSelector(): string {
  const id = crypto.randomUUID();

  worker.sendOperation({ operation: "createSystemSelector", id });

  return id;
}

export function setSystemSelectorVisible(id: string, visible: boolean): void {
  worker.sendOperation({ operation: "setSystemSelectorVisible", id, visible });
}

export function setSystemSelectorPosition(
  id: string,
  subsystem: RuntimeSubsystem,
  delta: RuntimePosition,
): void {
  const x1 = subsystem.position.x + delta.x;
  const y1 = subsystem.position.y + delta.y;
  const x2 = subsystem.position.x + delta.x + subsystem.size.width - 1;
  const y2 = subsystem.position.y + delta.y + subsystem.size.height - 1;

  setSystemSelectorPositionRect(id, x1, y1, x2, y2);
}

export function setSystemSelectorPositionRect(
  id: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  worker.sendOperation({
    operation: "setSystemSelectorPosition",
    id,
    x1,
    y1,
    x2,
    y2,
  });
}
