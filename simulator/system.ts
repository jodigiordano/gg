import PathFinderGrid from "./pathfinding/grid";
import { PathFinder } from "./pathfinding/finder";

import {
  PaddingWhiteBox,
  RuntimeSystem,
  RuntimeSubsystem,
  RuntimeLink,
  TitleCharsPerSquare,
  SystemMargin,
} from "@dataflows/spec";

// TODO: add LinkRightTurn, LinkDownTurn, ...
export enum SimulatorObjectType {
  BlackBox = 1,
  WhiteBox = 2,
  Link = 3,
  Port = 4,
  SystemMargin = 5,
  SystemTitle = 6,
  SystemTitlePadding = 7,
  SystemTopLeftCorner = 8,
  SystemTopRightCorner = 9,
  SystemBottomLeftCorner = 10,
  SystemBottomRightCorner = 11,
}

export interface SimulatorObject {
  type: SimulatorObjectType;
}

export interface SimulatorBlackBox extends SimulatorObject {
  type: SimulatorObjectType.BlackBox;
  system: RuntimeSubsystem;
}

export interface SimulatorWhiteBox extends SimulatorObject {
  type: SimulatorObjectType.WhiteBox;
  system: RuntimeSubsystem;
}

export interface SimulatorLink extends SimulatorObject {
  type: SimulatorObjectType.Link;
  link: RuntimeLink;
}

export interface SimulatorPort extends SimulatorObject {
  type: SimulatorObjectType.Port;
  system: RuntimeSubsystem;
}

export interface SimulatorSystemMargin extends SimulatorObject {
  type: SimulatorObjectType.SystemMargin;
  system: RuntimeSystem | RuntimeSubsystem;
}

export interface SimulatorSystemTitle extends SimulatorObject {
  type: SimulatorObjectType.SystemTitle;
  system: RuntimeSubsystem;
  chars: string;
}

export interface SimulatorSystemTitlePadding extends SimulatorObject {
  type: SimulatorObjectType.SystemTitlePadding;
  system: RuntimeSubsystem;
}

export interface SimulatorSystemTopLeftCorner extends SimulatorObject {
  type: SimulatorObjectType.SystemTopLeftCorner;
  system: RuntimeSubsystem;
}

export interface SimulatorSystemTopRightCorner extends SimulatorObject {
  type: SimulatorObjectType.SystemTopRightCorner;
  system: RuntimeSubsystem;
}

export interface SimulatorSystemBottomLeftCorner extends SimulatorObject {
  type: SimulatorObjectType.SystemBottomLeftCorner;
  system: RuntimeSubsystem;
}

export interface SimulatorSystemBottomRightCorner extends SimulatorObject {
  type: SimulatorObjectType.SystemBottomRightCorner;
  system: RuntimeSubsystem;
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
  canonicalId: string;

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
  ports: {
    x: number;
    y: number;
  }[];
  title: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  hidden: boolean;
}

export class SystemSimulator {
  private routes: Record<string, Record<string, number[][]>>;
  private gridSystems: Record<string, GridSystem>;
  private grid: SimulatorObject[][][];
  private boundaries: SimulatorBoundaries;

