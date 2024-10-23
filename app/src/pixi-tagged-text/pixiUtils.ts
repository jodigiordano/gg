import { Sprite, TextMetrics, Text } from "pixi.js";
import { IFontMetrics } from "./types.js";

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
