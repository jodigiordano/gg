import { Sprite, Text, Container, Spritesheet } from "pixi.js";
import {
  SimulatorObjectType,
  SimulatorSystemTitle,
  SimulatorSubsystem,
  SimulatorLinkDirectionType,
  SimulatorLink,
  SimulatorSystemDirectionType,
  SimulatorObject,
  SimulatorBoundaries,
} from "@gg/core";
import { BlockSize } from "./helpers.js";

export function createSimulation(): Container {
  const container = new Container();

  container.zIndex = 0;

  return container;
}

export function drawSimulation(
  container: Container,
  layout: SimulatorObject[][][],
  boundaries: SimulatorBoundaries,
  spritesheet: Spritesheet,
): void {
  container.removeChildren();

  for (let i = 0; i < boundaries.width; i++) {
    for (let j = 0; j < boundaries.height; j++) {
      for (const obj of layout[i]![j]!) {
        if (obj.type === SimulatorObjectType.System) {
          const sprite = new Sprite();

          sprite.x = (i - boundaries.translateX) * BlockSize;
          sprite.y = (j - boundaries.translateY) * BlockSize;
          sprite.width = BlockSize;
          sprite.height = BlockSize;

          const { system, blackbox, direction } = obj as SimulatorSubsystem;

          let systemTopLeft;
          let systemTopCenter;
          let systemTopRight;
          let systemCenterLeft;
          let systemCenterCenter;
          let systemCenterRight;
          let systemBottomLeft;
          let systemBottomCenter;
          let systemBottomRight;

          if (blackbox) {
            systemTopLeft = spritesheet.textures.systemATopLeft;
            systemTopCenter = spritesheet.textures.systemATopCenter;
            systemTopRight = spritesheet.textures.systemATopRight;
            systemCenterLeft = spritesheet.textures.systemACenterLeft;
            systemCenterCenter = spritesheet.textures.systemACenterCenter;
            systemCenterRight = spritesheet.textures.systemACenterRight;
            systemBottomLeft = spritesheet.textures.systemABottomLeft;
            systemBottomCenter = spritesheet.textures.systemABottomCenter;
            systemBottomRight = spritesheet.textures.systemABottomRight;
          } else if (system.depth % 2 === 0) {
            systemTopLeft = spritesheet.textures.systemBTopLeft;
            systemTopCenter = spritesheet.textures.systemBTopCenter;
            systemTopRight = spritesheet.textures.systemBTopRight;
            systemCenterLeft = spritesheet.textures.systemBCenterLeft;
            systemCenterCenter = spritesheet.textures.systemBCenterCenter;
            systemCenterRight = spritesheet.textures.systemBCenterRight;
            systemBottomLeft = spritesheet.textures.systemBBottomLeft;
            systemBottomCenter = spritesheet.textures.systemBBottomCenter;
            systemBottomRight = spritesheet.textures.systemBBottomRight;
          } else if (system.depth % 3 === 0) {
            systemTopLeft = spritesheet.textures.systemCTopLeft;
            systemTopCenter = spritesheet.textures.systemCTopCenter;
            systemTopRight = spritesheet.textures.systemCTopRight;
            systemCenterLeft = spritesheet.textures.systemCCenterLeft;
            systemCenterCenter = spritesheet.textures.systemCCenterCenter;
            systemCenterRight = spritesheet.textures.systemCCenterRight;
            systemBottomLeft = spritesheet.textures.systemCBottomLeft;
            systemBottomCenter = spritesheet.textures.systemCBottomCenter;
            systemBottomRight = spritesheet.textures.systemCBottomRight;
          } else {
            systemTopLeft = spritesheet.textures.systemDTopLeft;
            systemTopCenter = spritesheet.textures.systemDTopCenter;
            systemTopRight = spritesheet.textures.systemDTopRight;
            systemCenterLeft = spritesheet.textures.systemDCenterLeft;
            systemCenterCenter = spritesheet.textures.systemDCenterCenter;
            systemCenterRight = spritesheet.textures.systemDCenterRight;
            systemBottomLeft = spritesheet.textures.systemDBottomLeft;
            systemBottomCenter = spritesheet.textures.systemDBottomCenter;
            systemBottomRight = spritesheet.textures.systemDBottomRight;
          }

          if (direction === SimulatorSystemDirectionType.TopLeft) {
            sprite.texture = systemTopLeft;
          } else if (direction === SimulatorSystemDirectionType.TopCenter) {
            sprite.texture = systemTopCenter;
          } else if (direction === SimulatorSystemDirectionType.TopRight) {
            sprite.texture = systemTopRight;
          } else if (direction === SimulatorSystemDirectionType.CenterLeft) {
            sprite.texture = systemCenterLeft;
          } else if (direction === SimulatorSystemDirectionType.CenterRight) {
            sprite.texture = systemCenterRight;
          } else if (direction === SimulatorSystemDirectionType.BottomLeft) {
            sprite.texture = systemBottomLeft;
          } else if (direction === SimulatorSystemDirectionType.BottomCenter) {
            sprite.texture = systemBottomCenter;
          } else if (direction === SimulatorSystemDirectionType.BottomRight) {
            sprite.texture = systemBottomRight;
          } else {
            // CenterCenter
            sprite.texture = systemCenterCenter;
          }

          container.addChild(sprite);
        } else if (obj.type === SimulatorObjectType.Link) {
          const sprite = new Sprite();

          sprite.x = (i - boundaries.translateX) * BlockSize + BlockSize / 2;
          sprite.y = (j - boundaries.translateY) * BlockSize + BlockSize / 2;
          sprite.width = BlockSize;
          sprite.height = BlockSize;
          sprite.anchor.x = 0.5;
          sprite.anchor.y = 0.5;

          const { direction } = obj as SimulatorLink;

          if (direction === SimulatorLinkDirectionType.Horizontal) {
            sprite.texture = spritesheet.textures.link;
            sprite.rotation = -Math.PI / 2;
          } else if (direction === SimulatorLinkDirectionType.TopToLeft) {
            sprite.texture = spritesheet.textures.linkCorner;
            sprite.rotation = -Math.PI / 2;
          } else if (direction === SimulatorLinkDirectionType.TopToRight) {
            sprite.texture = spritesheet.textures.linkCorner;
          } else if (direction === SimulatorLinkDirectionType.BottomToLeft) {
            sprite.texture = spritesheet.textures.linkCorner;
            sprite.rotation = Math.PI;
          } else if (direction === SimulatorLinkDirectionType.BottomToRight) {
            sprite.texture = spritesheet.textures.linkCorner;
            sprite.rotation = Math.PI / 2;
          } else {
            // Vertical.
            sprite.texture = spritesheet.textures.link;
          }

          container.addChild(sprite);
        } else if (obj.type === SimulatorObjectType.SystemTitle) {
          const { blackbox } = obj as SimulatorSubsystem;

          const title = new Text({
            text: (obj as SimulatorSystemTitle).chars,
            style: {
              fontFamily: "ibm",
              fontSize: BlockSize,
            },
          });

          title.x = (i - boundaries.translateX) * BlockSize;
          title.y = (j - boundaries.translateY) * BlockSize;

          title.style.fill = blackbox ? "ffffff" : "000000";
          title.resolution = 2;

          container.addChild(title);
        }
      }
    }
  }
}
