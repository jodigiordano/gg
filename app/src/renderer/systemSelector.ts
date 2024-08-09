import { Container, Sprite, Spritesheet } from "pixi.js";
import { BlockSize } from "./helpers.js";

export default class SystemSelector extends Container {
  private topLeft: Sprite;
  private topRight: Sprite;
  private bottomLeft: Sprite;
  private bottomRight: Sprite;

  private x1: number;
  private y1: number;
  private x2: number;
  private y2: number;

  constructor(spritesheet: Spritesheet) {
    super();

    this.zIndex = 100;
    this.visible = false;

    this.x1 = 0;
    this.y1 = 0;
    this.x2 = 0;
    this.y2 = 0;

    this.topLeft = new Sprite(spritesheet.textures.systemSelectorTopLeft);

    this.topLeft.width = BlockSize;
    this.topLeft.height = BlockSize;

    this.addChild(this.topLeft);

    this.topRight = new Sprite(spritesheet.textures.systemSelectorTopRight);

    this.topRight.width = BlockSize;
    this.topRight.height = BlockSize;

    this.addChild(this.topRight);

    this.bottomLeft = new Sprite(spritesheet.textures.systemSelectorBottomLeft);

    this.bottomLeft.width = BlockSize;
    this.bottomLeft.height = BlockSize;

    this.addChild(this.bottomLeft);

    this.bottomRight = new Sprite(
      spritesheet.textures.systemSelectorBottomRight,
    );

    this.bottomRight.width = BlockSize;
    this.bottomRight.height = BlockSize;

    this.addChild(this.bottomRight);
  }

  setPosition(x1: number, y1: number, x2: number, y2: number): void {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;

    this.topLeft.x = x1 * BlockSize;
    this.topLeft.y = y1 * BlockSize;

    this.topRight.x = x2 * BlockSize;
    this.topRight.y = y1 * BlockSize;

    this.bottomLeft.x = x1 * BlockSize;
    this.bottomLeft.y = y2 * BlockSize;

    this.bottomRight.x = x2 * BlockSize;
    this.bottomRight.y = y2 * BlockSize;
  }

  same(x1: number, y1: number, x2: number, y2: number): boolean {
    return x1 === this.x1 && y1 === this.y1 && x2 === this.x2 && y2 === this.y2;
  }
}
