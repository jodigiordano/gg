import { extractDecorations } from "./style.js";
import { assoc, mapProp, flatReduce, Unary } from "./functionalUtils.js";
import { getFontPropertiesOfText } from "./helpers.js";
import {
  Sprite,
  Text,
  Point as PixiPoint,
  Container,
  Rectangle,
  ITextStyle,
} from "pixi.js";
import {
  Align,
  Bounds,
  Point,
  StyledTokens,
  SegmentToken,
  StyledToken,
  TextToken,
  SpriteToken,
  TextStyleExtended,
  IFontMetrics,
  isNewlineToken,
  isWhitespaceToken,
  IMG_DISPLAY_PROPERTY,
  isSpriteToken,
  ParagraphToken,
  LineToken,
  WordToken,
  Nested,
  VAlign,
  createEmptySegmentToken,
  FontMap,
} from "./types.js";

const ICON_SCALE_BASE = 0.8;

const sizer = new Text("");

// Returns true if the string is only whitespace and nothing else.
const isOnlyWhitespace = (s: string): boolean => s.search(/^\s+$/) === 0;

/**
 * Translates the current location point to the beginning of the next line.
 *
 * @param offset An offset coordinate. The function will make a clone of this with new coordinates.
 * @param largestLineHeight The largest height in the line of text.
 * @param lineSpacing The amount of extra space to insert between each line.
 */
export const updateOffsetForNewLine = (
  offset: Point,
  largestLineHeight: number,
  lineSpacing: number,
): Point => new PixiPoint(0, offset.y + largestLineHeight + lineSpacing);

const rectFromContainer = (
  container: Container,
  offset: Point = { x: 0, y: 0 },
): Bounds => {
  const w = container.width;
  const h = container.height;
  const x = offset.x + container.x;
  const y = offset.y + container.y;

  return new Rectangle(x, y, w, h);
};

/**
 * Move a point by an offset.
 * Point p => p -> p-> -> p
 * @param offset Amount to translate the target.
 * @param point Target to translate.
 */
export const translatePoint =
  <P extends Point>(offset: Point) =>
  (point: P): P => ({
    ...point,
    x: point.x + offset.x,
    y: point.y + offset.y,
  });

/**
 * Same as translatePoint but for all the points in an array.
 */
export const translateLine =
  (offset: Point) =>
  (line: Bounds[]): Bounds[] =>
    line.map(translatePoint(offset));

export const translateWordPosition =
  (offset: Point) =>
  (word: WordToken): WordToken =>
    word.map(token =>
      mapProp<Bounds, SegmentToken>("bounds")(translatePoint(offset))(token),
    );

export const translateTokenLine =
  (offset: Point) =>
  (line: LineToken): LineToken =>
    line.map(translateWordPosition(offset));

export const lineWidth = (wordsInLine: Bounds[]): number => {
  const firstWord = wordsInLine[0];
  const lastWord = wordsInLine[wordsInLine.length - 1];

  if (firstWord === undefined) {
    return 0;
  }
  if (lastWord === firstWord) {
    return firstWord.width;
  }
  return lastWord.x + lastWord.width - firstWord.x;
};

export const center = (x: number, context: number): number => (context - x) / 2;

const setBoundsX = assoc<Bounds, number>("x");

const positionWordX =
  (x: number) =>
  (word: WordToken): WordToken => {
    let prevBounds: Bounds;
    return word.map(token => {
      if (prevBounds === undefined) {
        token.bounds.x = x;
        prevBounds = token.bounds;
      } else {
        token.bounds.x = prevBounds.x + prevBounds.width;
        prevBounds = token.bounds;
      }
      return token;
    });
  };

export const concatBounds = (
  originalBounds: Bounds = { x: NaN, y: NaN, width: NaN, height: NaN },
  bounds: Bounds = { x: NaN, y: NaN, width: NaN, height: NaN },
): Bounds => {
  if (isNaN(originalBounds.x)) {
    return bounds;
  }

  const x = Math.min(originalBounds.x, bounds.x);
  const y = Math.min(originalBounds.y, bounds.y);
  const right = Math.max(
    originalBounds.x + originalBounds.width,
    bounds.x + bounds.width,
  );
  const bottom = Math.max(
    originalBounds.y + originalBounds.height,
    bounds.y + bounds.height,
  );
  const width = right - x;
  const height = bottom - y;

  return { x, y, width, height };
};

const getCombinedBounds = (bounds: Bounds[]): Bounds =>
  bounds.reduce(concatBounds, { x: NaN, y: NaN, width: NaN, height: NaN });

