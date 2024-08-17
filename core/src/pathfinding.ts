import { PathfindingWeights } from "./consts";

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

  startNode.priority = 0;
  startNode.costToVisit = 0;

  // Search start at the "start" node.
  startNode.state = NodeState.WillVisit;

  const nodesToVisit = [startNode];

  while (nodesToVisit.length) {
    // Get the next node to visit with the highest priority.
    const node = nodesToVisit.pop() as Node;

    node.state = NodeState.Visited;

    // We reached the end node => stop processing.
    if (node === endNode) {
      let nodeInPath = node;

      const path: number[][] = [[nodeInPath.x, nodeInPath.y]];

      while (nodeInPath.parent) {
        nodeInPath = nodeInPath.parent;
        path.push([nodeInPath.x, nodeInPath.y]);
      }

      return path.reverse();
    }

    // Get the neigbours of the current node.
    const neighbors = grid.getNeighborsAt(node.x, node.y);

    for (const neighbor of neighbors) {
      if (neighbor.state === NodeState.Visited) {
        continue;
      }

      const x = neighbor.x;
      const y = neighbor.y;

      // Calculate the cost to visit the neighbor.
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
        nextCostToVisit += PathfindingWeights.MakeATurn;
      }

      // Visit the neighbor if it wasn't done before OR
      // if the cost to visit it is lower than before.
      if (
        neighbor.state !== NodeState.WillVisit ||
        nextCostToVisit < neighbor.costToVisit
      ) {
        neighbor.costToVisit = nextCostToVisit;

        // Calculate the approximated distance to reach the end node.
        neighbor.distanceToEnd =
          neighbor.distanceToEnd ||
          // Approximation algorithm: manhattan distance.
          Math.abs(x - endX) + Math.abs(y - endY);

        // Calculate the priority of the neighbor.
        neighbor.priority = neighbor.costToVisit + neighbor.distanceToEnd;

        // Keep the parent to:
        //
        // 1. Construct the path when the end node is reached (breadcrumb).
        // 2. Determine if we turned along the way (turn penalty).
        neighbor.parent = node;

        // Add a new node to visit.
        if (neighbor.state !== NodeState.WillVisit) {
          neighbor.state = NodeState.WillVisit;

          insertSorted(nodesToVisit, neighbor);

          // Update an existing node previously visited.
        } else {
          nodesToVisit.splice(nodesToVisit.indexOf(neighbor), 1);
          neighbor.state = NodeState.WillVisit;

          insertSorted(nodesToVisit, neighbor);
        }
      }
    }
  }

  // No path found.
  return [];
}

function insertSorted(nodes: Node[], node: Node): void {
  let indexLow = 0;
  let indexHigh = nodes.length;

  while (indexLow < indexHigh) {
    const indexMiddle = Math.floor((indexLow + indexHigh) / 2);

    if (nodes[indexMiddle]!.priority > node.priority) {
      indexLow = indexMiddle + 1;
    } else {
      indexHigh = indexMiddle;
    }
  }

  nodes.splice(indexLow, 0, node);
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

  addWeightAt(x: number, y: number, weight: number): void {
    this.nodes[x]![y]!.weight += weight;
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
