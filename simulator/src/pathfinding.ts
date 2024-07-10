import Heap from "heap"; // todo: remove dependency.

export interface FinderOptions {
  // Allowed diagonal movement.
  // Default: never.
  diagonalMovement?: DiagonalMovement;
  // Heuristic function to estimate the distance.
  // Default: manhattan.
  heuristic?: Heuristic;
  // Weight to apply to the heuristic to allow for
  // suboptimal paths, in order to speed up the search.
  // Default: 1.
  weight?: number;
  // Add penalties to discourage turning and causing a 'staircase' effect.
  // Default: false.
  avoidStaircase?: boolean;
  // Penalty to add to turning. Higher numbers discourage turning more.
  // Default: 1.
  turnPenalty?: number;
}

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

enum DiagonalMovement {
  Always = 1,
  Never = 2,
  IfAtMostOneObstacle = 3,
  OnlyWhenNoObstacles = 4,
}

// A collection of heuristic functions.
type Heuristic = (dx: number, dy: number) => number;

const Heuristics = {
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

export class PathFinder {
  private diagonalMovement: DiagonalMovement;
  private heuristic: Heuristic;
  private weight: number;
  private avoidStaircase: boolean;
  private turnPenalty: number;

  constructor(options: FinderOptions = {}) {
    // this.allowDiagonal = options.allowDiagonal;
    // this.dontCrossCorners = options.dontCrossCorners;
    this.diagonalMovement = options.diagonalMovement ?? DiagonalMovement.Never;
    this.heuristic = options.heuristic ?? Heuristics.manhattan;
    this.weight = options.weight ?? 1;
    this.avoidStaircase = options.avoidStaircase ?? true;
    this.turnPenalty = options.turnPenalty ?? 1;

    // When diagonal movement is allowed the manhattan heuristic is not
    // admissible. It should be octile instead.
    if (this.diagonalMovement === DiagonalMovement.Never) {
      this.heuristic = options.heuristic ?? Heuristics.octile;
    }
  }

  findPath(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    grid: Grid,
  ): number[][] {
    const startNode = grid.getNodeAt(startX, startY);
    const endNode = grid.getNodeAt(endX, endY);

    const openList = new Heap((nodeA: Node, nodeB: Node) => nodeA.f - nodeB.f);

    // set the `g` and `f` value of the start node to be 0
    startNode.f = 0;
    startNode.g = 0;

    // Start searching from the start node.
    startNode.opened = true;

    openList.push(startNode);

    while (!openList.empty()) {
      // Pop the position of node which has the minimum "f" value.
      const node = openList.pop() as Node;

      node.closed = true;

      // If reached the end position, construct the path and return it.
      if (node === endNode) {
        let pathNode = node;

        const path: number[][] = [[pathNode.x, pathNode.y]];

        while (pathNode.parent) {
          pathNode = pathNode.parent;
          path.push([pathNode.x, pathNode.y]);
        }

        return path.reverse();
      }

      // Get neigbours of the current node.
      const neighbors = grid.getNeighbors(node, this.diagonalMovement);

      for (const neighbor of neighbors) {
        if (neighbor.closed) {
          continue;
        }

        const x = neighbor.x;
        const y = neighbor.y;

        // Get the distance between current node and the neighbor
        // and calculate the next "g" score.
        let nextG =
          node.g + (x - node.x === 0 || y - node.y === 0 ? 1 : Math.SQRT2);

        nextG *= neighbor.weight;

        // If we're avoiding staircasing,
        // add penalties if the direction will change.
        if (this.avoidStaircase) {
          const lastDirection =
            node.parent === undefined
              ? undefined
              : { x: node.x - node.parent.x, y: node.y - node.parent.y };

          const turned =
            lastDirection === undefined
              ? 0
              : lastDirection.x !== x - node.x || lastDirection.y !== y - node.y
                ? 1
                : 0;

          nextG += this.turnPenalty * turned;
        }

        // Check if the neighbor has not been inspected yet, or
        // can be reached with smaller cost from the current node.
        if (!neighbor.opened || nextG < neighbor.g) {
          neighbor.g = nextG;
          neighbor.h =
            neighbor.h ||
            this.weight *
              this.heuristic(Math.abs(x - endX), Math.abs(y - endY));
          neighbor.f = neighbor.g + neighbor.h;
          neighbor.parent = node;

          if (!neighbor.opened) {
            openList.push(neighbor);
            neighbor.opened = true;
          } else {
            // The neighbor can be reached with smaller cost.
            // Since its "f" value has been updated, we have to
            // update its position in the open list.
            openList.updateItem(neighbor);
          }
        }
      }
    }

    // Fail to find the path.
    return [];
  }
}

export class Grid {
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
