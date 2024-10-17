import { logWarning } from "./errorMessaging.js";
import {
  TagMatchData,
  AttributesList,
  TagWithAttributes,
  CompositeToken,
  TagToken,
  TextToken,
  isEmptyObject,
} from "./types.js";
import emojiRegex from "./emojiRegex.js";

const defaultLogWarning = logWarning();

// Regex to match defined tags.
let fullTagRegex = new RegExp("", "g");

// Regex to match any tag.
const bareboneTagRegex = /<(\w+)((?:\s+[^>]*)*)+\s*>|<\/(\w+)\s*>/g;

// Regex to find self-closing tags (ex: <foo />).
const selfClosingTagSearchRegex = /<([A-Za-z_-][A-Za-z0-9_-]*)([^\/>]*)\/>/g;

export function setFullTagRegex(tagNamesToMatch: string[]): void {
  const matchingTagNames = tagNamesToMatch.join("|");

  const captureGroup = (a: string) => `(${a})`;
  const noCaptureGroup = (a: string) => `(?:${a})`;

  const WHITESPACE = `\\s`;
  const S = WHITESPACE + "*";
  const SS = WHITESPACE + "+";
  const TAG_NAMES = captureGroup(matchingTagNames);
  const NOT_CLOSING_TAG = `[^>]`;

  const ATTRIBUTES =
    captureGroup(noCaptureGroup(`${SS}${NOT_CLOSING_TAG}*`) + "*") + "+";
  const TAG_OPEN = `<` + TAG_NAMES + ATTRIBUTES + S + `>`;
  const TAG_CLOSE = `</${TAG_NAMES}${S}>`;

  const pattern = `${TAG_OPEN}|${TAG_CLOSE}`;

  fullTagRegex = new RegExp(pattern, "g");
}

const EMOJI_TAG = "__EMOJI__";

/**
 * Takes a string of attributes and returns an object with key value pairs for each attribute.
 * Converts "true" | "false" into booleans and number-like strings into numbers.
 * @param attributesString  XML style attributes like "src='/image.png' alt='foo'"
 */
export const parseAttributes = (attributesString = ""): AttributesList => {
  if (attributesString === "") {
    return {};
  }

  const attributeMatch = /[a-zA-Z][a-zA-Z0-9]*=('|")[^'"]*('|")/g;

  const attributes = attributesString.trim().match(attributeMatch);
  if (attributes === null) {
    throw new Error('Invalid attributes string: "' + attributesString + '"');
  }

  return [...attributes].reduce((obj: AttributesList, attribute: string) => {
    const attributePair: string[] = [
      attribute.substring(0, attribute.indexOf("=")),
      attribute.substring(attribute.indexOf("=") + 1),
    ];
    const name = attributePair[0].trim();
    const valueStr: string = attributePair[1]
      .substring(1, attributePair[1].length - 1)
      .trim();

    obj[name] = valueStr;
    return obj;
  }, {});
};

/** Converts from RegExpExecArray to TagMatchData */
export const createTagMatchData = (match: RegExpExecArray): TagMatchData => {
  const {
    0: tag,
    1: openTagName,
    2: attributes,
    3: closeTagName,
    index,
  } = match;
  const tagName = openTagName ?? closeTagName;
  const isOpening = openTagName !== undefined;
  return {
    tag,
    tagName,
    isOpening,
    attributes: parseAttributes(attributes),
    index,
  };
};

/** Converts TagMatchData to TagWithAttributes */
export const tagMatchDataToTagWithAttributes = (
  tag: TagMatchData,
): TagWithAttributes => ({
  tagName: tag.tagName,
  attributes: tag.attributes,
});

/**
 * Splits original text into an untagged list of string segments.
 * @param input Original text input
 * @param tagMatchData Results of regexp exect converted to tag matches.
 */
