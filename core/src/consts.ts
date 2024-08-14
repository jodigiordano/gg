import { RuntimeSize } from "./runtime";

// Each system has a margin to make room for ports & routing.
export const SystemMargin = 1;

export const TitleMaxLineLength = 255;

export const TitleMaxLines = 255;

export const TitlePadding = 1;

export const TitleCharsPerSquare = 2;

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
