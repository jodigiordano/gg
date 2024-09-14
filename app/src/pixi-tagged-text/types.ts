import {
  Text,
  Texture,
  BaseTexture,
  BitmapText,
  Sprite,
  IBitmapTextStyle,
  ITextStyle,
  TextStyleFill,
  Rectangle as PixiRectangle,
} from "pixi.js";
import TaggedText from "./TaggedText.js";
import { complement, flatEvery } from "./functionalUtils.js";
import { logWarning } from "./errorMessaging.js";

///// GENERAL PURPOSE

export type Point = {
  x: number;
  y: number;
};
export type Rectangle = Point & {
  width: number;
  height: number;
};

export type Bounds = Rectangle;

export type Nested<T> = T | Array<Nested<T>>;

export type PixiTextTypes = Text | BitmapText;

///// OPTIONS

export type SpriteSource =
  | string
  | Texture
  | HTMLCanvasElement
  | HTMLVideoElement;

export type TextureSource =
  | string
  | HTMLImageElement
  | HTMLCanvasElement
  | HTMLVideoElement
  | BaseTexture;

export type FontProperty = string | number;
export type FontMap = Record<string, FontProperty>;

export type SplitStyle = "words" | "characters";

export type ErrorMessageType = "warning" | "error";
export interface ErrorMessage {
  type: ErrorMessageType;
  code: string;
  message: string;
  target?: TaggedText;
}
export type ErrorHandler = (e: ErrorMessage) => void;

export interface IFontMetrics {
  ascent: number;
  descent: number;
  fontSize: number;
}

export interface TaggedTextOptions {
  debug?: boolean;
  debugConsole?: boolean;
  splitStyle?: SplitStyle;
  adjustFontBaseline?: FontMap;
  imgMap?: Record<string, Sprite>;
  scaleIcons?: boolean;
  skipUpdates?: boolean;
  skipDraw?: boolean;
  drawWhitespace?: boolean;
  wrapEmoji?: boolean;
  errorHandler?: ErrorHandler;
  supressConsole?: boolean;
  overdrawDecorations?: number;
}

///// STYLE PROPERTIES

// PROPERTY NAMES
export const IMG_REFERENCE_PROPERTY = "imgSrc";
export const IMG_DISPLAY_PROPERTY = "imgDisplay";
export const DEFAULT_KEY = "default";

export enum MeasurementUnit {
  default = "px",
  // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
  px = "px",
  em = "em",
  rem = "rem",
  pt = "pt",
  pc = "pc",
  in = "in",
  cm = "cm",
  mm = "mm",
  percent = "%",
  unknown = "unknown",
}

export const DEFAULT_MEASUREMENT_UNIT: MeasurementUnit =
  MeasurementUnit.default;

export interface MeasurementComponents {
  value: number;
  unit: MeasurementUnit;
}

export type MeasurementValue = string | number;

export type Thickness = number;
export type Color = string | number;
export type FontSize = MeasurementValue;
export type Fill = Color | string[] | number[] | CanvasGradient | CanvasPattern;
export type VAlign = "top" | "middle" | "bottom" | "baseline" | number;
export type AlignClassic = "left" | "right" | "center" | "justify";
export type Align =
  | AlignClassic
  | "justify"
  | "justify-left"
  | "justify-right"
  | "justify-center"
  | "justify-all";
export type ImageDisplayMode = "icon" | "block" | "inline";
export type ImageReference = string;
export type ImageDimensionPercentage = string;
export type ImageDimension = number | string | ImageDimensionPercentage;
export type TextTransform = "normal" | "capitalize" | "uppercase" | "lowercase";
export type FontStyle = "normal" | "italic" | "oblique";
export type TextDecorationValue = "underline" | "overline" | "line-through";
export type TextDecoration =
  | "normal"
  | TextDecorationValue
  | `${TextDecorationValue} ${TextDecorationValue}`
  | `${TextDecorationValue} ${TextDecorationValue} ${TextDecorationValue}`;

export interface ImageStyles {
  [IMG_REFERENCE_PROPERTY]?: ImageReference;
  [IMG_DISPLAY_PROPERTY]?: ImageDisplayMode;
  imgScale?: ImageDimensionPercentage;
  imgScaleX?: ImageDimensionPercentage;
  imgScaleY?: ImageDimensionPercentage;
  imgWidth?: ImageDimension;
  imgHeight?: ImageDimension;
  iconScale?: number;
}