export const extractSegments = (
  input: string,
  tagMatchData: TagMatchData[],
): string[] => {
  const segments: string[] = [];

  let remaining = input;
  let offset = 0;
  let tagMatch: TagMatchData;
  for (tagMatch of tagMatchData) {
    if (remaining !== undefined) {
      const { tag, index } = tagMatch;
      const startOfTag = index - offset;
      const endOfTag = startOfTag + tag.length;
      offset += endOfTag;

      const segment = remaining.substr(0, startOfTag);
      segments.push(segment);

      remaining = remaining.substr(endOfTag);
    }
  }
  segments.push(remaining);

  return segments;
};

export const wrapEmoji = (input: string): string => {
  const emojiRx = new RegExp(`((<|</)[^>]*)?(${emojiRegex.source})+`, "gum");

  return input.replaceAll(emojiRx, (match, tagStart) => {
    if (tagStart?.length > 0) {
      // if the emoji is inside a tag, ignore it.
      return match;
    }
    return `<${EMOJI_TAG}>${match}</${EMOJI_TAG}>`;
  });
};

export const replaceSelfClosingTags = (input: string): string =>
  input.replace(selfClosingTagSearchRegex, (_, tag, attributes = "") => {
    let output = `<${tag}${attributes}></${tag}>`;
    output = output.replace(/\s+/g, " ");
    output = output.replace(/\s>/g, ">");
    return output;
  });

/**
 * Returns the string with the tags removed.
 */
export const removeTags = (input: string): string =>
  input.replace(bareboneTagRegex, "");

export const tagMatchToTagToken = (tag: TagMatchData): TagToken => {
  return {
    tag: tag.tagName,
    children: [],

    // Add attributes unless undefined
    ...(isEmptyObject(tag.attributes) ? {} : { attributes: tag.attributes }),
  };
};

export const createTokensNew = (
  segments: string[],
  tags: TagMatchData[],
  logWarningFunction = defaultLogWarning,
): (TagToken | TextToken)[] => {
  const rootTokens: CompositeToken<TagToken | TextToken> = { children: [] };
  if (segments[0] !== "") {
    rootTokens.children.push(segments[0]);
  }
  // Track which tags are opened and closed and add them to the list.
  const tokenStack: TagToken[] = [rootTokens];

  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];
    const segment = segments[i + 1] ?? "";
    if (tag.isOpening) {
      const token = tagMatchToTagToken(tag);
      if (segment !== "") {
        token.children.push(segment);
      }
      tokenStack[tokenStack.length - 1].children.push(token);
      tokenStack.push(token as CompositeToken<TagToken | TextToken>);
    } else {
      const poppedToken = tokenStack.pop();
      if (poppedToken === undefined || poppedToken.tag !== tag.tagName) {
        throw new Error(
          `Unexpected tag nesting. Found a closing tag "${tag.tagName}" that doesn't match the previously open tag "${poppedToken?.tag}"`,
        );
      }
      if (segment !== "") {
        tokenStack[tokenStack.length - 1].children.push(segment);
      }
    }
  }
  if (tokenStack.length > 1) {
    logWarningFunction(
      "unclosed-tags",
      `Found ${tokenStack.length - 1} unclosed tags in\n${tokenStack
        .map(token => token.tag)
        .join("-")}`,
    );
  }

  return rootTokens.children;
};

export const containsEmoji = (input: string): boolean => emojiRegex.test(input);

/**
 * Converts a string into a list of tokens that match segments of text with styles.
 */
export const parseTagsNew = (
  input: string,
  logWarningFunction = defaultLogWarning,
): CompositeToken<TagToken | TextToken> => {
  if (containsEmoji(input)) {
    input = wrapEmoji(input);
  }

  input = replaceSelfClosingTags(input);
  const matchesRaw: RegExpExecArray[] = [];
  const tagMatches: TagMatchData[] = [];
  let match;
  while ((match = fullTagRegex.exec(input))) {
    matchesRaw.push(match);

    const tagMatch = createTagMatchData(match);
    tagMatches.push(tagMatch);
  }

  const segments = extractSegments(input, tagMatches);

  const tokens = createTokensNew(segments, tagMatches, logWarningFunction);

  return { children: tokens };
};
