// A collection of heuristic functions.
export type Heuristic = (dx: number, dy: number) => number;

export const Heuristics = {
  // Manhattan distance.
  manhattan: function (dx: number, dy: number): number {
    return dx + dy;
  },

  // Euclidean distance.
  euclidean: function (dx: number, dy: number): number {
    return Math.sqrt(dx * dx + dy * dy);
  },

  // Octile distance.
  octile: function (dx: number, dy: number): number {
    const F = Math.SQRT2 - 1;

    return dx < dy ? F * dx + dy : F * dy + dx;
  },

  // Chebyshev distance.
  chebyshev: function (dx: number, dy: number): number {
    return Math.max(dx, dy);
  },
};
