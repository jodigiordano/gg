import { Container, Graphics } from "pixi.js";
import { BlockSize } from "./helpers.js";

export default class SystemLinker extends Container {
  private line: Graphics;
  private x1: number;
  private y1: number;
  private x2: number;
  private y2: number;

  constructor() {
    super();

    this.line = new Graphics();

    this.zIndex = 100;
    this.visible = false;

    this.x1 = 0;
    this.y1 = 0;
    this.x2 = 0;
    this.y2 = 0;

    this.addChild(this.line);
  }

  setPosition(x1: number, y1: number, x2: number, y2: number): void {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;

    this.line.clear();

    this.line.moveTo(x1 * BlockSize, y1 * BlockSize);
    this.line.lineTo(x2 * BlockSize, y2 * BlockSize);

    this.line.stroke({ width: BlockSize / 4, color: "0xffffff" });
  }

  same(x1: number, y1: number, x2: number, y2: number): boolean {
    return x1 === this.x1 && y1 === this.y1 && x2 === this.x2 && y2 === this.y2;
  }
}
