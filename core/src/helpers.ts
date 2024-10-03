import { RuntimeSize, RuntimeSubsystem, RuntimeSystem } from "./runtime";

export enum PathfindingWeights {
  EmptySpace = 1,
  SystemPerimeter = 2,
  Path = 5,
  MakeATurn = 10,
  Impenetrable = Infinity,
}

export const TitleMaxLineLength = 255;

export const TitleMaxLines = 255;

const TitleCharsPerSquare = 2;

// Sanitize a title so it doesn't have more than TitleMaxLines lines of
// text and each line doesn't have more than TitleMaxLineLength of chars.
export function sanitizeTitle(rawTitle: string): string {
  return rawTitle
    .split("\\n")
    .flatMap(line => {
      // Preserve empty newlines.
      if (line.length === 0) {
        return [""];
      }

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
  const titleLengths =
    title === "" ? [] : title.split("\\n").map(line => line.length);

  return {
    width: Math.ceil(Math.max(...titleLengths) / TitleCharsPerSquare) | 0,
    height: titleLengths.length,
  };
}

export function isSubsystemOf(
  parentSystem: RuntimeSystem | RuntimeSubsystem,
  childSystem: RuntimeSystem | RuntimeSubsystem,
): boolean {
  if (!parentSystem || !childSystem) {
    return false;
  }

  const toVisit = [...parentSystem.systems];

  while (toVisit.length) {
    const candidate = toVisit.pop()!;

    if (candidate.id === childSystem.id) {
      return true;
    }

    toVisit.push(...candidate.systems);
  }

  return false;
}
