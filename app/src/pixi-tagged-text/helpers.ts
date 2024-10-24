import {
  TextStyleExtended,
  IMG_DISPLAY_PROPERTY,
  IFontMetrics,
} from "./types.js";
import { Sprite, TextMetrics, Text } from "pixi.js";

const metrics: Record<string, IFontMetrics> = {};

export const getFontPropertiesOfText = (textField: Text): IFontMetrics => {
  if (!metrics[textField.context.font]) {
    metrics[textField.context.font] = TextMetrics.measureFont(
      textField.context.font,
    );
  }

  return metrics[textField.context.font];
};

export const cloneSprite = (sprite: Sprite): Sprite => {
  const clone = new Sprite(sprite.texture);

  clone.width = sprite.width;
  clone.height = sprite.height;

  return clone;
};

export const DEFAULT_STYLE: TextStyleExtended = Object.freeze({
  valign: "baseline",
  dropShadowColor: 0x000000,
  fill: 0x000000,
  fontSize: 26,
  stroke: 0x000000,
  [IMG_DISPLAY_PROPERTY]: "inline",
  wordWrap: true,
  wordWrapWidth: 500,
  iconScale: 1.0,
  breakLines: true,
});
