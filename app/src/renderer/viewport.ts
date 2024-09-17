import { Container } from "pixi.js";
import { app } from "./pixi.js";

interface Pointer {
  id: number;
  currentX: number;
  currentY: number;
  previousX: number;
  previousY: number;
}

class Viewport extends Container {
  private screenWidth: number;
  private screenHeight: number;

  private paused: boolean;

  private pointers: Pointer[];
  private multiPointersPreviousDistance: number;

  constructor(width: number, height: number) {
    super();

    this.screenWidth = width;
    this.screenHeight = height;

    this.paused = false;

    this.pointers = [];
    this.multiPointersPreviousDistance = 0;

    this.x = 0;
    this.y = 0;

    this.scale.set(1, 1);
  }

  resize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
  }

  // Get the screen width, with the same scaling applied to the viewport.
  get worldScreenWidth(): number {
    return this.screenWidth / this.scale.x;
  }

  // Get the screen height, with the same scaling applied to the viewport.
  get worldScreenHeight(): number {
    return this.screenHeight / this.scale.y;
  }

  set pause(value: boolean) {
    this.paused = value;
  }

  get pause(): boolean {
    return this.paused;
  }

  get left(): number {
    return -this.x / this.scale.x;
  }

  get top(): number {
    return -this.y / this.scale.y;
  }

  get moving(): boolean {
    return !this.paused && this.pointers.length > 0;
  }

  startMoving(id: number, screenX: number, screenY: number): void {
    const index = this.pointers.findIndex(p => p.id === id);

    if (index === -1) {
      this.pointers.push({
        id,
        currentX: screenX,
        currentY: screenY,
        previousX: screenX,
        previousY: screenY,
      });
    } else {
      const pointer = this.pointers[index];

      pointer.previousX = pointer.currentX;
      pointer.previousY = pointer.currentY;
      pointer.currentX = screenX;
      pointer.currentY = screenY;
    }
  }

  stopMoving(id: number): void {
    const index = this.pointers.findIndex(p => p.id === id);

    if (index >= 0) {
      this.pointers.splice(index, 1);
    }
  }

  fit(centerX: number, centerY: number, width: number, height: number): void {
    this.moveCenter(centerX, centerY);

    const center = this.getWorldCenter();

    // Do not zoom in more than 1.0.
    const scaleX = Math.min(1, this.screenWidth / width);
    const scaleY = Math.min(1, this.screenHeight / height);

    const scale = this.clampScale(scaleX < scaleY ? scaleX : scaleY);

    this.scale.set(scale, scale);

    this.moveCenter(center.x, center.y);
  }

  move(id: number, screenX: number, screenY: number): void {
    if (!this.moving) {
      return;
    }

    const index = this.pointers.findIndex(p => p.id === id);

    if (index === -1) {
      return;
    }

    const pointer = this.pointers[index];

    pointer.previousX = pointer.currentX;
    pointer.previousY = pointer.currentY;
    pointer.currentX = screenX;
    pointer.currentY = screenY;

    // When 2 pointers are down, the user may be dragging or zooming (pinch).
    if (this.pointers.length === 2) {
      const pointerB =
        index === 0 ? this.pointers[index + 1] : this.pointers[index - 1];

      const distance = Math.sqrt(
        Math.pow(pointerB.currentX - pointer.currentX, 2) +
          Math.pow(pointerB.currentY - pointer.currentY, 2),
      );

      const deltaDistance = Math.abs(
        distance - this.multiPointersPreviousDistance,
      );

      // Every tick that 2 pointers are moved, this "move" function is called
      // twice, one time for pointerA and one time for pointerB.
      //
      // This delta distance check is done to remove some "zoom flickering".
      if (this.multiPointersPreviousDistance > 0 && deltaDistance > 0.1) {
        if (distance > this.multiPointersPreviousDistance) {
          this.zoomCenter(0.01);
        } else if (distance < this.multiPointersPreviousDistance) {
          this.zoomCenter(-0.015);
        }
      }

      // When the 2 pointers are moving in the same direction,
      // we assume the user is dragging them.
      if (pointer.id === this.pointers[0].id && deltaDistance < 1) {
        const deltaX = pointer.currentX - pointer.previousX;
        const deltaY = pointer.currentY - pointer.previousY;

        this.position.set(this.position.x + deltaX, this.position.y + deltaY);
      }

      this.multiPointersPreviousDistance = distance;
    } else {
      const deltaX = pointer.currentX - pointer.previousX;
      const deltaY = pointer.currentY - pointer.previousY;

      this.position.set(this.position.x + deltaX, this.position.y + deltaY);
    }

    this.startMoving(id, screenX, screenY);
  }

  zoomCenter(percent: number): void {
    const center = this.getWorldCenter();

    const scale = this.clampScale(this.scale.x + percent);

    this.scale.set(scale, scale);

    this.moveCenter(center.x, center.y);
  }

  zoomAt(percent: number, screenX: number, screenY: number): void {
    const point = this.screenToWorld(screenX, screenY);

    const scale = this.clampScale(this.scale.x + percent);

    this.scale.set(scale, scale);

    const newPoint = this.screenToWorld(screenX, screenY);

    const deltaX = newPoint.x - point.x;
    const deltaY = newPoint.y - point.y;

    this.position.x += deltaX * this.scale.x;
    this.position.y += deltaY * this.scale.y;
  }

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const canvasRect = canvasContainer.getBoundingClientRect();

    const canvasX = screenX - canvasRect.x;
    const canvasY = screenY - canvasRect.y;

    const x = (canvasX - this.position.x) / this.scale.x;
    const y = (canvasY - this.position.y) / this.scale.y;

    return { x, y };
  }

  // Get the center of the screen, with the same scaling applied to the viewport.
  private getWorldCenter(): { x: number; y: number } {
    return {
      x: this.worldScreenWidth / 2 - this.position.x / this.scale.x,
      y: this.worldScreenHeight / 2 - this.position.y / this.scale.y,
    };
  }

  // Move the center of the viewport to x, y.
  private moveCenter(worldX: number, worldY: number): void {
    this.position.set(
      (this.worldScreenWidth / 2 - worldX) * this.scale.x,
      (this.worldScreenHeight / 2 - worldY) * this.scale.y,
    );
  }

  private clampScale(scale: number): number {
    return Math.max(0.15, Math.min(1.5, scale));
  }
}

const canvasContainer = document.getElementById("canvas") as HTMLDivElement;

const viewport = new Viewport(
  canvasContainer.clientWidth,
  canvasContainer.clientHeight,
);

viewport.sortableChildren = true;

// @ts-ignore
app.stage.addChild(viewport);

export default viewport;
