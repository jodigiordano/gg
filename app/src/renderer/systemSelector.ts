import { Container, Sprite } from "pixi.js";
import { spritesheet } from "./assets.js";
import { BlockSize } from "../helpers.js";
import { RuntimePosition, RuntimeSubsystem } from "@gg/core";

export default class SystemSelector extends Container {
  private topLeft: Sprite;
  private topRight: Sprite;
  private bottomLeft: Sprite;
  private bottomRight: Sprite;

  constructor() {
    super();

    this.zIndex = 100000;
    this.visible = false;

    this.topLeft = new Sprite(spritesheet.textures.systemSelectorTopLeft);

    this.topLeft.width = BlockSize;
    this.topLeft.height = BlockSize;

    // @ts-ignore
    this.addChild(this.topLeft);

    this.topRight = new Sprite(spritesheet.textures.systemSelectorTopRight);

    this.topRight.width = BlockSize;
    this.topRight.height = BlockSize;

    // @ts-ignore
    this.addChild(this.topRight);

    this.bottomLeft = new Sprite(spritesheet.textures.systemSelectorBottomLeft);

    this.bottomLeft.width = BlockSize;
    this.bottomLeft.height = BlockSize;

    // @ts-ignore
    this.addChild(this.bottomLeft);

    this.bottomRight = new Sprite(
      spritesheet.textures.systemSelectorBottomRight,
    );

    this.bottomRight.width = BlockSize;
    this.bottomRight.height = BlockSize;

    // @ts-ignore
    this.addChild(this.bottomRight);
  }

  setPosition(subsystem: RuntimeSubsystem, delta: RuntimePosition): void {
    this.topLeft.x = (subsystem.position.x + delta.x) * BlockSize;
    this.topLeft.y = (subsystem.position.y + delta.y) * BlockSize;

    this.topRight.x =
      (subsystem.position.x + delta.x + subsystem.size.width - 1) * BlockSize;
    this.topRight.y = (subsystem.position.y + delta.y) * BlockSize;

    this.bottomLeft.x = (subsystem.position.x + delta.x) * BlockSize;
    this.bottomLeft.y =
      (subsystem.position.y + delta.y + subsystem.size.height - 1) * BlockSize;

    this.bottomRight.x =
      (subsystem.position.x + delta.x + subsystem.size.width - 1) * BlockSize;
    this.bottomRight.y =
      (subsystem.position.y + delta.y + subsystem.size.height - 1) * BlockSize;
  }

  setPositionRect(x1: number, y1: number, x2: number, y2: number): void {
    this.topLeft.x = x1 * BlockSize;
    this.topLeft.y = y1 * BlockSize;

    this.topRight.x = x2 * BlockSize;
    this.topRight.y = y1 * BlockSize;

    this.bottomLeft.x = x1 * BlockSize;
    this.bottomLeft.y = y2 * BlockSize;

    this.bottomRight.x = x2 * BlockSize;
    this.bottomRight.y = y2 * BlockSize;
  }
}