export interface UnderlineStyle {
  underlineColor?: Color;
  underlineThickness?: Thickness;
  underlineOffset?: number;
}
export interface OverlineStyle {
  overlineColor?: Color;
  overlineThickness?: Thickness;
  overlineOffset?: number;
}
export interface LineThroughStyle {
  lineThroughColor?: Color;
  lineThroughThickness?: Thickness;
  lineThroughOffset?: number;
}

export interface TextDecorationStyles
  extends UnderlineStyle,
    OverlineStyle,
    LineThroughStyle {
  textDecoration?: TextDecoration;
}

export interface VerticalAlignStyles {
  valign?: VAlign;
}

export interface VerticalSpacingStyles {
  lineSpacing?: number;
  paragraphSpacing?: number;
  adjustBaseline?: number;
}
export interface FontScaleStyles {
  fontScaleWidth?: number;
  fontScaleHeight?: number;
}
export interface TextTransformStyles {
  textTransform?: TextTransform;
}

export interface LineBreakStyles {
  breakLines?: boolean;
}

export interface TextStyleExtended
  extends Record<string, unknown>,
    Partial<Omit<Omit<IBitmapTextStyle, "align">, "fontSize">>,
    Partial<Omit<ITextStyle, "align">>,
    ImageStyles,
    TextDecorationStyles,
    VerticalAlignStyles,
    VerticalSpacingStyles,
    FontScaleStyles,
    TextTransformStyles,
    LineBreakStyles {
  // Overridden properties
  align?: Align;
  fontStyle?: FontStyle;
  fontSize?: FontSize;
  // alias for `fill`
  color?: TextStyleFill;
}

export interface TextDecorationMetrics {
  color: Color;
  bounds: Bounds;
}

export type TextStyleSet = Record<string, TextStyleExtended>;

///// TAG PARSING

type TagName = string;
type AttributeName = string;
type AttributeValue = string | number;
export type AttributesList = Record<AttributeName, AttributeValue>;
export interface TagWithAttributes {
  tagName: string;
  attributes: AttributesList;
}

export interface TagMatchData extends TagWithAttributes {
  tag: string;
  isOpening: boolean;
  index: number;
}
export type TagStack = TagMatchData[];

///// PARSED TOKENS

export type NewlineToken = "\n";
export type WhitespaceToken = " " | "\t" | NewlineToken;
export type TextToken = string;
export type SpriteToken = Sprite;

export interface CompositeToken<T extends Token = Token> {
  children: T[];
}

export type Token = TextToken | CompositeToken | SpriteToken;
export type Tokens = CompositeToken;

export interface TagToken extends CompositeToken<TagToken | TextToken> {
  tag?: TagName;
  attributes?: AttributesList;
}
export type TagTokens = TagToken;

export interface StyledToken
  extends CompositeToken<StyledToken | TextToken | SpriteToken> {
  style: TextStyleExtended;
  tags: string;
}

export type StyledTokens = StyledToken;

// About Tokens
// The contents of a block of text are composed of nested tokens in 4 layers.
// The types are:
// Paragraph - contains Lines
// Lines - contains words Words
// Word - contains Segments
// Segment - contains text or image content, styles, and other metadata.
//
// Notes:
// - The SegmentToken is the only one that contains text content and metadata;
//   the rest are all ordered containers used to organize the smaller pieces inside it.
//   In other words, the type of a ParagraphToken is equal to SegmentToken[][][]
// - The .tokens property of a TaggedText is a ParagraphToken.
// - ParagrahpTokens don't necessarily contain paragraphs in the grammatical sense.
//   It is simply a collection of lines of text and could contain one literal paragraph,
//   or more than one, or none at all. Same is true for Lines & Words
// - Segments are groups of 1 or more individual characters (or sometimes sprites).
//   Most WordTokens contain only one Segment, however, each time styles change
//   in the text, a new segment is crated, therefore, some words will have multiple
//   segments if they contain tags within like "Abso<i>lutely</i>".
// - When splitStyle is "characters", each character gets its own SegmentToken.

