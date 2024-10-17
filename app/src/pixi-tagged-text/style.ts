import { stringIsNumber } from "./stringUtil.js";
import { pluck } from "./functionalUtils.js";
import {
  AttributesList,
  TagWithAttributes,
  TextStyleExtended,
  TextStyleSet,
  IFontMetrics,
  IMG_REFERENCE_PROPERTY,
  TextToken,
  TagToken,
  TagTokens,
  StyledTokens,
  StyledToken,
  SpriteToken,
  isEmptyObject,
  TextDecorationValue,
  Bounds,
  TextDecorationMetrics,
  Thickness,
  Color,
  FontSize,
  measurementValueToComponents,
  MeasurementUnit,
  Align,
  AlignClassic,
} from "./types.js";
import { cloneSprite } from "./pixiUtils.js";
import { Sprite } from "pixi.js";
import DEFAULT_STYLE from "./defaultStyle.js";

/**
 * Combine 2 styles into one.
 */
const combineStyles = (a: TextStyleExtended, b: TextStyleExtended) => ({
  ...a,
  ...b,
});

/**
 * Combines multiple styles into one.
 * @param styles List of styles to combine.
 */
export const combineAllStyles = (
  styles: (TextStyleExtended | undefined)[],
): TextStyleExtended =>
  (styles.filter(style => style !== undefined) as TextStyleExtended[]).reduce(
    combineStyles,
    {},
  );

export const convertAttributeValues = (
  attributes: AttributesList,
): AttributesList => {
  const convertedAttributes: AttributesList = {};
  for (const key in attributes) {
    const value = attributes[key];
    const isValueString = typeof value === "string";
    const isStringNumber = isValueString && stringIsNumber(value);

    if (isStringNumber) {
      convertedAttributes[key] = parseFloat(value);
    } else {
      convertedAttributes[key] = value;
    }
  }
  return convertedAttributes;
};

/**
 * Replaces properties of a TextStyle object with new values.
 * (Since AttributeLists are basically partially defined styles, this is the same as combineStyles)
 * @param attributes List of attributes to overwrite in the target style.
 * @param style The style to modify.
 */
export const injectAttributes = (
  attributes: AttributesList = {},
  style: TextStyleExtended = {},
): TextStyleExtended | undefined => {
  if (isEmptyObject(style) && isEmptyObject(attributes)) {
    return undefined;
  }

  return { ...style, ...convertAttributeValues(attributes) };
};

/**
 * Looks up a tag in a list of tag styles (with optional attributes) and returns it.
 * @param tagName Tag name to check.
 * @param tagStyles Set of tag styles to search.
 * @param attributes Attributes to inject into the style (optional).
 */
export const getStyleForTag = (
  tagName: string,
  tagStyles: TextStyleSet,
  attributes: AttributesList = {},
): TextStyleExtended | undefined => {
  const style = injectAttributes(attributes, tagStyles[tagName]) ?? {};
  if (Object.values(style).length === 0) return undefined;
  return style;
};

/**
 * Converts TagWithAttributes into a style object.
 * @param param0 A TagWithAttributes object that has a tag name matched with any optional attributes.
 * @param tagStyles Set of tag styles to search.
 */
export const tagWithAttributesToStyle = (
  { tagName, attributes }: TagWithAttributes,
  tagStyles: TextStyleSet,
): TextStyleExtended =>
  getStyleForTag(tagName, tagStyles, attributes) as TextStyleExtended;

/**
 * Gets styles for several tags and returns a single combined style object.
 * Results are cached for future requests.
 * @param tags Tags (with attribues) to look up.
 * @param tagStyles Set of tag styles to search.
 * @param styleCache An object that holds the cached values for the combined styles.
 * @returns
 */
export const getStyleForTags = (
  tags: TagWithAttributes[],
  tagStyles: TextStyleSet,
  styleCache: TextStyleSet,
): TextStyleExtended => {
  const tagHash = JSON.stringify(tags);
  if (styleCache[tagHash] === undefined) {
    const defaultStyle = tagStyles.default;
    const styles = tags.map(tag => tagWithAttributesToStyle(tag, tagStyles));
    const stylesWithDefault = [defaultStyle, ...styles];
    styleCache[tagHash] = combineAllStyles(stylesWithDefault);
  }
  return styleCache[tagHash];
};

export const interpretFontSize = (
  baseFontSize: FontSize,
  fontSize: FontSize,
): FontSize => {
  const { value: baseValue, unit: baseUnit } =
    measurementValueToComponents(baseFontSize);
  const { value, unit } = measurementValueToComponents(fontSize);

  if (unit === MeasurementUnit.percent) {
    const percentage = value / 100;
    return baseValue * percentage + baseUnit;
  }
  return fontSize;
};

