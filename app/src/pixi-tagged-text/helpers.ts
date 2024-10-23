import {
  TextStyleExtended,
  IMG_DISPLAY_PROPERTY,
  IFontMetrics,
} from "./types.js";
import { Sprite, TextMetrics, Text } from "pixi.js";

export const measureFont = (context: { font: string }): IFontMetrics =>
  TextMetrics.measureFont(context.font);

export const INITIAL_FONT_PROPS: IFontMetrics = {
  ascent: 10,
  descent: 3,
  fontSize: 13,
};

// TODO: Memoize
export const getFontPropertiesOfText = (
  textField: Text,
  forceUpdate = false,
): IFontMetrics => {
  if (forceUpdate) {
    textField.updateText(false);
    return measureFont(textField.context);
  } else {
    const props = measureFont(textField.context);
    const fs = Number(textField.style.fontSize) ?? NaN;
    if (
      props.ascent === INITIAL_FONT_PROPS.ascent &&
      props.descent === INITIAL_FONT_PROPS.descent &&
      (isNaN(fs) || fs > INITIAL_FONT_PROPS.fontSize)
    ) {
      throw new Error(
        "getFontPropertiesOfText() returned metrics associated with a Text field that has not been updated yet. Please try using the forceUpdate parameter when you call this function.",
      );
    }
    return measureFont(textField.context);
  }
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