export const getBoundsNested: Unary<Nested<SegmentToken>, Bounds> = flatReduce<
  SegmentToken,
  Bounds
>((acc: Bounds, t: SegmentToken) => concatBounds(acc, t.bounds), {
  x: NaN,
  y: NaN,
  width: NaN,
  height: NaN,
});

type AlignFunction = (line: Bounds[]) => Bounds[];
type AlignFunctionMaxWidth = (maxWidth: number) => AlignFunction;

export const alignLeft: AlignFunction = line =>
  line.reduce(
    (newLine: Bounds[], bounds: Bounds, i: number): Bounds[] =>
      // is first word?
      i === 0
        ? [setBoundsX(0)(bounds)]
        : newLine.concat([
            setBoundsX(newLine[i - 1].x + newLine[i - 1].width)(bounds),
          ]),
    [],
  );

export const alignRight: AlignFunctionMaxWidth = maxWidth => line =>
  translateLine({
    x: maxWidth - lineWidth(line),
    y: 0,
  })(alignLeft(line));

export const alignCenter: AlignFunctionMaxWidth = maxWidth => line =>
  translateLine({ x: center(lineWidth(line), maxWidth), y: 0 })(
    alignLeft(line),
  );

export const alignJustify: AlignFunctionMaxWidth = maxLineWidth => line => {
  const count = line.length;
  if (count === 0) {
    return [];
  }

  const nonZeroWidthWords: Bounds[] = line.filter(({ width }) => width > 0);
  const countNonZeroWidthWords = nonZeroWidthWords.length;

  if (countNonZeroWidthWords === 1) {
    const [first, ...rest] = line;
    first.x = 0;
    return [first, ...rest];
  }

  const result: Bounds[] = [];
  const combinedBounds = getCombinedBounds(nonZeroWidthWords);
  const w = combinedBounds.width;
  const totalSpace = maxLineWidth - w;
  const spacerWidth = totalSpace / (countNonZeroWidthWords - 1);

  let previousWord;
  for (let i = 0; i < line.length; i++) {
    const bounds = line[i];
    if (bounds.width === 0) {
      result[i] = { ...bounds };
      continue;
    }
    let x;
    if (previousWord === undefined) {
      x = 0;
    } else {
      x = previousWord.x + previousWord.width + spacerWidth;
    }
    if (isNaN(x)) {
      throw new Error(
        `Something went wrong with the justified layout calculation. x is NaN.`,
      );
    }
    const newWord: Bounds = setBoundsX(x)(bounds);
    previousWord = newWord;
    result[i] = newWord;
  }
  return result;
};

export const alignLines = (
  align: Align,
  maxWidth: number,
  lines: ParagraphToken,
): ParagraphToken => {
  // do horizontal alignment.
  let alignFunction: AlignFunction;
  let lastAlignFunction: AlignFunction;
  switch (align) {
    case "left":
      alignFunction = alignLeft;
      lastAlignFunction = alignFunction;
      break;
    case "right":
      alignFunction = alignRight(maxWidth);
      lastAlignFunction = alignFunction;
      break;
    case "center":
      alignFunction = alignCenter(maxWidth);
      lastAlignFunction = alignFunction;
      break;
    default:
      alignFunction = alignLeft;
      lastAlignFunction = alignFunction;
      break;
  }

  for (const line of lines) {
    const isLastLine =
      // line is the last in the group OR
      lines.indexOf(line) === lines.length - 1 ||
      // line contains newline character
      line.flat(2).filter(isNewlineToken).length > 0;

    const wordBoundsForLine: Bounds[] = [];
    let alignedLine;
    for (const word of line) {
      const wordBounds = getBoundsNested(word);
      wordBoundsForLine.push(wordBounds);
      if (isNaN(wordBounds.x)) {
        throw new Error("wordBounds not correct");
      }
    }
    if (isLastLine) {
      alignedLine = lastAlignFunction(wordBoundsForLine);
    } else {
      alignedLine = alignFunction(wordBoundsForLine);
    }
    for (let i = 0; i < line.length; i++) {
      const bounds = alignedLine[i];
      const word = line[i];
      line[i] = positionWordX(bounds.x)(word);
    }
  }
  return lines;
};

const getTallestToken = (line: LineToken): SegmentToken =>
  flatReduce<SegmentToken, SegmentToken>((tallest, current) => {
    let h = current.bounds.height ?? 0;
    if (isSpriteToken(current)) {
      h += current.fontProperties.descent;
    }
    if (h > (tallest?.bounds.height ?? 0)) {
      return current;
    }
    return tallest;
  }, createEmptySegmentToken())(line);

