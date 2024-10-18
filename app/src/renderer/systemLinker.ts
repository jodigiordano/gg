import { Container, Graphics } from "pixi.js";
import { BlockSize } from "../helpers.js";

export default class SystemLinker extends Container {
  private line: Graphics;

  public length: number;

  constructor() {
    super();

    this.zIndex = 100000;
    this.visible = false;

    this.line = new Graphics();
    this.length = 0;

    // @ts-ignore
    this.addChild(this.line);
  }

  setPosition(x1: number, y1: number, x2: number, y2: number): void {
    this.line.clear();
    this.line.lineStyle(BlockSize / 4, 0xffffff);
    this.line.moveTo((x1 + 0.5) * BlockSize, (y1 + 0.5) * BlockSize);
    this.line.lineTo((x2 + 0.5) * BlockSize, (y2 + 0.5) * BlockSize);

    this.length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }
}
