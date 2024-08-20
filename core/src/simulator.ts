import { Grid as PathFinderGrid, findPath } from "./pathfinding.js";
import {
  RuntimeSystem,
  RuntimeSubsystem,
  RuntimeLink,
  RuntimePosition,
} from "./runtime.js";
import {
  PaddingWhiteBox,
  SystemMargin,
  PathfindingWeights,
} from "./helpers.js";

export enum SimulatorObjectType {
  System = 1,
  SystemTitle = 2,
  Link = 3,
  LinkTitle = 4,
  LinkTitleContainer = 5,
}

export enum SimulatorObjectZIndex {
  System = 0,
  SystemTitle = 1,
  Link = 100,
  LinkTitleContainer = 500,
  LinkTitle = 501,
}

export enum SimulatorLinkDirectionType {
  TopToLeft = 1,
  TopToBottom = 2,
  TopToRight = 3,
  LeftToTop = 4,
  LeftToRight = 5,
  LeftToBottom = 6,
  RightToTop = 7,
  RightToLeft = 8,
  RightToBottom = 9,
  BottomToLeft = 10,
  BottomToTop = 11,
  BottomToRight = 12,
}

export enum SimulatorLinkPathPosition {
  Start = 1,
  Middle = 2,
  End = 3,
}

export enum SimulatorDirectionType {
  TopLeft = 1,
  TopCenter = 2,
  TopRight = 3,
  CenterLeft = 4,
  CenterCenter = 5,
  CenterRight = 6,
  BottomLeft = 7,
  BottomCenter = 8,
  BottomRight = 9,
}

export interface SimulatorObject {
  type: SimulatorObjectType;
  zIndex: number;
}

export interface SimulatorSubsystem extends SimulatorObject {
  type: SimulatorObjectType.System;
  system: RuntimeSubsystem;
  direction: SimulatorDirectionType;
  blackbox: boolean;
}

export interface SimulatorSystemTitle extends SimulatorObject {
  type: SimulatorObjectType.SystemTitle;
  system: RuntimeSubsystem;
  blackbox: boolean;
  chars: string;
}

export interface SimulatorLink extends SimulatorObject {
  type: SimulatorObjectType.Link;
  direction: SimulatorLinkDirectionType;
  pathPosition: SimulatorLinkPathPosition;
  link: RuntimeLink;
}

export interface SimulatorLinkTitle extends SimulatorObject {
  type: SimulatorObjectType.LinkTitle;
  link: RuntimeLink;
  chars: string;
}

export interface SimulatorLinkTitleContainer extends SimulatorObject {
  type: SimulatorObjectType.LinkTitleContainer;
  direction: SimulatorDirectionType;
  link: RuntimeLink;
}

export interface SimulatorBoundaries {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  translateX: number;
  translateY: number;
}

interface GridSystem {
  id: string;

  /* Left position in a 2D grid. Always >= 0. */
  x1: number;

  /* Right position in a 2D grid. Always >= 0. */
  x2: number;

  /* Y position in a 2D grid. Always >= 0. */
  y1: number;

  /* Bottom position in a 2D grid. Always >= 0. */
  y2: number;

  /* X position in an infinite grid. Can be ]-inf, inf[. */
  worldX: number;

  /* Y position in an infinite grid. Can be ]-inf, inf[. */
  worldY: number;

  width: number;
  height: number;
  title: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export class SystemSimulator {
  private system: RuntimeSystem;
  private paths: Record<string, Record<string, number[][]>>;
  private gridSystems: Record<string, GridSystem>;
  private grid: SimulatorObject[][][];
  private boundaries: SimulatorBoundaries;

  constructor(options: {
    system: RuntimeSystem;
    paths?: Record<string, Record<string, number[][]>>;
    gridSystems?: Record<string, GridSystem>;
    grid?: SimulatorObject[][][];
    boundaries?: SimulatorBoundaries;
  }) {
    this.system = options.system;
    this.paths = options.paths ?? {};
    this.gridSystems = options.gridSystems ?? {};
    this.grid = options.grid ?? [];
    this.boundaries = options.boundaries ?? this.computeBoundaries();
  }

  compute(): void {
    // Compute grid systems. Part I.
    this.initializeSystems(this.system);
    this.computeSystemWorldPositions(this.system);
    this.computeSystemSizes(this.system);

    // Compute boundaries.
    this.boundaries = this.computeBoundaries();

    // Compute grid systems. Part II.
    // Requires sizes & boundaries.
    this.computeSystemPositions();

    // Compute grid systems. Part III.
    // Requires positions.
    this.computeSystemTitles(this.system);

    // Create grid.
    this.grid = new Array(this.boundaries.height);

    for (let i = 0; i < this.boundaries.width; i++) {
      this.grid[i] = Array.from({ length: this.boundaries.height }, () => []);
    }

    // Create path finder (routing) grid.
    const finderGrid = new PathFinderGrid(
      this.boundaries.width,
      this.boundaries.height,
      PathfindingWeights.EmptySpace,
    );

    // Draw grid objects.
    this.drawSubsystems(this.system, finderGrid);
    this.drawLinks(this.system, finderGrid);

    this.synchronizeRuntimeObjects(this.system);
  }

  getSystem(): RuntimeSystem {
    return this.system;
  }

  getLayout(): SimulatorObject[][][] {
    return this.grid;
  }

  getBoundaries(): SimulatorBoundaries {
    return this.boundaries;
  }

  // Get the boundaries of the visible system,
  // once it has been drawn on the grid.
  // i.e. a rectangle that encompass all sub-systems, links, etc.
  getVisibleWorldBoundaries(): {
    left: number;
    top: number;
    right: number;
    bottom: number;
  } {
    let left = this.boundaries.width;
    let right = 0;
    let top = this.boundaries.height;
    let bottom = 0;

    for (let i = 0; i < this.boundaries.width; i++) {
      for (let j = 0; j < this.boundaries.height; j++) {
        const hasVisibleObjects = this.grid[i]![j]!.some(
          obj =>
            obj.type === SimulatorObjectType.System ||
            obj.type === SimulatorObjectType.Link ||
            obj.type === SimulatorObjectType.LinkTitleContainer,
        );

        if (!hasVisibleObjects) {
          continue;
        }

        if (i < left) {
          left = i;
        }

        if (i > right) {
          right = i;
        }

        if (j < top) {
          top = j;
        }

        if (j > bottom) {
          bottom = j;
        }
      }
    }

    // Happens when nothing is visible on the grid.
    if (left > right) {
      left = right;
    }

    if (top > bottom) {
      top = bottom;
    }

    return {
      left: left - this.boundaries.translateX,
      right: right - this.boundaries.translateX,
      top: top - this.boundaries.translateY,
      bottom: bottom - this.boundaries.translateY,
    };
  }

  getObjectsAt(worldX: number, worldY: number): SimulatorObject[] {
    const gridX = worldX + this.boundaries.translateX;
    const gridY = worldY + this.boundaries.translateY;

    return this.grid[gridX]?.[gridY] ?? [];
  }

  getSubsystemAt(worldX: number, worldY: number): RuntimeSubsystem | null {
    const objects = this.getObjectsAt(worldX, worldY);

    // Traverse the objects from bottom to top first to detect a blackbox.
    for (const obj of objects) {
      if ("blackbox" in obj && obj.blackbox) {
        return (obj as SimulatorSubsystem).system;
      }
    }

    // Traverse the objects from top to bottom to detect a whitebox.
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i]!;

      if (
        obj.type === SimulatorObjectType.System ||
        obj.type === SimulatorObjectType.SystemTitle
      ) {
        return (obj as SimulatorSubsystem).system;
      }
    }