export const verticalAlignInLines = (
  lines: ParagraphToken,
  lineSpacing: number,
  overrideValign?: VAlign, // If you want to override the valign from the styles object, set it here.
): ParagraphToken => {
  let previousTallestToken: SegmentToken = createEmptySegmentToken();
  let previousLineBottom = 0;
  let paragraphModifier = 0;

  const newLines: ParagraphToken = [];

  for (const line of lines) {
    const newLine: LineToken = [];

    let tallestToken: SegmentToken = getTallestToken(line);
    // Note, paragraphModifier from previous line applied here.
    let tallestHeight = (tallestToken.bounds?.height ?? 0) + paragraphModifier;
    let tallestAscent =
      (tallestToken.fontProperties?.ascent ?? 0) + paragraphModifier;
    const valignParagraphModifier = paragraphModifier;
    paragraphModifier = 0;

    const lastToken = line[line.length - 1][0];
    if (isNewlineToken(lastToken)) {
      // Note, this will get applied on the NEXT line
      paragraphModifier = tallestToken.style.paragraphSpacing ?? 0;
    }
    if (isSpriteToken(tallestToken)) {
      tallestHeight += tallestToken.fontProperties.descent;
      tallestAscent = tallestToken.bounds.height;
    }

    if (tallestHeight === 0) {
      tallestToken = previousTallestToken;
    } else {
      previousTallestToken = tallestToken;
    }

    for (const word of line) {
      const newWord: WordToken = [];
      for (const segment of word) {
        const { bounds, fontProperties, style } = segment;
        const { height } = bounds;

        const newBounds: Bounds = { ...bounds };
        const valign = overrideValign ?? style.valign;

        let { ascent } = fontProperties;
        if (isSpriteToken(segment)) {
          ascent = segment.bounds.height;
        }

        if (isNewlineToken(segment)) {
          const newToken = {
            ...segment,
          };
          newToken.bounds.y = previousLineBottom + tallestAscent - ascent;
          newWord.push(newToken);
          continue;
        }

        // Every valignment starts at the previous line bottom.
        let newY = previousLineBottom;
        switch (valign) {
          case "bottom":
            newY += tallestHeight - height;
            break;
          case "middle":
            // Need to account for how paragraph spacing affects the middle positioning.
            newY += (tallestHeight + valignParagraphModifier - height) / 2;
            break;
          case "top":
            // Normally the change would be 0px but we need to account for paragraph spacing.
            newY += valignParagraphModifier;
            break;
          case "baseline":
          default:
            newY += tallestAscent - ascent;
        }
        newBounds.y = newY;

        const newToken = {
          ...segment,
          bounds: newBounds,
        };
        newWord.push(newToken);
      }
      newLine.push(newWord);
    }

    previousLineBottom += tallestHeight + lineSpacing;
    newLines.push(newLine);
  }

  return newLines;
};

export const collapseWhitespacesOnEndOfLines = (
  lines: ParagraphToken,
): ParagraphToken => {
  for (const line of lines) {
    const l = line.length;
    let i = l;
    while (i >= 0) {
      i -= 1;
      const word = line[i];
      if (!isWhitespaceToken(word)) {
        break;
      } else {
        for (const token of word) {
          token.bounds.width = 0;
          token.bounds.height = Math.min(
            token.bounds.height,
            token.fontProperties.fontSize,
          );
        }
      }
    }
  }
  return lines;
};

