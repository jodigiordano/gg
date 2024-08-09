import { Container } from "pixi.js";

export class Viewport extends Container {
  private screenWidth: number;
  private screenHeight: number;

  constructor(width: number, height: number) {
    super();

    this.screenWidth = width;
    this.screenHeight = height;
  }

  resize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
  }

  // Get the screen width, with the same scaling applied to the viewport.
  getWorldScreenWidth(): number {
    return this.screenWidth / this.scale.x;
  }

  // Get the screen height, with the same scaling applied to the viewport.
  getWorldScreenHeight(): number {
    return this.screenHeight / this.scale.y;
  }

  getLeft(): number {
    return -this.x / this.scale.x;
  }

  getTop(): number {
    return -this.y / this.scale.y;
  }
}