export type SegmentContent = TextToken | SpriteToken;
export interface SegmentToken {
  content: SegmentContent;
  bounds: Rectangle;
  fontProperties: IFontMetrics;
  style: TextStyleExtended;
  tags: string;
  textDecorations?: TextDecorationMetrics[];
}
export type WordToken = SegmentToken[];
export type LineToken = WordToken[];
export type ParagraphToken = LineToken[];

export const createEmptySegmentToken = (): SegmentToken => ({
  content: "",
  bounds: new PixiRectangle(),
  fontProperties: { ascent: 0, descent: 0, fontSize: 0 },
  style: {},
  tags: "",
  textDecorations: [],
});

export interface SpriteSegmentToken extends SegmentToken {
  content: SpriteToken;
}
export interface TextSegmentToken extends SegmentToken {
  content: TextToken;
}

export interface WhitespaceSegmentToken extends TextSegmentToken {
  content: WhitespaceToken;
}
export interface NewlineSegmentToken extends TextSegmentToken {
  content: NewlineToken;
}

export const isWhitespace = (s: string): s is WhitespaceToken =>
  s !== "" &&
  s.split("").every((char: string): boolean => char.search(/\s/) === 0);
export const isNewline = (s: string): s is NewlineToken =>
  isWhitespace(s) && s === "\n";

export const _isSpriteToken = (t: SegmentToken): t is SpriteSegmentToken =>
  t.content instanceof Sprite;
export const isSpriteToken = flatEvery(_isSpriteToken);

export const _isTextToken = (t: SegmentToken): t is TextSegmentToken =>
  typeof t.content === "string";
export const isTextToken = flatEvery(_isTextToken);

export const _isWhitespaceToken = (
  t: SegmentToken,
): t is WhitespaceSegmentToken =>
  t !== undefined && _isTextToken(t) && isWhitespace(t.content);
export const isWhitespaceToken = flatEvery(_isWhitespaceToken);

export const _isNewlineToken = (t: SegmentToken): t is NewlineSegmentToken =>
  t !== undefined && _isTextToken(t) && isNewline(t.content);
export const isNewlineToken = (t?: Nested<SegmentToken>): boolean =>
  t === undefined ? false : flatEvery(_isNewlineToken)(t);

export const isNotWhitespaceToken = complement(isWhitespaceToken);

export const isEmptyObject = <T>(a: T): boolean =>
  a instanceof Object && Object.keys(a).length === 0;

export const isPixel = (s: string): boolean => s.trim().endsWith("px");

export const isEm = (s: string): boolean => s.trim().endsWith("em");

export const isPercent = (s: string): boolean => s.trim().endsWith("%");

export const pixelToNumber = (s: string): number =>
  Number(s.trim().slice(0, -2));
export const emToNumber = pixelToNumber;

export const percentStringToNumber = (s: string): number =>
  isPercent(s) ? Number(s.trim().slice(0, -1)) / 100 : NaN;

export const measurementValueToComponents = (
  input: MeasurementValue,
): MeasurementComponents => {
  if (input === undefined) {
    throw new Error("value is undefined!");
  }

  if (typeof input === "number") {
    return { value: input, unit: DEFAULT_MEASUREMENT_UNIT };
  }
  input = input.trim();

  const pattern = new RegExp(Object.values(MeasurementUnit).join("|") + "$");
  const i = input.search(pattern);
  if (i !== -1) {
    return {
      value: parseFloat(input.slice(0, i)),
      unit: input.slice(i) as MeasurementUnit,
    };
  }

  const isAllDigits = input.search(/^[\d.]+$/) === 0;
  if (isAllDigits) {
    const forcedNumberConversion = parseFloat(input);
    if (isNaN(forcedNumberConversion) === false) {
      return { value: parseFloat(input), unit: DEFAULT_MEASUREMENT_UNIT };
    }
  }

  // TOOD: hook into errorHandler
  logWarning()(
    "invalid-units",
    `${input} is not a valid measurement value. Please use one of the following units: ${Object.keys(
      MeasurementUnit,
    ).join(", ")}`,
  );

  return { value: NaN, unit: MeasurementUnit.unknown };
};