const layout = (
  tokens: SegmentToken[],
  maxWidth: number,
  lineSpacing: number,
  align: Align,
): ParagraphToken => {
  const cursor = { x: 0, y: 0 };
  let wordWidth = 0;
  let word: WordToken = [];
  let line: LineToken = [];
  const allLines: ParagraphToken = [];
  let tallestHeightInLine = 0;
  let token: SegmentToken;

  for (let i = 0; i < tokens.length; i++) {
    token = tokens[i];
    // when using an unbroken line (breakLines === false), treat the entire line as one word
    // unless you encounter one that isn't unbroken or a newline character
    const normalLineBreaks = hasNormalLineBreaks(token);
    const isWhitespace = isWhitespaceToken(token);
    const isNewline = isNewlineToken(token);
    const isImage = isSpriteToken(token);
    const isWordEndingToken = isWhitespace || isImage;

    if (
      (isWordEndingToken && normalLineBreaks) ||
      isNewline ||
      token.style.breakWords
    ) {
      positionWordBufferAndAddToLine();
    }

    addTokenToWordAndUpdateWordWidth(token);
    setTallestHeight(token);

    // always immediately add whitespace to the line.
    if ((isWhitespace && normalLineBreaks) || isNewline) {
      positionWordBufferAndAddToLine();
    }

    // If the token is a newline character,
    // move the cursor to next line immediately
    if (isNewline || isBlockImage(token)) {
      addLineToListOfLinesAndMoveCursorToNextLine(token);
    } else if (wordInBufferExceedsLineLength()) {
      // don't wrap if it's the first word in the line.
      if (line.length > 0) {
        addLineToListOfLinesAndMoveCursorToNextLine(token);
      }
    }
  }

  // After we reach the last token, add it to the word and finalize both buffers.
  if (word.length > 0) {
    positionWordBufferAndAddToLine();
  }
  if (line.length > 0) {
    addLineToListOfLines();
  }

  const collapsedWhitespace = collapseWhitespacesOnEndOfLines(allLines);
  const alignedLines = alignLines(align, maxWidth, collapsedWhitespace);
  const valignedLines = verticalAlignInLines(alignedLines, lineSpacing);

  return valignedLines;

  function addWordBufferToLineBuffer() {
    if (word !== undefined && word.length > 0) {
      // add word to line
      line.push(word);
    }

    // reset word buffer
    word = [];
    wordWidth = 0;
  }

  function addLineToListOfLines() {
    allLines.push(line);
    line = [];
  }

  function addLineToListOfLinesAndMoveCursorToNextLine(token: SegmentToken) {
    // finalize Line
    addLineToListOfLines();

    // move cursor to next line
    cursor.x = 0;
    cursor.y = cursor.y + tallestHeightInLine;

    // reset tallestHeight
    tallestHeightInLine = 0;
    setTallestHeight(token);
  }

  function setTallestHeight(token?: SegmentToken): void {
    const fontSize = token?.fontProperties?.fontSize ?? 0;
    const height = token?.bounds?.height ?? 0;

    tallestHeightInLine = Math.max(tallestHeightInLine, fontSize, lineSpacing);

    // Don't try to measure the height of newline tokens
    if (isNewlineToken(token) === false) {
      tallestHeightInLine = Math.max(tallestHeightInLine, height);
    }
  }

  function positionTokenAtCursorAndAdvanceCursor(token: SegmentToken): void {
    // position token at cursor
    setTallestHeight(token);
    token.bounds.x = cursor.x;
    token.bounds.y = cursor.y;
    // advance cursor
    cursor.x += token.bounds.width;
  }

  function positionWordBufferAtCursorAndAdvanceCursor(): void {
    word.forEach(positionTokenAtCursorAndAdvanceCursor);
  }

  function wordInBufferExceedsLineLength(): boolean {
    return cursor.x + wordWidth > maxWidth;
  }

  function isBlockImage(token: SegmentToken): boolean {
    return token.style[IMG_DISPLAY_PROPERTY] === "block";
  }

  function hasNormalLineBreaks(token: SegmentToken): boolean {
    return token.style.breakLines ?? true;
  }

  function addTokenToWordAndUpdateWordWidth(token: SegmentToken): void {
    // add the token to the current word buffer.
    word.push(token);
    wordWidth += token.bounds.width;
  }

  function positionWordBufferAndAddToLine() {
    positionWordBufferAtCursorAndAdvanceCursor();
    addWordBufferToLineBuffer();
  }
};

const notEmptyString = (s: string) => s !== "";

const SPLIT_MARKER = `_🔪_`;
export const splitAroundWhitespace = (s: string): string[] =>
  s
    .replace(/\n/g, `${SPLIT_MARKER}$&${SPLIT_MARKER}`)
    .split(SPLIT_MARKER)
    .filter(s => s !== "");

