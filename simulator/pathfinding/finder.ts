import Grid from "./grid";
import Node from "./node";
import Heap from "heap"; // todo: remove dependency.
import DiagonalMovement from "./diagonalMovement";
import { Heuristic, Heuristics } from "./heuristics";

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
