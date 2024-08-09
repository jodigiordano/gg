import { setViewport } from "./renderer/api.js";

const rendererContainer = document.getElementById(
  "renderer",
) as HTMLCanvasElement;

let moving = false;
let paused = false;
let startX = 0;
let startY = 0;
let viewportX = 0;
let viewportY = 0;
let scale = 1;

export function startMovingViewport(x: number, y: number): void {
  moving = true;

  startX = x;
  startY = y;
}

export function stopMovingViewport(): void {
  moving = false;
}

export function pauseViewport(pause: boolean): void {
  paused = pause;
}

export async function fitViewport(
  centerX: number,
  centerY: number,
  width: number,
  height: number,
): Promise<void> {
  moveCenter(centerX, centerY);

  const center = getWorldCenter();

  const scaleX = rendererContainer.clientWidth / width;
  const scaleY = rendererContainer.clientHeight / height;

  scale = scaleX < scaleY ? scaleX : scaleY;

  scale = clampScale(scale);

  moveCenter(center.x, center.y);

  return setViewport(viewportX, viewportY, scale);
}

export function moveViewport(x: number, y: number): void {
  if (!paused && moving) {
    const deltaX = x - startX;
    const deltaY = y - startY;

    viewportX += deltaX;
    viewportY += deltaY;

    startX = x;
    startY = y;

    setViewport(viewportX, viewportY, scale);
  }
}

export function zoomViewport(percent: number): void {
  const center = getWorldCenter();

  scale = clampScale(scale + percent);

  moveCenter(center.x, center.y);

  setViewport(viewportX, viewportY, scale);
}

export function screenToWorld(
  screenX: number,
  screenY: number,
): { x: number; y: number } {
  const rendererRect = rendererContainer.getBoundingClientRect();

  const rendererX = screenX - rendererRect.x;
  const rendererY = screenY - rendererRect.y;

  const x = (rendererX - viewportX) / scale;
  const y = (rendererY - viewportY) / scale;

  return { x, y };
}

// Get the screen width, with the same scaling applied to the viewport.
function getWorldScreenWidth(): number {
  return rendererContainer.clientWidth / scale;
}

// Get the screen height, with the same scaling applied to the viewport.
function getWorldScreenHeight(): number {
  return rendererContainer.clientHeight / scale;
}

// Get the center of the screen, with the same scaling applied to the viewport.
function getWorldCenter(): { x: number; y: number } {
  return {
    x: getWorldScreenWidth() / 2 - viewportX / scale,
    y: getWorldScreenHeight() / 2 - viewportY / scale,
  };
}

// Move the center of the viewport to x, y.
function moveCenter(worldX: number, worldY: number): void {
  viewportX = (getWorldScreenWidth() / 2 - worldX) * scale;
  viewportY = (getWorldScreenHeight() / 2 - worldY) * scale;
}

function clampScale(scale: number): number {
  return Math.max(0.25, Math.min(1.5, scale));
}
