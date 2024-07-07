import DiagonalMovement from "./diagonalMovement";

interface Node {
  x: number;
  y: number;
  weight: number;

  // Properties set when finding a path between two nodes.
  parent: Node | undefined;
  f: number;
  g: number;
  h: number;
  opened: boolean;
  closed: boolean;
}

export default class Grid {
  private width: number;
  private height: number;
  private nodes: Node[][];

  constructor(width: number, height: number, weight: number) {
    this.width = width;
    this.height = height;

    this.nodes = new Array(this.width);

    for (let x = 0; x < this.width; x++) {
      this.nodes[x] = new Array(this.height);

      for (let y = 0; y < this.height; y++) {
        this.nodes[x]![y] = {
          x,
          y,
          weight,
          parent: undefined,
          f: 0,
          g: 0,
          h: 0,
          opened: false,
          closed: false,
        };
      }
    }
  }

  getNodeAt(x: number, y: number): Node {
    return this.nodes[x]![y]!;
  }

  isWalkableAt(x: number, y: number): boolean {
    return this.isInside(x, y) && this.nodes[x]![y]!.weight !== Infinity;
  }

  isInside(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  getWeightAt(x: number, y: number): number {
    return this.nodes[x]![y]!.weight;
  }

  setWeightAt(x: number, y: number, weight: number): void {
    this.nodes[x]![y]!.weight = weight;
  }

  // Get the neighbors of the given node.
  //
  //     offsets      diagonalOffsets:
  //  +---+---+---+    +---+---+---+
  //  |   | 0 |   |    | 0 |   | 1 |
  //  +---+---+---+    +---+---+---+
  //  | 3 |   | 1 |    |   |   |   |
  //  +---+---+---+    +---+---+---+
  //  |   | 2 |   |    | 3 |   | 2 |
  //  +---+---+---+    +---+---+---+
  //
  getNeighbors(node: Node, diagonalMovement: DiagonalMovement): Node[] {
    const { x, y } = node;
    const neighbors: Node[] = [];

    let s0 = false;
    let s1 = false;
    let s2 = false;
    let s3 = false;

    let d0 = false;
    let d1 = false;
    let d2 = false;
    let d3 = false;

    // ↑
    if (this.isWalkableAt(x, y - 1)) {
      neighbors.push(this.nodes[x]![y - 1]!);
      s0 = true;
    }

    // →
    if (this.isWalkableAt(x + 1, y)) {
      neighbors.push(this.nodes[x + 1]![y]!);
      s1 = true;
    }

    // ↓
    if (this.isWalkableAt(x, y + 1)) {
      neighbors.push(this.nodes[x]![y + 1]!);
      s2 = true;
    }

    // ←
    if (this.isWalkableAt(x - 1, y)) {
      neighbors.push(this.nodes[x - 1]![y]!);
      s3 = true;
    }

    if (diagonalMovement === DiagonalMovement.Never) {
      return neighbors;
    }

    if (diagonalMovement === DiagonalMovement.OnlyWhenNoObstacles) {
      d0 = s3 && s0;
      d1 = s0 && s1;
      d2 = s1 && s2;
      d3 = s2 && s3;
    } else if (diagonalMovement === DiagonalMovement.IfAtMostOneObstacle) {
      d0 = s3 || s0;
      d1 = s0 || s1;
      d2 = s1 || s2;
      d3 = s2 || s3;
    } else if (diagonalMovement === DiagonalMovement.Always) {
      d0 = true;
      d1 = true;
      d2 = true;
      d3 = true;
    }

    // ↖
    if (d0 && this.isWalkableAt(x - 1, y - 1)) {
      neighbors.push(this.nodes[x - 1]![y - 1]!);
    }

    // ↗
    if (d1 && this.isWalkableAt(x + 1, y - 1)) {
      neighbors.push(this.nodes[x + 1]![y - 1]!);
    }

    // ↘
    if (d2 && this.isWalkableAt(x + 1, y + 1)) {
      neighbors.push(this.nodes[x + 1]![y + 1]!);
    }

    // ↙
    if (d3 && this.isWalkableAt(x - 1, y + 1)) {
      neighbors.push(this.nodes[x - 1]![y + 1]!);
    }

    return neighbors;
  }

  reset(): void {
    for (const row of this.nodes) {
      for (const node of row) {
        node.parent = undefined;
        node.f = 0;
        node.g = 0;
        node.h = 0;
        node.opened = false;
        node.closed = false;
      }
    }
  }
}