    return null;
  }

  getLinkByTitleAt(worldX: number, worldY: number): RuntimeLink | null {
    const objects = this.getObjectsAt(worldX, worldY);

    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i]!;

      if (
        obj.type === SimulatorObjectType.LinkTitleContainer ||
        obj.type === SimulatorObjectType.LinkTitle
      ) {
        return (obj as SimulatorLink).link;
      }
    }

    return null;
  }

  getLinkAt(worldX: number, worldY: number): RuntimeLink | null {
    const objects = this.getObjectsAt(worldX, worldY);

    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i]!;

      if (obj.type === SimulatorObjectType.Link) {
        return (obj as SimulatorLink).link;
      }
    }

    return null;
  }

  getPath(fromSystemId: string, toSystemId: string): number[][] | undefined {
    return this.paths[fromSystemId]?.[toSystemId];
  }

  // Child systems in a parent system are offset
  // by padding (X, Y) and a title (Y).
  //
  // For example, in the example below, the subsystems Foo and Bar are
  // offset by { x: 1, y: 2 }
  //
  //+--------------------------+
  //| +----------------------+ | <- padding of [1, 1]
  //| | Title <- takes y: 1  | |
  //| | +-----+    +-----+   | |
  //| | | Foo |====| Bar |   | |
  //| | +-----+    +-----+   | |
  //| +----------------------+ |
  //+--------------------------+
  getParentOffset(subsystem: RuntimeSubsystem): RuntimePosition {
    return {
      x: PaddingWhiteBox,
      y:
        PaddingWhiteBox +
        subsystem.titlePosition.y +
        subsystem.titleSize.height -
        1,
    };
  }

  private initializeSystems(system: RuntimeSystem | RuntimeSubsystem): void {
    // Recursive traversal.
    for (const ss of system.systems) {
      this.initializeSystems(ss);
    }

    // Root system.
    if (!system.id) {
      return;
    }

    // Initialize system.
    const gridSystem: GridSystem = {
      id: system.id,
      x1: -1,
      x2: -1,
      y1: -1,
      y2: -1,
      worldX: -1,
      worldY: -1,
      width: -1,
      height: -1,
      title: {
        x: -1,
        y: -1,
        width: -1,
        height: -1,
      },
    };

    this.gridSystems[system.id] = gridSystem;
  }

  private computeSystemWorldPositions(
    system: RuntimeSystem | RuntimeSubsystem,
  ): void {
    const gridSystem = system.id
      ? this.gridSystems[system.id]!
      : { worldX: 0, worldY: 0 };

    for (const ss of system.systems) {
      const ssGridSystem = this.gridSystems[ss.id]!;

      ssGridSystem.worldX = gridSystem.worldX + ss.position.x;
      ssGridSystem.worldY = gridSystem.worldY + ss.position.y;

      if (system.id) {
        const offset = this.getParentOffset(system);

        ssGridSystem.worldX += offset.x;
        ssGridSystem.worldY += offset.y;
      }

      // Recursive traversal.
      this.computeSystemWorldPositions(ss);
    }
  }

  private computeSystemPositions(): void {
    for (const obj of Object.values(this.gridSystems)) {
      obj.x1 = obj.worldX + this.boundaries.translateX;
      obj.x2 = obj.x1 + obj.width - 1;
      obj.y1 = obj.worldY + this.boundaries.translateY;
      obj.y2 = obj.y1 + obj.height - 1;
    }
  }

  private computeSystemSizes(system: RuntimeSystem | RuntimeSubsystem): void {
    for (const ss of system.systems) {
      // Recursive traversal.
      this.computeSystemSizes(ss);
    }

    // Root system.
    if (!system.id) {
      return;
    }

    const gridSystem = this.gridSystems[system.id]!;

    gridSystem.width = system.size.width;
    gridSystem.height = system.size.height;
  }

  private computeSystemTitles(system: RuntimeSystem | RuntimeSubsystem): void {
    // Recursive traversal.
    for (const ss of system.systems) {
      this.computeSystemTitles(ss);
    }

    // Root system.
    if (!system.id) {
      return;
    }

    const gridSystem = this.gridSystems[system.id]!;

    gridSystem.title = {
      x: gridSystem.x1 + system.titlePosition.x,
      y: gridSystem.y1 + system.titlePosition.y,
      width: system.titleSize.width,
      height: system.titleSize.height,
    };
  }

  private computeBoundaries(): SimulatorBoundaries {
    let left = Number.MAX_SAFE_INTEGER;
    let right = 0;
    let top = Number.MAX_SAFE_INTEGER;
    let bottom = 0;

    for (const obj of Object.values(this.gridSystems)) {
      if (obj.worldX < left) {
        left = obj.worldX;
      }

      if (obj.worldX + obj.width > right) {
        right = obj.worldX + obj.width;
      }

      if (obj.worldY < top) {
        top = obj.worldY;
      }

      if (obj.worldY + obj.height > bottom) {
        bottom = obj.worldY + obj.height;
      }
    }

    // Happens when there are no subsystems.
    if (left > right) {
      left = right;
    }

    if (top > bottom) {
      top = bottom;
    }

    // Path titles are placed centered, in the middle of a path.
    // When computing the boundaries, we don't know how the links will
    // be routed so we must be prepared for the worst case scenario.
    const maxTitleWidth = Math.max(
      ...this.system.links.map(link => link.titleSize.width),
    );

    const maxTitleHeight = Math.max(
      ...this.system.links.map(link => link.titleSize.height),
    );

    // Apply system margins.
    left -= SystemMargin * Math.max(5, Math.ceil(maxTitleWidth / 2));
    right += SystemMargin * Math.max(5, Math.ceil(maxTitleWidth / 2));
    top -= SystemMargin * Math.max(5, Math.ceil(maxTitleHeight / 2));
    bottom += SystemMargin * Math.max(5, Math.ceil(maxTitleHeight / 2));

    return {
      left,
      right,
      top,
      bottom,
      width: right - left,
      height: bottom - top,
      translateX: left < 0 ? Math.abs(left) : -left,
      translateY: top < 0 ? Math.abs(top) : -top,
    };
  }

  private getSystemPerimeterWeights(
    gridSS: GridSystem,
    finderGrid: PathFinderGrid,
  ): number[][] {
    const originals: number[][] = [];

    for (let x = gridSS.x1 - SystemMargin; x <= gridSS.x2 + SystemMargin; x++) {
      const top = gridSS.y1 - SystemMargin;
      const bottom = gridSS.y2 + SystemMargin;

      originals.push([x, top, finderGrid.getWeightAt(x, top)]);
      originals.push([x, bottom, finderGrid.getWeightAt(x, bottom)]);
    }

    for (let y = gridSS.y1 - SystemMargin; y <= gridSS.y2 + SystemMargin; y++) {
      const left = gridSS.x1 - SystemMargin;
      const right = gridSS.x2 + SystemMargin;

      originals.push([left, y, finderGrid.getWeightAt(left, y)]);
      originals.push([right, y, finderGrid.getWeightAt(right, y)]);
    }

    return originals;
  }

  private setSystemPerimeterWeights(
    gridSS: GridSystem,
    finderGrid: PathFinderGrid,
    weight: number,
  ): void {
    for (let x = gridSS.x1 - SystemMargin; x <= gridSS.x2 + SystemMargin; x++) {
      const top = gridSS.y1 - SystemMargin;
      const bottom = gridSS.y2 + SystemMargin;

      finderGrid.setWeightAt(x, top, weight);
      finderGrid.setWeightAt(x, bottom, weight);
    }

    for (let y = gridSS.y1 - SystemMargin; y <= gridSS.y2 + SystemMargin; y++) {
      const left = gridSS.x1 - SystemMargin;
      const right = gridSS.x2 + SystemMargin;

      finderGrid.setWeightAt(left, y, weight);
      finderGrid.setWeightAt(right, y, weight);
    }
  }

  private setSystemPerimeterWeightsForRouting(
    gridSS: GridSystem,
    finderGrid: PathFinderGrid,
  ): void {
    for (let x = gridSS.x1 - SystemMargin; x <= gridSS.x2 + SystemMargin; x++) {
      const top = gridSS.y1 - SystemMargin;
      const bottom = gridSS.y2 + SystemMargin;

      if (
        !this.grid[x]![top]!.some(obj => obj.type === SimulatorObjectType.Link)
      ) {
        finderGrid.setWeightAt(x, top, PathfindingWeights.SystemPerimeter);
      }

      if (
        !this.grid[x]![bottom]!.some(
          obj => obj.type === SimulatorObjectType.Link,
        )
      ) {
        finderGrid.setWeightAt(x, bottom, PathfindingWeights.SystemPerimeter);
      }
    }

    for (let y = gridSS.y1 - SystemMargin; y <= gridSS.y2 + SystemMargin; y++) {
      const left = gridSS.x1 - SystemMargin;
      const right = gridSS.x2 + SystemMargin;

      if (
        !this.grid[left]![y]!.some(obj => obj.type === SimulatorObjectType.Link)
      ) {
        finderGrid.setWeightAt(left, y, PathfindingWeights.SystemPerimeter);
      }

      if (
        !this.grid[right]![y]!.some(
          obj => obj.type === SimulatorObjectType.Link,
        )
      ) {
        finderGrid.setWeightAt(right, y, PathfindingWeights.SystemPerimeter);
      }
    }
  }

  private drawSubsystems(
    system: RuntimeSystem | RuntimeSubsystem,
    finderGrid: PathFinderGrid,
  ): void {
    for (const ss of system.systems) {
      const gridSS = this.gridSystems[ss.id]!;

      this.setSystemPerimeterWeights(
        gridSS,
        finderGrid,
        PathfindingWeights.Impenetrable,
      );

      // Sub-systems.
      const blackbox = !ss.systems.length;

      const simulatorSystem: SimulatorSubsystem = Object.freeze({
        type: SimulatorObjectType.System,
        blackbox,
        system: ss,
        direction: SimulatorDirectionType.CenterCenter,
        zIndex: SimulatorObjectZIndex.System + ss.depth,
      });

      const topLeft: SimulatorSubsystem = Object.freeze({
        type: SimulatorObjectType.System,
        blackbox,
        system: ss,
        direction: SimulatorDirectionType.TopLeft,
        zIndex: SimulatorObjectZIndex.System + ss.depth,
      });

      const topRight: SimulatorSubsystem = Object.freeze({
        type: SimulatorObjectType.System,
        blackbox,
        system: ss,
        direction: SimulatorDirectionType.TopRight,
        zIndex: SimulatorObjectZIndex.System + ss.depth,
      });

      const bottomLeft: SimulatorSubsystem = Object.freeze({
        type: SimulatorObjectType.System,
        blackbox,
        system: ss,
        direction: SimulatorDirectionType.BottomLeft,
        zIndex: SimulatorObjectZIndex.System + ss.depth,
      });

      const bottomRight: SimulatorSubsystem = Object.freeze({
        type: SimulatorObjectType.System,
        blackbox,
        system: ss,
        direction: SimulatorDirectionType.BottomRight,
        zIndex: SimulatorObjectZIndex.System + ss.depth,
      });

      const left: SimulatorSubsystem = Object.freeze({
        type: SimulatorObjectType.System,
        blackbox,
        system: ss,
        direction: SimulatorDirectionType.CenterLeft,
        zIndex: SimulatorObjectZIndex.System + ss.depth,
      });

      const right: SimulatorSubsystem = Object.freeze({
        type: SimulatorObjectType.System,
        blackbox,
        system: ss,
        direction: SimulatorDirectionType.CenterRight,
        zIndex: SimulatorObjectZIndex.System + ss.depth,
      });

      const top: SimulatorSubsystem = Object.freeze({
        type: SimulatorObjectType.System,
        blackbox,
        system: ss,
        direction: SimulatorDirectionType.TopCenter,
        zIndex: SimulatorObjectZIndex.System + ss.depth,
      });

      const bottom: SimulatorSubsystem = Object.freeze({
        type: SimulatorObjectType.System,
        blackbox,
        system: ss,
        direction: SimulatorDirectionType.BottomCenter,
        zIndex: SimulatorObjectZIndex.System + ss.depth,
      });

      if (ss.systems.length) {
        this.setSystemPerimeterWeights(
          gridSS,
          finderGrid,
          PathfindingWeights.EmptySpace,
        );
      } else {
        this.setSystemPerimeterWeights(
          gridSS,
          finderGrid,
          PathfindingWeights.Impenetrable,
        );
      }

      for (let x = gridSS.x1; x <= gridSS.x2; x++) {
        for (let y = gridSS.y1; y <= gridSS.y2; y++) {
          if (x === gridSS.x1 && y == gridSS.y1) {
            this.grid[x]![y]!.push(topLeft);
          } else if (x === gridSS.x2 && y == gridSS.y1) {
            this.grid[x]![y]!.push(topRight);
          } else if (x === gridSS.x1 && y == gridSS.y2) {
            this.grid[x]![y]!.push(bottomLeft);
          } else if (x === gridSS.x2 && y == gridSS.y2) {
            this.grid[x]![y]!.push(bottomRight);
          } else if (x === gridSS.x1) {
            this.grid[x]![y]!.push(left);
          } else if (x === gridSS.x2) {
            this.grid[x]![y]!.push(right);
          } else if (y === gridSS.y1) {
            this.grid[x]![y]!.push(top);
          } else if (y === gridSS.y2) {
            this.grid[x]![y]!.push(bottom);
          } else {
            this.grid[x]![y]!.push(simulatorSystem);
          }
        }
      }

      // Title padding.
      if (ss.systems.length && ss.title.trim().length > 0) {
        for (
          let x = gridSS.title.x - 1;
          x < gridSS.title.x + gridSS.title.width + 1;
          x++
        ) {
          for (
            let y = gridSS.title.y - 1;
            y < gridSS.title.y + gridSS.title.height + 1;
            y++
          ) {
            finderGrid.setWeightAt(x, y, PathfindingWeights.Impenetrable);
          }
        }
      }

      // Title.
      const simulatorSystemTitle: SimulatorSystemTitle = {
        type: SimulatorObjectType.SystemTitle,
        system: ss,
        blackbox,
        chars: ss.title,
        zIndex: SimulatorObjectZIndex.SystemTitle + ss.depth,
      };

      this.grid[gridSS.title.x]![gridSS.title.y]!.push(simulatorSystemTitle);

      // Recursive traversal.
      this.drawSubsystems(ss, finderGrid);
    }
  }

  private drawLinks(system: RuntimeSystem, finderGrid: PathFinderGrid): void {
    // Links with titles are drawn first, as the titles are placed on the grid
    // and other links must avoid going through them.
    const sortedLinks = system.links
      .slice(0)
      .sort((a, b) => b.title.length - a.title.length);

    for (let linkIndex = 0; linkIndex < sortedLinks.length; linkIndex++) {
      const link = sortedLinks[linkIndex]!;

      const subsystemA = this.gridSystems[link.a]!;
      const subsystemB = this.gridSystems[link.b]!;

      // Allowed systems to be traversed by the path from A to B. Part I.
      //
      // The path from A to B may needs to traverse whiteboxes.
      // Here we say that only certain whiteboxes can be traversed.
      //
      // For example, for the path A.X to B,
      // we don't want the path to go through A.Y.
      //
      // To deny traversing systems, we momentarily set an impenetrable
      // perimeter around them.
      const allowedSystems: string[] = [link.a, link.b];

      // Allow the parents of A.
      let parent: RuntimeSystem | RuntimeSubsystem | undefined =
        link.systemA.parent;

      while (parent?.id) {
        allowedSystems.push(parent.id);

        parent = parent.parent;
      }

      // Allow the parents of B.
      parent = link.systemB.parent;

      while (parent?.id) {
        allowedSystems.push(parent.id);

        parent = parent.parent;
      }

      const allowedSystemPerimeters = [];

      // Set the perimeters for parents.
      for (const gridSS of Object.values(this.gridSystems)) {
        if (!allowedSystems.includes(gridSS.id)) {
          allowedSystemPerimeters.push(
            this.getSystemPerimeterWeights(gridSS, finderGrid),
          );

          this.setSystemPerimeterWeights(
            gridSS,
            finderGrid,
            PathfindingWeights.Impenetrable,
          );
        }
      }

      // Open the perimeter around A & B so a link can be found between
      // the center of A and the center of B.
      allowedSystemPerimeters.push(
        this.getSystemPerimeterWeights(subsystemA, finderGrid),
      );

      this.setSystemPerimeterWeightsForRouting(subsystemA, finderGrid);

      allowedSystemPerimeters.push(
        this.getSystemPerimeterWeights(subsystemB, finderGrid),
      );

      this.setSystemPerimeterWeightsForRouting(subsystemB, finderGrid);

      finderGrid.reset();

      // Find the path from the cener of A to the center of B.
      const centerA = {
        x: subsystemA.x1 + ((subsystemA.width / 2) | 0),
        y: subsystemA.y1 + ((subsystemA.height / 2) | 0),
      };

      const centerB = {
        x: subsystemB.x1 + ((subsystemB.width / 2) | 0),
        y: subsystemB.y1 + ((subsystemB.height / 2) | 0),
      };

      const path = findPath(
        centerA.x,
        centerA.y,
        centerB.x,
        centerB.y,
        finderGrid,
      );

      if (path.length) {
        // Shorten the path. Part I.
        //
        // The path between A and B is shorten so it starts at the edge
        // of A and ends at the edge of B.
        //
        // In this first part, we simply find how many segments of the path
        // are inside A and B.
        //
        // The shortening of the path will be done later.
        let insideACount = 0;

        for (let i = 0; i < path.length; i++) {
          const x = path[i]![0]!;
          const y = path[i]![1]!;

          const isInside = this.grid[x]![y]!.some(
            obj =>
              obj.type === SimulatorObjectType.System &&
              (obj as SimulatorSubsystem).system.id === link.a,
          );

          if (!isInside) {
            break;
          }

          insideACount++;
        }

        let insideBCount = 0;

        for (let i = path.length - 1; i > 0; i--) {
          const x = path[i]![0]!;
          const y = path[i]![1]!;

          const isInside = this.grid[x]![y]!.some(
            obj =>
              obj.type === SimulatorObjectType.System &&
              (obj as SimulatorSubsystem).system.id === link.b,
          );

          if (!isInside) {
            break;
          }

          insideBCount++;
        }

        // Draw the path segments.
        const leftToRight: SimulatorLink = Object.freeze({
          type: SimulatorObjectType.Link,
          direction: SimulatorLinkDirectionType.LeftToRight,
          link,
          pathPosition: SimulatorLinkPathPosition.Middle,
          zIndex: SimulatorObjectZIndex.Link + linkIndex,
        });

        const rightToLeft: SimulatorLink = Object.freeze({
          type: SimulatorObjectType.Link,
          direction: SimulatorLinkDirectionType.RightToLeft,
          link,
          pathPosition: SimulatorLinkPathPosition.Middle,
          zIndex: SimulatorObjectZIndex.Link + linkIndex,
        });

        const rightToTop: SimulatorLink = Object.freeze({
          type: SimulatorObjectType.Link,
          direction: SimulatorLinkDirectionType.RightToTop,
          link,
          pathPosition: SimulatorLinkPathPosition.Middle,
          zIndex: SimulatorObjectZIndex.Link + linkIndex,
        });

        const topToBottom: SimulatorLink = Object.freeze({
          type: SimulatorObjectType.Link,
          direction: SimulatorLinkDirectionType.TopToBottom,
          link,
          pathPosition: SimulatorLinkPathPosition.Middle,
          zIndex: SimulatorObjectZIndex.Link + linkIndex,
        });

        const bottomToTop: SimulatorLink = Object.freeze({
          type: SimulatorObjectType.Link,
          direction: SimulatorLinkDirectionType.BottomToTop,
          link,
          pathPosition: SimulatorLinkPathPosition.Middle,
          zIndex: SimulatorObjectZIndex.Link + linkIndex,
        });

        const bottomToRight: SimulatorLink = Object.freeze({
          type: SimulatorObjectType.Link,
          direction: SimulatorLinkDirectionType.BottomToRight,
          link,
          pathPosition: SimulatorLinkPathPosition.Middle,
          zIndex: SimulatorObjectZIndex.Link + linkIndex,
        });

        const bottomToLeft: SimulatorLink = Object.freeze({
          type: SimulatorObjectType.Link,
          direction: SimulatorLinkDirectionType.BottomToLeft,
          link,
          pathPosition: SimulatorLinkPathPosition.Middle,
          zIndex: SimulatorObjectZIndex.Link + linkIndex,
        });

        const topToLeft: SimulatorLink = Object.freeze({
          type: SimulatorObjectType.Link,
          direction: SimulatorLinkDirectionType.TopToLeft,
          link,
          pathPosition: SimulatorLinkPathPosition.Middle,
          zIndex: SimulatorObjectZIndex.Link + linkIndex,
        });

        const topToRight: SimulatorLink = Object.freeze({
          type: SimulatorObjectType.Link,
          direction: SimulatorLinkDirectionType.TopToRight,
          link,
          pathPosition: SimulatorLinkPathPosition.Middle,
          zIndex: SimulatorObjectZIndex.Link + linkIndex,
        });

        const leftToBottom: SimulatorLink = Object.freeze({
          type: SimulatorObjectType.Link,
          direction: SimulatorLinkDirectionType.LeftToBottom,
          link,
          pathPosition: SimulatorLinkPathPosition.Middle,
          zIndex: SimulatorObjectZIndex.Link + linkIndex,
        });

        const rightToBottom: SimulatorLink = Object.freeze({
          type: SimulatorObjectType.Link,
          direction: SimulatorLinkDirectionType.RightToBottom,
          link,
          pathPosition: SimulatorLinkPathPosition.Middle,
          zIndex: SimulatorObjectZIndex.Link + linkIndex,
        });

        const leftToTop: SimulatorLink = Object.freeze({
          type: SimulatorObjectType.Link,
          direction: SimulatorLinkDirectionType.LeftToTop,
          link,
          pathPosition: SimulatorLinkPathPosition.Middle,
          zIndex: SimulatorObjectZIndex.Link + linkIndex,
        });

        for (let i = insideACount; i < path.length - insideBCount; i++) {
          const [x, y] = path[i]!;

          const blackbox = this.grid[x!]![y!]!.find(
            obj => "blackbox" in obj && obj.blackbox,
          );

          // The link part is inside a blackbox.
          if (blackbox) {
            // this.grid[x!]![y!]!.push(blackbox);
            continue;
          }

          const pathPosition =
            i === insideACount
              ? SimulatorLinkPathPosition.Start
              : i === path.length - insideBCount - 1
                ? SimulatorLinkPathPosition.End
                : SimulatorLinkPathPosition.Middle;

          const xBefore = path[i - 1]![0]!;
          const yBefore = path[i - 1]![1]!;

          const xAfter = path[i + 1]![0]!;
          const yAfter = path[i + 1]![1]!;

          // ...    ...
          // B■A or A■B
          // ...    ...
          if (yBefore === y && yAfter === y) {
            if (xBefore < xAfter) {
              this.grid[x!]![y!]!.push({
                ...leftToRight,
                pathPosition,
              } as SimulatorLink);
            } else {
              this.grid[x!]![y!]!.push({
                ...rightToLeft,
                pathPosition,
              } as SimulatorLink);
            }

            // .B.    .A.
            // .■. or .■.
            // .A.    .B.
          } else if (xBefore === x && xAfter === x) {
            if (yBefore < yAfter) {
              this.grid[x!]![y!]!.push({
                ...topToBottom,
                pathPosition,
              } as SimulatorLink);
            } else {
              this.grid[x!]![y!]!.push({
                ...bottomToTop,
                pathPosition,
              } as SimulatorLink);
            }

            // ...
            // .■A
            // .B.
          } else if (
            xBefore === x &&
            yBefore > y! &&
            xAfter > x! &&
            yAfter === y
          ) {
            this.grid[x!]![y!]!.push({
              ...leftToBottom,
              pathPosition,
            } as SimulatorLink);

            // ...
            // .■B
            // .A.
          } else if (
            yBefore === y &&
            xBefore > x! &&
            yAfter > y! &&
            xAfter === x
          ) {
            this.grid[x!]![y!]!.push({
              ...bottomToRight,
              pathPosition,
            } as SimulatorLink);

            // ...
            // .A■
            // ..B
          } else if (
            xBefore < x! &&
            yBefore === y &&
            xAfter === x &&
            yAfter > y!
          ) {
            this.grid[x!]![y!]!.push({
              ...rightToBottom,
              pathPosition,
            } as SimulatorLink);

            // ...
            // ..A
            // .B■
          } else if (
            yBefore > y! &&
            xBefore === x &&
            yAfter === y &&
            xAfter < x!
          ) {
            this.grid[x!]![y!]!.push({
              ...bottomToLeft,
              pathPosition,
            } as SimulatorLink);

            // ...
            // .B■
            // ..A
          } else if (
            xBefore === x &&
            yBefore < y! &&
            xAfter < x! &&
            yAfter === y
          ) {
            this.grid[x!]![y!]!.push({
              ...topToLeft,
              pathPosition,
            } as SimulatorLink);

            // ...
            // ..B
            // .A■
          } else if (
            yBefore === y &&
            xBefore < x! &&
            yAfter < y! &&
            xAfter === x
          ) {
            this.grid[x!]![y!]!.push({
              ...rightToTop,
              pathPosition,
            } as SimulatorLink);

            // ...
            // .A.
            // .■B
          } else if (
            yBefore < y! &&
            xBefore === x &&
            yAfter === y &&
            xAfter > x!
          ) {
            this.grid[x!]![y!]!.push({
              ...topToRight,
              pathPosition,
            } as SimulatorLink);

            // ...
            // .B.
            // .■A
          } else if (
            xBefore > x! &&
            yBefore === y &&
            xAfter === x &&
            yAfter < y!
          ) {
            this.grid[x!]![y!]!.push({
              ...leftToTop,
              pathPosition,
            } as SimulatorLink);
          }
        }

        // Shorten the path. Part II.
        path.splice(0, insideACount);
        path.splice(path.length - insideBCount, insideBCount);

        // The path and its reverse sibling are kept for future use (ie. flows).
        this.paths[link.a] ??= {};
        this.paths[link.a]![link.b] = path;

        this.paths[link.b] ??= {};
        this.paths[link.b]![link.a] = path.slice().reverse();

        // Draw the link title.
        if (link.title.length > 0) {
          const topLeft: SimulatorLinkTitleContainer = Object.freeze({
            type: SimulatorObjectType.LinkTitleContainer,
            link,
            direction: SimulatorDirectionType.TopLeft,
            zIndex: SimulatorObjectZIndex.LinkTitleContainer + linkIndex,
          });

          const topRight: SimulatorLinkTitleContainer = Object.freeze({
            type: SimulatorObjectType.LinkTitleContainer,
            link,
            direction: SimulatorDirectionType.TopRight,
            zIndex: SimulatorObjectZIndex.LinkTitleContainer + linkIndex,
          });

          const bottomLeft: SimulatorLinkTitleContainer = Object.freeze({
            type: SimulatorObjectType.LinkTitleContainer,
            link,
            direction: SimulatorDirectionType.BottomLeft,
            zIndex: SimulatorObjectZIndex.LinkTitleContainer + linkIndex,
          });

          const bottomRight: SimulatorLinkTitleContainer = Object.freeze({
            type: SimulatorObjectType.LinkTitleContainer,
            link,
            direction: SimulatorDirectionType.BottomRight,
            zIndex: SimulatorObjectZIndex.LinkTitleContainer + linkIndex,
          });

          const left: SimulatorLinkTitleContainer = Object.freeze({
            type: SimulatorObjectType.LinkTitleContainer,
            link,
            direction: SimulatorDirectionType.CenterLeft,
            zIndex: SimulatorObjectZIndex.LinkTitleContainer + linkIndex,
          });

          const right: SimulatorLinkTitleContainer = Object.freeze({
            type: SimulatorObjectType.LinkTitleContainer,
            link,
            direction: SimulatorDirectionType.CenterRight,
            zIndex: SimulatorObjectZIndex.LinkTitleContainer + linkIndex,
          });

          const top: SimulatorLinkTitleContainer = Object.freeze({
            type: SimulatorObjectType.LinkTitleContainer,
            link,
            direction: SimulatorDirectionType.TopCenter,
            zIndex: SimulatorObjectZIndex.LinkTitleContainer + linkIndex,
          });

          const bottom: SimulatorLinkTitleContainer = Object.freeze({
            type: SimulatorObjectType.LinkTitleContainer,
            link,
            direction: SimulatorDirectionType.BottomCenter,
            zIndex: SimulatorObjectZIndex.LinkTitleContainer + linkIndex,
          });

          const center: SimulatorLinkTitleContainer = Object.freeze({
            type: SimulatorObjectType.LinkTitleContainer,
            link,
            direction: SimulatorDirectionType.CenterCenter,
            zIndex: SimulatorObjectZIndex.LinkTitleContainer + linkIndex,
          });

          // Unfortunately, link titles may collide with subsystems, due to the
          // fact that they require links to be routed, and this routing is done
          // automatically for the user, in this "draw stuff on the grid" phase.
          //
          // To detect and resolve collisions between subsystems and link
          // titles, we would need to do it way before, when the user is placing
          // subsystems and links on the canvas. We would need to move the
          // link routing in the "collisions detection" system, probably route
          // and re-route links multiple times, as we detect collisions, then
          // save all the route information in the specification, so this code
          // here can draw routes exactly as they were computed while resolving
          // collisions. I spent a lot of time thinking about that one and I
          // can't think of a cheap way to do it. I did prototype a solution
          // where I treated a link title Z as a subsystem, make it go through
          // the collisions detection system, and then route the link
          // from A to Z, then Z to B but... the results were horrendous.
          //
          // Anyway, here's the cheap solution:
          //
          // We place the link title in the middle of the path. We then spend a
          // small amount of CPU cycles to detect collisions with subsystems.
          // When we find a collision, we move the link title a little bit
          // alongside the link path.
          //
          let pathSegment: number[] | undefined;
          let x1: number = 0;
          let y1: number = 0;
          let x2: number = 0;
          let y2: number = 0;

          let iterations = 0;
          let offset = 0;
          let colliding = false;

          do {
            pathSegment = path.at(Math.floor(path.length / 2) + offset);

            if (pathSegment) {
              x1 = pathSegment[0]! - Math.ceil(link.titleSize.width / 2);
              y1 = pathSegment[1]! - Math.ceil(link.titleSize.height / 2);
              x2 = x1 + link.titleSize.width + 1;
              y2 = y1 + link.titleSize.height + 1;

              colliding = false;

              for (let x = x1; x <= x2; x++) {
                if (colliding) {
                  break;
                }

                for (let y = y1; y <= y2; y++) {
                  if (
                    this.grid[x]![y]!.some(
                      obj =>
                        obj.type === SimulatorObjectType.System &&
                        (obj as SimulatorSubsystem).blackbox,
                    )
                  ) {
                    colliding = true;

                    break;
                  }
                }
              }
            }

            // 0, 1, -1, 2, -2, 3, -3, ...
            offset = offset > 0 ? -offset : Math.abs(offset) + 1;
          } while (pathSegment && colliding && iterations < 20);

          this.gridSystems[this.getGridLinkId(link)] = {
            id: this.getGridLinkId(link),
            x1,
            y1,
            x2,
            y2,
            worldX: x1 - this.boundaries.translateX,
            worldY: y1 - this.boundaries.translateY,
            width: link.titleSize.width + 1,
            height: link.titleSize.height + 1,
            title: {
              x: x1,
              y: y1,
              width: link.titleSize.width,
              height: link.titleSize.height,
            },
          };

          for (let x = x1; x <= x2; x++) {
            for (let y = y1; y <= y2; y++) {
              finderGrid.setWeightAt(x, y, PathfindingWeights.Impenetrable);

              if (x === x1 && y == y1) {
                this.grid[x]![y]!.push(topLeft);
              } else if (x === x2 && y == y1) {
                this.grid[x]![y]!.push(topRight);
              } else if (x === x1 && y == y2) {
                this.grid[x]![y]!.push(bottomLeft);
              } else if (x === x2 && y == y2) {
                this.grid[x]![y]!.push(bottomRight);
              } else if (x === x1) {
                this.grid[x]![y]!.push(left);
              } else if (x === x2) {
                this.grid[x]![y]!.push(right);
              } else if (y === y1) {
                this.grid[x]![y]!.push(top);
              } else if (y === y2) {
                this.grid[x]![y]!.push(bottom);
              } else {
                this.grid[x]![y]!.push(center);
              }
            }
          }

          const title: SimulatorLinkTitle = {
            type: SimulatorObjectType.LinkTitle,
            link,
            chars: link.title,
            zIndex: SimulatorObjectZIndex.LinkTitle + linkIndex,
          };

          this.grid[x1 + 1]![y1 + 1]!.push(title);
        }
      }

      // Allowed systems to be traversed by the path from A to B. Part II.
      //
      // After a path from A to B is found (or not), we remove the
      // impenetrable perimeters around traversable parents...
      for (const perimeter of allowedSystemPerimeters) {
        for (const [x, y, weight] of perimeter) {
          finderGrid.setWeightAt(x!, y!, weight!);
        }
      }

      // A path is still considered walkable but it has a higher cost
      // than an empty tile. It enables crossing paths.
      for (let i = 0; i < path.length; i++) {
        const x = path[i]![0]!;
        const y = path[i]![1]!;

        // The start of the path cannot be crossed.
        if (i === 0) {
          finderGrid.setWeightAt(x!, y!, PathfindingWeights.Impenetrable);
          // The end of the path cannot be crossed.
        } else if (i === path.length - 1) {
          finderGrid.setWeightAt(x!, y!, PathfindingWeights.Impenetrable);
          // A turning path cannot be crossed.
        } else if (
          this.grid[x]![y]!.some(
            obj =>
              obj.type === SimulatorObjectType.Link &&
              ((obj as SimulatorLink).direction ===
                SimulatorLinkDirectionType.BottomToLeft ||
                (obj as SimulatorLink).direction ===
                  SimulatorLinkDirectionType.BottomToRight ||
                (obj as SimulatorLink).direction ===
                  SimulatorLinkDirectionType.TopToLeft ||
                (obj as SimulatorLink).direction ===
                  SimulatorLinkDirectionType.TopToRight),
          )
        ) {
          finderGrid.setWeightAt(x!, y!, PathfindingWeights.Impenetrable);
          // Any other segment of the path can be crossed.
        } else {
          finderGrid.addWeightAt(x!, y!, PathfindingWeights.Path);
        }
      }
    }
  }

  // @ts-ignore not referenced
  private debugDraw(finderGrid: PathFinderGrid): void {
    for (let x = 0; x < this.boundaries.width; x++) {
      for (let y = 0; y < this.boundaries.height; y++) {
        const debugInfo: SimulatorSystemTitle = {
          type: SimulatorObjectType.SystemTitle,
          // @ts-ignore
          system: undefined,
          blackbox: false,
          chars:
            finderGrid.getWeightAt(x, y) === PathfindingWeights.Impenetrable
              ? "X"
              : finderGrid.getWeightAt(x, y) === PathfindingWeights.Path
                ? "P"
                : finderGrid.getWeightAt(x, y) === PathfindingWeights.EmptySpace
                  ? "."
                  : finderGrid.getWeightAt(x, y) ===
                      PathfindingWeights.SystemPerimeter
                    ? "A"
                    : finderGrid.getWeightAt(x, y).toString(),
        };

        this.grid[x]![y]!.push(debugInfo);
      }
    }
  }

  // @ts-ignore not referenced
  private debugCost(path: number[][], finderGrid: PathFinderGrid): void {
    if (!path.length) {
      console.debug("no path");
      return;
    }

    let cost = 0;

    for (const [x, y] of path) {
      cost += finderGrid.getWeightAt(x!, y!);
    }

    console.debug("cost", cost);
  }

  private synchronizeRuntimeObjects(
    system: RuntimeSystem | RuntimeSubsystem,
  ): void {
    // Root system.
    if (!system.id) {
      for (const link of system.links) {
        const gridLink = this.gridSystems[this.getGridLinkId(link)];

        if (gridLink) {
          link.titlePosition.x = gridLink.worldX;
          link.titlePosition.y = gridLink.worldY;

          link.titleSize.width = gridLink.width;
          link.titleSize.height = gridLink.height;
        }
      }
    }

    // Recursive traversal.
    for (const ss of system.systems) {
      const gridSS = this.gridSystems[ss.id]!;

      // Synchronize grid object with runtime system.
      ss.position.x = gridSS.worldX;
      ss.position.y = gridSS.worldY;

      ss.size.width = gridSS.width;
      ss.size.height = gridSS.height;

      this.synchronizeRuntimeObjects(ss);
    }
  }

  private getGridLinkId(link: RuntimeLink): string {
    return [link.a, link.b].join("<>");
  }
}
