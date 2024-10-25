import {
  DisplayObject,
  Text,
  ITextStyle,
  Sprite,
  Graphics,
  Container,
  Texture,
} from "pixi.js";
import {
  TaggedTextOptions,
  TextStyleSet,
  SegmentToken,
  isSpriteToken,
  TextSegmentToken,
  isTextToken,
  isNewlineToken,
  isWhitespaceToken,
  Point,
  ParagraphToken,
  TextDecorationMetrics,
} from "./types.js";
import { parseTags } from "./tags.js";
import { mapTagsToStyles } from "./style.js";
import { calculateTokens, getBoundsNested } from "./layout.js";
import { DEFAULT_STYLE } from "./helpers.js";
import { MIPMAP_MODES, SCALE_MODES } from "pixi.js";

const DEFAULT_OPTIONS: TaggedTextOptions = {
  debug: false,
  imgMap: {},
  drawWhitespace: false,
  overdrawDecorations: 0,
};

export default class TaggedText extends Sprite {
  private options: TaggedTextOptions;
  private tokens: ParagraphToken = [];
  private text = "";
  private tagStyles: TextStyleSet = {};

  private textFields: Text[] = [];
  private sprites: Sprite[] = [];
  private spriteTemplates: Record<string, Sprite> = {};
  private debugGraphics: Graphics;

  private textContainer: Container;
  private spriteContainer: Container;
  private debugContainer: Container;

  public tokensFlat: SegmentToken[] = [];

  constructor(
    text = "",
    tagStyles: TextStyleSet = {},
    options: TaggedTextOptions = {},
    texture?: Texture,
  ) {
    super(texture);

    this.textContainer = new Container();
    this.spriteContainer = new Container();
    this.debugContainer = new Container();
    this.debugGraphics = new Graphics();

    this.addChild(this.textContainer);
    this.addChild(this.spriteContainer);
    this.addChild(this.debugContainer);

    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
    this.options = mergedOptions;

    tagStyles = { default: {}, ...tagStyles };

    const mergedDefaultStyles = { ...DEFAULT_STYLE, ...tagStyles.default };

    tagStyles.default = mergedDefaultStyles;

    this.tagStyles = tagStyles;

    if (this.options.imgMap) {
      this.spriteTemplates = this.options.imgMap;
    }

    this.text = text;
  }

  public update(): ParagraphToken {
    // Parse tags in the text.
    const tagTokens = parseTags(this.text);

    // Assign styles to each segment.
    const styledTokens = mapTagsToStyles(
      tagTokens,
      this.tagStyles,
      this.options.imgMap && this.spriteTemplates,
    );

    // Measure font for each style
    // Measure each segment
    // Create the text segments, position and add them. (draw)
    const finalTokens = calculateTokens(
      styledTokens,
      this.options.adjustFontBaseline,
    );

    this.tokens = finalTokens;
    this.tokensFlat = this.tokens.flat(3);

    return finalTokens;
  }

  /**
   * Create and position the display objects based on the tokens.
   */
  public draw(): void {
    const { drawWhitespace } = this.options;

    const tokens = drawWhitespace
      ? this.tokensFlat
      : this.tokensFlat.filter(segment => !isWhitespaceToken(segment));

    let displayObject: Container;

    tokens.forEach(t => {
      if (isTextToken(t)) {
        displayObject = this.createTextFieldForToken(t as TextSegmentToken);
        this.textContainer.addChild(displayObject as DisplayObject);
        this.textFields.push(displayObject as Text);

        if (t.textDecorations && t.textDecorations.length > 0) {
          for (const d of t.textDecorations) {
            const drawing = this.createDrawingForTextDecoration(d);
            displayObject.addChild(drawing as DisplayObject);
          }
        }
      }

      if (isSpriteToken(t)) {
        displayObject = t.content as Sprite;

        this.sprites.push(displayObject as Sprite);
        this.spriteContainer.addChild(displayObject as DisplayObject);
      }

      const { bounds } = t;

      displayObject.x = bounds.x;
      displayObject.y = bounds.y;
    });

    if (this.options.debug) {
      this.drawDebug();
    }
  }

