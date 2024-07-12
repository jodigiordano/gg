import Heap from "heap"; // todo: remove dependency.

enum NodeState {
  NotVisited = 1,
  WillVisit = 2,
  Visited = 3,
}

interface Node {
  // Invariant properties.
  x: number;
  y: number;
  weight: number;

  // Variant properties set when finding a path between two nodes.
  parent: Node | undefined;
  priority: number;
  costToVisit: number;
  distanceToEnd: number;
  state: NodeState;
}

export function findPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  grid: Grid,
): number[][] {
  // Initialize the search.
  const startNode = grid.getNodeAt(startX, startY);
  const endNode = grid.getNodeAt(endX, endY);

  const openList = new Heap(
    (nodeA: Node, nodeB: Node) => nodeA.priority - nodeB.priority,
  );

  startNode.priority = 0;
  startNode.costToVisit = 0;

  // Search start at the "start" node.
  startNode.state = NodeState.WillVisit;

  openList.push(startNode);

  while (!openList.empty()) {
    // Pop the position of node which has the minimum "f" value.
    const node = openList.pop() as Node;

    node.state = NodeState.Visited;

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
    const neighbors = grid.getNeighborsAt(node.x, node.y);

    for (const neighbor of neighbors) {
      if (neighbor.state === NodeState.Visited) {
        continue;
      }

      const x = neighbor.x;
      const y = neighbor.y;

      // Get the distance between current node and the neighbor
      // and calculate the next "g" score.
      let nextCostToVisit =
        node.costToVisit +
        (x - node.x === 0 || y - node.y === 0 ? 1 : Math.SQRT2);

      nextCostToVisit *= neighbor.weight;

      // To avoid a "staircase" effect, add a "turn penalty" when the
      // direction changes.
      const lastDirection =
        node.parent === undefined
          ? undefined
          : { x: node.x - node.parent.x, y: node.y - node.parent.y };

      const hasTurned =
        lastDirection !== undefined &&
        (lastDirection.x !== x - node.x || lastDirection.y !== y - node.y);

      if (hasTurned) {
        nextCostToVisit += 1; // penalty cost to turn.
      }

      // Check if the neighbor has not been inspected yet, or
      // can be reached with smaller cost from the current node.
      if (
        neighbor.state !== NodeState.WillVisit ||
        nextCostToVisit < neighbor.costToVisit
      ) {
        neighbor.costToVisit = nextCostToVisit;

        neighbor.distanceToEnd =
          neighbor.distanceToEnd ||
          // Manhattan distance.
          Math.abs(x - endX) + Math.abs(y - endY);

        neighbor.priority = neighbor.costToVisit + neighbor.distanceToEnd;
        neighbor.parent = node;

        if (neighbor.state !== NodeState.WillVisit) {
          neighbor.state = NodeState.WillVisit;
          openList.push(neighbor);
        } else {
          // The neighbor can be reached with smaller cost.
          // Since its "f" value has been updated, we have to
          // update its position in the open list.
          openList.updateItem(neighbor);
        }
      }
    }
  }

  // No path found.
  return [];
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
          priority: 0,
          costToVisit: 0,
          distanceToEnd: 0,
          state: NodeState.NotVisited,
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

  getNeighborsAt(x: number, y: number): Node[] {
    const neighbors: Node[] = [];

    if (this.isWalkableAt(x, y - 1)) {
      neighbors.push(this.nodes[x]![y - 1]!);
    }

    if (this.isWalkableAt(x + 1, y)) {
      neighbors.push(this.nodes[x + 1]![y]!);
    }

    if (this.isWalkableAt(x, y + 1)) {
      neighbors.push(this.nodes[x]![y + 1]!);
    }

    if (this.isWalkableAt(x - 1, y)) {
      neighbors.push(this.nodes[x - 1]![y]!);
    }

    return neighbors;
  }

  reset(): void {
    for (const row of this.nodes) {
      for (const node of row) {
        node.parent = undefined;
        node.priority = 0;
        node.costToVisit = 0;
        node.distanceToEnd = 0;
        node.state = NodeState.NotVisited;
      }
    }
  }
}