export const mapTagsToStyles = (
  tokens: TagTokens,
  styles: TextStyleSet,
  spriteTemplates?: Record<string, Sprite>,
): StyledTokens => {
  const defaultStyle: TextStyleExtended = styles.default ?? {};
  const tagStack: TagWithAttributes[] = [];
  const fontSizeStack: FontSize[] = [];
  const styleCache = {};

  const convertTagTokenToStyledToken = (
    token: TagToken | TextToken,
  ): StyledToken | TextToken => {
    if (typeof token === "string") {
      return token as TextToken;
    }

    const { tag, attributes = {} } = token;
    let style: TextStyleExtended = defaultStyle;
    let tags = "";

    const currentBaseFontSize =
      fontSizeStack[fontSizeStack.length - 1] ?? DEFAULT_STYLE.fontSize;

    if (tag) {
      // Put the current tag on the stack.
      tagStack.push({ tagName: tag, attributes });
      // Get tag names as comma separates string
      tags = pluck("tagName")(tagStack).join(",");
      // Merge all tags into a style object.
      style = getStyleForTags(tagStack, styles, styleCache);
      style = convertDecorationToLineProps(style);
    }

    if (style.fontSize !== undefined) {
      style.fontSize = interpretFontSize(currentBaseFontSize, style.fontSize);
    } else {
      style.fontSize = currentBaseFontSize;
    }

    const currentTagStyle: TextStyleExtended = tag ? styles[tag] : {};
    const currentTagColor = currentTagStyle.color;
    const currentTagFill = currentTagStyle.fill;

    // Use color as an alias for fill.
    if (currentTagColor !== undefined && currentTagFill === undefined) {
      style.fill = style.color;
    }
    style.color = style.fill;

    fontSizeStack.push(style.fontSize as FontSize);

    const styledToken: StyledToken = {
      style,
      tags,
      children: token.children.map(convertTagTokenToStyledToken),
    };

    // If a matching sprite exits in the imgMap...
    const imgKey = style[IMG_REFERENCE_PROPERTY] ?? "";
    if (imgKey) {
      if (spriteTemplates === undefined) {
        throw new Error(
          `An image tag with ${IMG_REFERENCE_PROPERTY}="${imgKey}" was encountered, but no imgMap was provided. Please include a valid Sprite in the imgMap property in the options in your TaggedText constructor.`,
        );
      }
      const sprite: SpriteToken | undefined = spriteTemplates[imgKey];
      if (sprite === undefined) {
        throw new Error(
          `An image tag with ${IMG_REFERENCE_PROPERTY}="${imgKey}" was encountered, but there was no matching sprite in the sprite map. Please include a valid Sprite in the imgMap property in the options in your TaggedText constructor.`,
        );
      }
      if (sprite instanceof Sprite === false) {
        throw new Error(
          `The image reference you provided for "${imgKey}" is not a Sprite. The imgMap can only accept Sprite instances.`,
        );
      }

      // insert sprite as first token.
      const cloneOfSprite = cloneSprite(sprite);
      styledToken.children = [cloneOfSprite, ...styledToken.children];
    }

    // Remove the last tag from the stack
    tagStack.pop();
    fontSizeStack.pop();

    return styledToken;
  };

  return convertTagTokenToStyledToken(tokens) as StyledTokens;
};

export const convertDecorationToLineProps = (
  style: TextStyleExtended,
): TextStyleExtended => {
  const { textDecoration } = style;

  if (textDecoration === undefined || textDecoration === "normal") {
    return style;
  }

  const { decorationColor, decorationThickness } = style;
  const defaultColor = decorationColor || style.fill || DEFAULT_STYLE.fill;
  const defaultThickness = decorationThickness || 1;
  const defaultOffset = 0;

  function mergeDecoration(
    decorationLineType: TextDecorationValue,
    decorationLineTypeCamelCase: string = decorationLineType,
  ): Partial<TextStyleExtended> {
    if (style.textDecoration?.includes(decorationLineType)) {
      return {
        [`${decorationLineTypeCamelCase}Color`]:
          style[`${decorationLineTypeCamelCase}Color`] ?? defaultColor,
        [`${decorationLineTypeCamelCase}Thickness`]:
          style[`${decorationLineTypeCamelCase}Thickness`] ?? defaultThickness,
        [`${decorationLineTypeCamelCase}Offset`]:
          style[`${decorationLineTypeCamelCase}Offset`] ?? defaultOffset,
      };
    }
    return {};
  }

  return {
    ...style,
    ...mergeDecoration("underline"),
    ...mergeDecoration("overline"),
    ...mergeDecoration("line-through", "lineThrough"),
  };
};

export const extractDecorations = (
  style: TextStyleExtended,
  textBounds: Bounds,
  fontProperties: IFontMetrics,
): TextDecorationMetrics[] => {
  const { ascent, descent } = fontProperties;
  const baseline = ascent;
  const ascender = descent;
  const xHeight = baseline - ascender;
  const { width } = textBounds;
  const x = 0;

  function styleToMetrics(key: string): TextDecorationMetrics | undefined {
    const color = style[`${key}Color`] as Color;
    const height = style[`${key}Thickness`] as Thickness;
    const offset = (style[`${key}Offset`] as number) ?? 0;

    if (color === undefined || height === undefined) {
      return undefined;
    }

    let y = offset;
    if (key === "underline") {
      // position underline below baseline
      y += baseline + descent / 2;
    } else if (key === "lineThrough") {
      // position lineThrough in center of ascent
      y += ascender + xHeight / 2;
    }
    // else, position overline at top of text

    return {
      color,
      bounds: { x, y, width, height },
    };
  }

  const keySuffices = ["underline", "overline", "lineThrough"];
  const metrics = keySuffices
    .map(styleToMetrics)
    .filter(x => x !== undefined) as TextDecorationMetrics[];
  return metrics;
};

export const convertUnsupportedAlignment = (
  align?: Align,
): AlignClassic | undefined => {
  if (align === undefined) {
    return undefined;
  }
  switch (align) {
    case "justify":
    case "justify-left":
    case "justify-all":
      return "left";
    case "justify-center":
      return "center";
    case "justify-right":
      return "right";
    default:
      return align as AlignClassic;
  }
};