  constructor(system: RuntimeSystem) {
    this.routes = {};
    this.gridSystems = {};

    // Compute grid systems. Part I.
    this.initializeSystems(system);
    this.computeSystemVisibility(system, false);
    this.computeSystemWorldPositions(system);
    this.computeSystemSizes(system);

    // Compute boundaries.
    this.boundaries = this.computeBoundaries();

    console.log(this.boundaries);
    // Compute grid systems. Part II.
    // Requires sizes & boundaries.
    this.computeSystemPositions();

    // Compute grid systems. Part III.
    // Requires positions.
    this.computeSystemPorts(system);
    this.computeSystemTitles(system);

    // Create grid.
    this.grid = new Array(this.boundaries.height);

    for (let i = 0; i < this.boundaries.width; i++) {
      this.grid[i] = Array.from({ length: this.boundaries.height }, () => []);
    }

    // Create path finder (routing) grid.
    const finderGrid = new PathFinderGrid(
      this.boundaries.width,
      this.boundaries.height,
      1,
    );

    // Draw grid objects.
    this.drawSubsystems(system, finderGrid);
    this.drawLinks(system, finderGrid);

    this.synchronizeRuntimeObjects(system);
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
  getVisibleBoundaries(): {
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
            obj.type === SimulatorObjectType.BlackBox ||
            obj.type === SimulatorObjectType.WhiteBox ||
            obj.type === SimulatorObjectType.Link,
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

    return {
      left,
      right,
      top,
      bottom,
    };
  }

  getAvailableSpaceForSystems(): boolean[][] {
    const available = new Array(this.boundaries.height);

    for (let i = 0; i < this.boundaries.width; i++) {
      available[i] = Array.from({ length: this.boundaries.width }, () => []);
    }

    for (let i = 0; i < this.boundaries.width; i++) {
      for (let j = 0; j < this.boundaries.height; j++) {
        available[i][j] =
          this.grid[i]![j]!.length === 0 ||
          this.grid[i]![j]!.every(
            object => object.type === SimulatorObjectType.Link,
          );
      }
    }

    return available;
  }

  getRoute(fromSystemId: string, toSystemId: string): number[][] | undefined {
    return this.routes[fromSystemId]?.[toSystemId];
  }

  private initializeSystems(system: RuntimeSystem | RuntimeSubsystem): void {
    // Recursive traversal.
    for (const ss of system.systems) {
      this.initializeSystems(ss);
    }

    // Root system.
    if (!system.canonicalId) {
      return;
    }

    // Initialize system.
    const gridSystem: GridSystem = {
      canonicalId: system.canonicalId,
      x1: -1,
      x2: -1,
      y1: -1,
      y2: -1,
      worldX: -1,
      worldY: -1,
      width: -1,
      height: -1,
      ports: [],
      title: {
        x: -1,
        y: -1,
        width: -1,
        height: -1,
      },
      hidden: false,
    };

    this.gridSystems[system.canonicalId] = gridSystem;
  }

  private computeSystemVisibility(
    system: RuntimeSystem | RuntimeSubsystem,
    hidden: boolean,
  ): void {
    // Recursive traversal.
    for (const ss of system.systems) {
      this.computeSystemVisibility(ss, hidden || (system.hideSystems ?? false));
    }

    // Root system.
    if (!system.canonicalId) {
      return;
    }

    const gridSystem = this.gridSystems[system.canonicalId]!;

    gridSystem.hidden = hidden;
  }

  private computeSystemWorldPositions(
    system: RuntimeSystem | RuntimeSubsystem,
  ): void {
    const gridSystem = system.canonicalId
      ? this.gridSystems[system.canonicalId]!
      : { worldX: 0, worldY: 0 };

    for (const ss of system.systems) {
      const ssGridSystem = this.gridSystems[ss.canonicalId]!;

      ssGridSystem.worldX = gridSystem.worldX + ss.position.x;
      ssGridSystem.worldY = gridSystem.worldY + ss.position.y;

      if (system.canonicalId) {
        ssGridSystem.worldX += PaddingWhiteBox;

        ssGridSystem.worldY += PaddingWhiteBox;
        ssGridSystem.worldY +=
          system.titlePosition.y + system.titleSize.height - 1;
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
    if (!system.canonicalId) {
      return;
    }

    const gridSystem = this.gridSystems[system.canonicalId]!;

    gridSystem.width = system.size.width;
    gridSystem.height = system.size.height;
  }

  private computeSystemPorts(system: RuntimeSystem | RuntimeSubsystem): void {
    for (const ss of system.systems) {
      const gridSystem = this.gridSystems[ss.canonicalId]!;

      gridSystem.ports = ss.ports.map(port => ({
        x: gridSystem.x1 + port.x,
        y: gridSystem.y1 + port.y,
      }));

      // Recursive traversal.
      this.computeSystemPorts(ss);
    }
  }

  private computeSystemTitles(system: RuntimeSystem | RuntimeSubsystem): void {
    // Recursive traversal.
    for (const ss of system.systems) {
      this.computeSystemTitles(ss);
    }

    // Root system.
    if (!system.canonicalId) {
      return;
    }

    const gridSystem = this.gridSystems[system.canonicalId]!;

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

    left -= SystemMargin * 5;
    right += SystemMargin * 5;
    top -= SystemMargin * 5;
    bottom += SystemMargin * 5;

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

  private drawSubsystems(
    system: RuntimeSystem | RuntimeSubsystem,
    finderGrid: PathFinderGrid,
  ): void {
    for (const ss of system.systems) {
      const gridSS = this.gridSystems[ss.canonicalId]!;

      // Draw margins.
      const simulatorSystemMargin: SimulatorSystemMargin = Object.freeze({
        type: SimulatorObjectType.SystemMargin,
        system: ss,
      });

      for (
        let x = gridSS.x1 - SystemMargin;
        x <= gridSS.x2 + SystemMargin;
        x++
      ) {
        const top = gridSS.y1 - SystemMargin;
        const bottom = gridSS.y2 + SystemMargin;

        this.grid[x]![top]!.push(simulatorSystemMargin);
        finderGrid.setWeightAt(x, top, Infinity);

        this.grid[x]![bottom]!.push(simulatorSystemMargin);
        finderGrid.setWeightAt(x, bottom, Infinity);
      }

      for (
        let y = gridSS.y1 - SystemMargin;
        y <= gridSS.y2 + SystemMargin;
        y++
      ) {
        const left = gridSS.x1 - SystemMargin;
        const right = gridSS.x2 + SystemMargin;

        this.grid[left]![y]!.push(simulatorSystemMargin);
        finderGrid.setWeightAt(left, y, Infinity);

        this.grid[right]![y]!.push(simulatorSystemMargin);
        finderGrid.setWeightAt(right, y, Infinity);
      }

      // Sub-systems.
      const simulatorSystem: SimulatorBlackBox | SimulatorWhiteBox =
        Object.freeze({
          type:
            gridSS.hidden || ss.hideSystems || !ss.systems.length
              ? SimulatorObjectType.BlackBox
              : SimulatorObjectType.WhiteBox,
          system: ss,
        });

      const simulatorSystemTopLeftCorner: SimulatorSystemTopLeftCorner =
        Object.freeze({
          type: SimulatorObjectType.SystemTopLeftCorner,
          system: ss,
        });

      const simulatorSystemTopRightCorner: SimulatorSystemTopRightCorner =
        Object.freeze({
          type: SimulatorObjectType.SystemTopRightCorner,
          system: ss,
        });

      const simulatorSystemBottomLeftCorner: SimulatorSystemBottomLeftCorner =
        Object.freeze({
          type: SimulatorObjectType.SystemBottomLeftCorner,
          system: ss,
        });

      const simulatorSystemBottomRightCorner: SimulatorSystemBottomRightCorner =
        Object.freeze({
          type: SimulatorObjectType.SystemBottomRightCorner,
          system: ss,
        });

      for (let x = gridSS.x1; x <= gridSS.x2; x++) {
        for (let y = gridSS.y1; y <= gridSS.y2; y++) {
          finderGrid.setWeightAt(x, y, 1);

          // The sub-system is inside a blackbox.
          if (gridSS.hidden) {
            continue;
          }

          this.grid[x]![y]!.push(simulatorSystem);

          if (x === gridSS.x1 && y == gridSS.y1) {
            this.grid[x]![y]!.push(simulatorSystemTopLeftCorner);
          }

          if (x === gridSS.x2 && y == gridSS.y1) {
            this.grid[x]![y]!.push(simulatorSystemTopRightCorner);
          }

          if (x === gridSS.x1 && y == gridSS.y2) {
            this.grid[x]![y]!.push(simulatorSystemBottomLeftCorner);
          }

          if (x === gridSS.x2 && y == gridSS.y2) {
            this.grid[x]![y]!.push(simulatorSystemBottomRightCorner);
          }
        }
      }

      // Ports.
      const simulatorPort: SimulatorPort = Object.freeze({
        type: SimulatorObjectType.Port,
        system: ss,
      });

      for (const port of gridSS.ports) {
        if (port.x < this.boundaries.width && port.y < this.boundaries.height) {
          this.grid[port.x]![port.y]!.push(simulatorPort);
          finderGrid.setWeightAt(port.x, port.y, 1);
        }
      }

      // Title padding.
      const simulatorSystemTitlePadding: SimulatorSystemTitlePadding =
        Object.freeze({
          type: SimulatorObjectType.SystemTitlePadding,
          system: ss,
        });

      for (
        let x = gridSS.title.x - 1;
        x <
        Math.min(
          gridSS.title.x + gridSS.title.width + 1,
          this.boundaries.width,
        );
        x++
      ) {
        for (
          let y = gridSS.title.y - 1;
          y <
          Math.min(
            gridSS.title.y + gridSS.title.height + 1,
            this.boundaries.height,
          );
          y++
        ) {
          this.grid[x]![y]!.push(simulatorSystemTitlePadding);
          finderGrid.setWeightAt(x, y, Infinity);
        }
      }

      // Title.
      const titleLines = ss.title.split("\n");

      for (
        let x = gridSS.title.x, i = 0;
        x <
        Math.min(gridSS.title.x + gridSS.title.width, this.boundaries.width);
        x++, i++
      ) {
        for (
          let y = gridSS.title.y, j = 0;
          y <
          Math.min(
            gridSS.title.y + gridSS.title.height,
            this.boundaries.height,
          );
          y++, j++
        ) {
          finderGrid.setWeightAt(x, y, Infinity);

          // The sub-system is inside a blackbox.
          if (gridSS.hidden) {
            continue;
          }

          const simulatorSystemTitle: SimulatorSystemTitle = {
            type: SimulatorObjectType.SystemTitle,
            system: ss,
            chars: titleLines[j]!.slice(
              i * TitleCharsPerSquare,
              i * TitleCharsPerSquare + TitleCharsPerSquare,
            ),
          };

          this.grid[x]![y]!.push(simulatorSystemTitle);
        }
      }

      // Recursive traversal.
      this.drawSubsystems(ss, finderGrid);
    }
  }

  private drawLinks(system: RuntimeSystem, finderGrid: PathFinderGrid): void {
    const finder = new PathFinder({
      avoidStaircase: true,
      turnPenalty: 1,
    });

    for (const link of system.links) {
      const subsystemA = this.gridSystems[link.a]!;
      const subsystemB = this.gridSystems[link.b]!;

      const subsystemAPorts = subsystemA.ports.filter(
        port =>
          this.grid[port.x]?.[port.y]?.at(-1)?.type ===
          SimulatorObjectType.Port,
      );

      const subsystemBPorts = subsystemB.ports.filter(
        port =>
          this.grid[port.x]?.[port.y]?.at(-1)?.type ===
          SimulatorObjectType.Port,
      );

      const candidates = subsystemAPorts
        .flatMap(portA =>
          subsystemBPorts.map(portB => ({
            portA,
            portB,
            distance: Math.sqrt(
              Math.pow(portB.x - portA.x, 2) + Math.pow(portB.y - portA.y, 2),
            ),
          })),
        )
        .sort((a, b) => a.distance - b.distance);

      for (const { portA, portB } of candidates) {
        finderGrid.reset();

        const route = finder.findPath(
          portA.x,
          portA.y,
          portB.x,
          portB.y,
          finderGrid,
        );

        if (route.length) {
          this.routes[link.a] ??= {};
          this.routes[link.a]![link.b] = route;

          this.routes[link.b] ??= {};
          this.routes[link.b]![link.a] = route.slice().reverse();

          const simulatorLink: SimulatorLink = Object.freeze({
            type: SimulatorObjectType.Link,
            link,
          });

          for (const [x, y] of route) {
            // A path is still considered walkable but it has a higher cost
            // than an Empty tile. It enables tunnels.
            finderGrid.setWeightAt(x!, y!, 2);

            const blackbox = this.grid[x!]![y!]!.find(
              obj => obj.type === SimulatorObjectType.BlackBox,
            );

            // The link part is inside a blackbox.
            if (blackbox) {
              this.grid[x!]![y!]!.push(blackbox);
            } else {
              this.grid[x!]![y!]!.push(simulatorLink);
            }
          }

          break;
        }
      }
    }
  }

  private synchronizeRuntimeObjects(
    system: RuntimeSystem | RuntimeSubsystem,
  ): void {
    // Recursive traversal.
    for (const ss of system.systems) {
      const gridSS = this.gridSystems[ss.canonicalId]!;

      // Synchronize grid object with runtime system.
      // TODO: is it really how we want to tackle this?
      // TODO: or should a runtime system has a "grid" property, alike "specification".
      // TODO: so for a propertu, we would have the "spec" -> "runtime" -> "grid" transformations.
      ss.position.x = gridSS.worldX;
      ss.position.y = gridSS.worldY;

      ss.size.width = gridSS.width;
      ss.size.height = gridSS.height;

      this.synchronizeRuntimeObjects(ss);
    }
  }
}
