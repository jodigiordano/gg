import { Container, Graphics } from "pixi.js";
import { BlockSize } from "../helpers.js";

export default class SystemLinker extends Container {
  private line: Graphics;

  constructor() {
    super();

    this.zIndex = 100;
    this.visible = false;

    this.line = new Graphics();

    // @ts-ignore
    this.addChild(this.line);
  }

  setPosition(x1: number, y1: number, x2: number, y2: number): void {
    this.line.clear();
    this.line.lineStyle(BlockSize / 4, 0xffffff);
    this.line.moveTo(x1 * BlockSize, y1 * BlockSize);
    this.line.lineTo(x2 * BlockSize, y2 * BlockSize);
  }
}
