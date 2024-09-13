import { TextStyleExtended, IMG_DISPLAY_PROPERTY } from "./types.js";
export const DEFAULT_STYLE: TextStyleExtended = {
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
};
Object.freeze(DEFAULT_STYLE);

export default DEFAULT_STYLE;
