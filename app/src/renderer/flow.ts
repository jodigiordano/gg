import { Container, Sprite, Spritesheet } from "pixi.js";
import { RuntimeFlow, SimulatorBoundaries } from "@gg/core";
import { BlockSize } from "./helpers.js";

export function createFlow(): Container {
  const container = new Container();

  container.zIndex = 0;

  return container;
}

export function drawFlow(
  container: Container,
  flow: RuntimeFlow | null,
  spritesheet: Spritesheet,
): void {
  container.removeChildren();

  if (!flow) {
    return;
  }

  for (let i = 0; i < flow.steps.length; i++) {
    const sprite = new Sprite(spritesheet.textures.data);

    sprite.width = BlockSize;
    sprite.height = BlockSize;
    sprite.visible = false;

    container.addChild(sprite);
  }
}

export function drawFlowTick(
  container: Container,
  dataPositions: number[][],
  boundaries: SimulatorBoundaries,
): void {
  const sprites = container.children;

  for (let i = 0; i < dataPositions.length; i++) {
    if (dataPositions[i].length) {
      sprites[i].x = (dataPositions[i][0] - boundaries.translateX) * BlockSize;
      sprites[i].y = (dataPositions[i][1] - boundaries.translateY) * BlockSize;
      sprites[i].visible = true;
    } else {
      sprites[i].visible = false;
    }
  }
}