export const calculateTokens = (
  styledTokens: StyledTokens,
  adjustFontBaseline?: FontMap,
): ParagraphToken => {
  // Create a text field to use for measurements.
  const defaultStyle = styledTokens.style;

  let fontProperties: IFontMetrics;

  const generateTokensFromStyledToken =
    (style: TextStyleExtended, tags: string) =>
    (token: StyledToken | TextToken | SpriteToken): SegmentToken[] => {
      let output: SegmentToken[] = [];

      sizer.style = <ITextStyle>{
        ...style,
        // Override some styles for the purposes of sizing text.
        wordWrap: false,
        dropShadowBlur: 0,
        dropShadowDistance: 0,
        dropShadowAngle: 0,
        dropShadow: false,
      };

      if (typeof token === "string") {
        // split into pieces and convert into tokens.
        const textSegments = [token]
          .flatMap(splitAroundWhitespace)
          .filter(notEmptyString);

        const textTokens = textSegments.map((str): SegmentToken => {
          sizer.text = str;
          sizer.updateText(false);

          fontProperties = { ...getFontPropertiesOfText(sizer) };

          // Incorporate the size of the stroke into the size of the text.
          if (isOnlyWhitespace(token) === false) {
            const stroke = sizer.style.strokeThickness ?? 0;
            if (stroke > 0) {
              fontProperties.descent += stroke / 2;
              fontProperties.ascent += stroke / 2;
              fontProperties.fontSize =
                fontProperties.ascent + fontProperties.descent;
            }
          }

          const bounds = rectFromContainer(sizer);

          const textDecorations = extractDecorations(
            style,
            bounds,
            fontProperties,
          );

          const baselineAdjustment = getBaselineAdjustment(
            style,
            adjustFontBaseline,
            fontProperties.ascent,
          );

          fontProperties.ascent += baselineAdjustment;

          if (style.letterSpacing) {
            bounds.width += style.letterSpacing;
          }

          const convertedToken = {
            content: str,
            style,
            tags,
            bounds,
            fontProperties,
            textDecorations,
          };

          // Required to remove extra stroke width from whitespace.
          // to be totally honest, I'm not sure why this works / why it was being added.
          if (isOnlyWhitespace(str)) {
            bounds.width -= style.strokeThickness ?? 0;
          }

          return convertedToken;
        });

        output = output.concat(textTokens);
      } else if (token instanceof Sprite) {
        const sprite = token;
        const imgDisplay = style[IMG_DISPLAY_PROPERTY];
        // const isBlockImage = imgDisplay === "block";
        const isIcon = imgDisplay === "icon";
        fontProperties = { ...getFontPropertiesOfText(sizer) };

        if (isIcon) {
          // Set to minimum of 1 to avoid devide by zero.
          // if it's height is zero or one it probably hasn't loaded yet.
          // It will get refreshed after it loads.
          const h = Math.max(sprite.height, 1);

          if (h > 1 && sprite.scale.y === 1) {
            const { iconScale = 1.0 } = style;
            const ratio =
              (fontProperties.ascent / h) * ICON_SCALE_BASE * iconScale;
            sprite.scale.set(ratio);
          }
        }

        // handle images
        const bounds = rectFromContainer(sprite);

        const { letterSpacing } = style;
        if (letterSpacing && isIcon) {
          bounds.width += letterSpacing;
        }

        output.push({
          content: sprite,
          style,
          tags,
          bounds,
          fontProperties,
          textDecorations: undefined,
        });
      } else {
        // token is a composite
        const styledToken = token as StyledToken;
        const { children } = styledToken;
        // set tags and styles for children of this composite token.
        const newStyle = styledToken.style;
        const newTags = styledToken.tags;

        if (newStyle === undefined) {
          throw new Error(
            `Expected to find a 'style' property on ${styledToken}`,
          );
        }

        output = output.concat(
          children.flatMap(generateTokensFromStyledToken(newStyle, newTags)),
        );
      }
      return output;
    };

  // when starting out, use the default style
  const tags = "";
  const style: TextStyleExtended = defaultStyle;

  const finalTokens = styledTokens.children.flatMap(
    generateTokensFromStyledToken(style, tags),
  );

  const { wordWrap: ww, wordWrapWidth: www } = defaultStyle;
  const hasWordWrapWidth = www !== undefined && isNaN(www) === false && www > 0;
  const maxWidth =
    ww && hasWordWrapWidth ? (www as number) : Number.POSITIVE_INFINITY;

  const lineSpacing = defaultStyle.lineSpacing ?? 0;
  const align = defaultStyle.align ?? "left";

  const lines = layout(finalTokens, maxWidth, lineSpacing, align);

  return lines;
};

export const getBaselineAdjustment = (
  style: TextStyleExtended,
  fontBaselineMap: FontMap = {},
  ascent: number,
): number => {
  const fontFamily = style.fontFamily?.toString() ?? "";
  const adjustBaseline = style.adjustBaseline ?? 0;
  const adjustFontBaseline = fontBaselineMap[fontFamily] ?? null;

  let finalValue = adjustBaseline;
  if (typeof adjustFontBaseline === "string") {
    const percentPair = adjustFontBaseline.split("%");
    const isPercent = percentPair.length > 1;
    const value = Number(percentPair[0]);

    if (isPercent) {
      finalValue += ascent * (value / 100);
    } else {
      finalValue += value;
    }
  } else {
    finalValue += Number(adjustFontBaseline);
  }
  return finalValue;
};