  protected createDrawingForTextDecoration(
    textDecoration: TextDecorationMetrics,
  ): Graphics {
    const { overdrawDecorations: overdraw = 0 } = this.options;
    const { bounds } = textDecoration;
    let { color } = textDecoration;
    const drawing = new Graphics();

    if (typeof color === "string" && color.indexOf("#") === 0) {
      color = "0x" + color.substring(1);
      color = parseInt(color, 16) as number;
    }

    // the min , max here prevents the overdraw from producing a negative width drawing.
    const { y, height } = bounds;
    const midpoint = bounds.x + bounds.width / 2;
    const x = Math.min(bounds.x - overdraw, midpoint);
    const width = Math.max(bounds.width + overdraw * 2, 0);

    drawing
      .beginFill(color as number)
      .drawRect(x, y, width, height)
      .endFill();

    return drawing;
  }

  protected createTextFieldForToken(token: TextSegmentToken): Text {
    const textField = new Text(token.content, { ...token.style } as ITextStyle);

    textField.texture.baseTexture.scaleMode = SCALE_MODES.LINEAR;
    textField.texture.baseTexture.mipmap = MIPMAP_MODES.OFF;

    return textField;
  }

  public drawDebug(): void {
    const DEBUG = {
      WORD_STROKE_COLOR: 0xffcccc,
      WORD_FILL_COLOR: 0xeeeeee,
      WHITESPACE_COLOR: 0xcccccc,
      WHITESPACE_STROKE_COLOR: 0xaaaaaa,
      BASELINE_COLOR: 0xffff99,
      LINE_COLOR: 0xffff00,
      TEXT_STYLE: {
        fontFamily: "courier",
        fontSize: 10,
        fill: 0xffffff,
        dropShadow: true,
      },
    };

    const paragraph = this.tokens;
    this.debugGraphics = new Graphics();
    this.debugContainer.addChild(this.debugGraphics);

    const g = this.debugGraphics;
    g.clear();

    function createInfoText(text: string, position: Point): Text {
      const info = new Text(text, DEBUG.TEXT_STYLE);
      info.x = position.x + 1;
      info.y = position.y + 1;
      return info;
    }

    for (let lineNumber = 0; lineNumber < paragraph.length; lineNumber++) {
      const line = paragraph[lineNumber];
      const lineBounds = getBoundsNested(line);

      if (this.tagStyles?.default?.wordWrap) {
        const w = this.tagStyles?.default?.wordWrapWidth ?? this.width;
        g.endFill()
          .lineStyle(0.5, DEBUG.LINE_COLOR, 0.2)
          .drawRect(0, lineBounds.y, w, lineBounds.height)
          .endFill();
      }

      for (let wordNumber = 0; wordNumber < line.length; wordNumber++) {
        const word = line[wordNumber];
        for (const segmentToken of word) {
          const isSprite = isSpriteToken(segmentToken);
          const { x, y, width } = segmentToken.bounds;
          const baseline =
            y +
            (isSprite
              ? segmentToken.bounds.height
              : segmentToken.fontProperties.ascent);

          let { height } = segmentToken.bounds;
          if (isSprite) {
            height += segmentToken.fontProperties.descent;
          }

          if (
            isWhitespaceToken(segmentToken) &&
            this.options.drawWhitespace === false
          ) {
            g.lineStyle(1, DEBUG.WHITESPACE_STROKE_COLOR, 1).beginFill(
              DEBUG.WHITESPACE_COLOR,
              0.2,
            );
          } else {
            g.lineStyle(1, DEBUG.WORD_STROKE_COLOR, 1).beginFill(
              DEBUG.WORD_FILL_COLOR,
              0.2,
            );
          }

          if (isNewlineToken(segmentToken)) {
            this.debugContainer.addChild(
              createInfoText("↩︎", { x, y: y + 10 }) as DisplayObject,
            );
          } else {
            g.lineStyle(0.5, DEBUG.LINE_COLOR, 0.2)
              .drawRect(x, y, width, height)
              .endFill()

              .lineStyle(1, DEBUG.BASELINE_COLOR, 1)
              .beginFill()
              .drawRect(x, baseline, width, 1)
              .endFill();
          }

          let info;

          if (isTextToken(segmentToken)) {
            info = `${segmentToken.tags}`;
            this.debugContainer.addChild(
              createInfoText(info, { x, y }) as DisplayObject,
            );
          }
        }
      }
    }
  }
}
