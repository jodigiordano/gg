import { RuntimeSize } from "./runtime";

// Each system has a margin to make room for ports & routing.
export const SystemMargin = 1;

export const TitlePadding = 1;

export const PaddingWhiteBox = 2;

export const SystemMinSize: RuntimeSize = {
  width: 5,
  height: 3,
};

export enum PathfindingWeights {
  EmptySpace = 1,
  SystemPerimeter = 1,
  Path = 5,
  MakeATurn = 10,
  Impenetrable = Infinity,
}

const TitleMaxLineLength = 255;
const TitleMaxLines = 255;
const TitleCharsPerSquare = 2;

// Sanitize a title so it doesn't have more than TitleMaxLines lines of
// text and each line doesn't have more than TitleMaxLineLength of chars.
export function sanitizeTitle(rawTitle: string): string {
  return rawTitle
    .split("\\n")
    .flatMap(line => {
      const chunks: string[] = [];

      for (let i = 0; i < line.length; i += TitleMaxLineLength - 1) {
        chunks.push(line.substring(i, i + TitleMaxLineLength - 1));
      }

      return chunks;
    })
    .slice(0, TitleMaxLines)
    .join("\\n");
}

export function getTitleLength(title: string): RuntimeSize {
  const titleLengths = title.split("\\n").map(line => line.length);

  return {
    width: Math.ceil(Math.max(...titleLengths) / TitleCharsPerSquare) | 0,
    height: titleLengths.length,
  };
}
