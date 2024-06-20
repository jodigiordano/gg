import PathFinderGrid from "./pathfinding/grid";
import { PathFinder } from "./pathfinding/finder";

import {
  PaddingWhiteBox,
  RuntimeSystem,
  RuntimeLimits,
  RuntimeSubsystem,
  RuntimeLink,
  TitleCharsPerSquare,
  SystemMargin,
} from "@dataflows/spec";

// TODO: add SystemTopLeftCorner, SystemTopRightCorner, ...
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

interface GridSystem {
  canonicalId: string;
  x: number;
  y: number;
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

  constructor(system: RuntimeSystem) {
    this.routes = {};
    this.gridSystems = {};
    this.grid = new Array(RuntimeLimits.MaxSystemHeight);

    // Create grid.
    for (let i = 0; i < RuntimeLimits.MaxSystemWidth; i++) {
      this.grid[i] = Array.from(
        { length: RuntimeLimits.MaxSystemWidth },
        () => [],
      );
    }

    // TODO: faster way to initialize?
    const finderGrid = new PathFinderGrid(
      this.grid.map(row => row.map(() => 1)),
    );

    // Compute grid objects.
    this.initializeGridObjects(system);
    this.computeGridVisibility(system, false);
    this.computeGridObjectPositions(system);
    this.computeGridObjectSizes(system);
    this.computeGridObjectPorts(system);
    this.computeGridObjectTitles(system);

    // Draw grid objects.
    this.drawSystemMargins(system, finderGrid);
    this.drawSubsystems(system, finderGrid);
    this.drawLinks(system, finderGrid);

    this.synchronizeRuntimeObjects(system);
  }

  getLayout(): SimulatorObject[][][] {
    return this.grid;
  }

  // Get the boundaries of the system, i.e. a rectangle that encompass all
  // sub-systems, links, etc.
  getBoundaries(): {
    left: number;
    top: number;
    right: number;
    bottom: number;
  } {
    let left = RuntimeLimits.MaxSystemWidth;
    let right = 0;
    let top = RuntimeLimits.MaxSystemHeight;
    let bottom = 0;

    for (let i = 0; i < RuntimeLimits.MaxSystemWidth; i++) {
      for (let j = 0; j < RuntimeLimits.MaxSystemHeight; j++) {
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
    const available = new Array(RuntimeLimits.MaxSystemHeight);

    for (let i = 0; i < RuntimeLimits.MaxSystemWidth; i++) {
      available[i] = Array.from(
        { length: RuntimeLimits.MaxSystemWidth },
        () => [],
      );
    }

    for (let i = 0; i < RuntimeLimits.MaxSystemWidth; i++) {
      for (let j = 0; j < RuntimeLimits.MaxSystemHeight; j++) {
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

  private initializeGridObjects(
    system: RuntimeSystem | RuntimeSubsystem,
  ): void {
    // Recursive traversal.
    for (const ss of system.systems) {
      this.initializeGridObjects(ss);
    }

    // Root system.
    if (!system.canonicalId) {
      return;
    }

    // Initialize system.
    const gridObject = {
      canonicalId: system.canonicalId,
      x: -1,
      y: -1,
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

    this.gridSystems[system.canonicalId] = gridObject;
  }

  private computeGridVisibility(
    system: RuntimeSystem | RuntimeSubsystem,
    hidden: boolean,
  ): void {
    // Recursive traversal.
    for (const ss of system.systems) {
      this.computeGridVisibility(ss, hidden || system.hideSystems);
    }

    // Root system.
    if (!system.canonicalId) {
      return;
    }

    const gridObject = this.gridSystems[system.canonicalId]!;

    gridObject.hidden = hidden;
  }

  private computeGridObjectPositions(
    system: RuntimeSystem | RuntimeSubsystem,
  ): void {
    const gridObject = system.canonicalId
      ? this.gridSystems[system.canonicalId]!
      : { x: 0, y: 0 };

    for (const ss of system.systems) {
      const ssGridObject = this.gridSystems[ss.canonicalId]!;

      ssGridObject.x = gridObject.x + ss.position.x;
      ssGridObject.y = gridObject.y + ss.position.y;

      if (system.canonicalId) {
        ssGridObject.x += PaddingWhiteBox;

        ssGridObject.y += PaddingWhiteBox;
        ssGridObject.y += system.titlePosition.y + system.titleSize.height - 1;
      }

      // Recursive traversal.
      this.computeGridObjectPositions(ss);
    }
  }

  private computeGridObjectSizes(
    system: RuntimeSystem | RuntimeSubsystem,
  ): void {
    for (const ss of system.systems) {
      // Recursive traversal.
      this.computeGridObjectSizes(ss);
    }

    // Root system.
    if (!system.canonicalId) {
      return;
    }

    const gridObject = this.gridSystems[system.canonicalId]!;

    gridObject.width = system.size.width;
    gridObject.height = system.size.height;
  }

  private computeGridObjectPorts(
    system: RuntimeSystem | RuntimeSubsystem,
  ): void {
    for (const ss of system.systems) {
      const gridObject = this.gridSystems[ss.canonicalId]!;

      gridObject.ports = ss.ports.map(port => ({
        x: gridObject.x + port.x,
        y: gridObject.y + port.y,
      }));

      // Recursive traversal.
      this.computeGridObjectPorts(ss);
    }
  }

  private computeGridObjectTitles(
    system: RuntimeSystem | RuntimeSubsystem,
  ): void {
    // Recursive traversal.
    for (const ss of system.systems) {
      this.computeGridObjectTitles(ss);
    }

    // Root system.
    if (!system.canonicalId) {
      return;
    }

    const gridObject = this.gridSystems[system.canonicalId]!;

    gridObject.title = {
      x: gridObject.x + system.titlePosition.x,
      y: gridObject.y + system.titlePosition.y,
      width: system.titleSize.width,
      height: system.titleSize.height,
    };
  }

  private drawSystemMargins(
    system: RuntimeSystem,
    finderGrid: PathFinderGrid,
  ): void {
    const simulatorMargin: SimulatorSystemMargin = Object.freeze({
      type: SimulatorObjectType.SystemMargin,
      system,
    });

    for (let x = 0; x < RuntimeLimits.MaxSystemWidth; x++) {
      this.grid[x]![0]!.push(simulatorMargin);
      finderGrid.setWeightAt(x, 0, Infinity);

      this.grid[x]![RuntimeLimits.MaxSystemHeight - 1]!.push(simulatorMargin);
      finderGrid.setWeightAt(x, RuntimeLimits.MaxSystemHeight - 1, Infinity);
    }

    for (let y = 0; y < RuntimeLimits.MaxSystemHeight; y++) {
      this.grid[0]![y]!.push(simulatorMargin);
      finderGrid.setWeightAt(0, y, Infinity);

      this.grid[RuntimeLimits.MaxSystemWidth - 1]![y]!.push(simulatorMargin);
      finderGrid.setWeightAt(RuntimeLimits.MaxSystemWidth - 1, y, Infinity);
    }
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
        let x = gridSS.x - SystemMargin;
        x <
        Math.min(
          gridSS.x + gridSS.width + SystemMargin,
          RuntimeLimits.MaxSystemWidth,
        );
        x++
      ) {
        const top = gridSS.y - SystemMargin;
        const bottom = gridSS.y + gridSS.height - 1 + SystemMargin;

        if (top < RuntimeLimits.MaxSystemHeight) {
          this.grid[x]![top]!.push(simulatorSystemMargin);
          finderGrid.setWeightAt(x, top, Infinity);
        }

        if (bottom < RuntimeLimits.MaxSystemHeight) {
          this.grid[x]![bottom]!.push(simulatorSystemMargin);
          finderGrid.setWeightAt(x, bottom, Infinity);
        }
      }

      for (
        let y = gridSS.y - SystemMargin;
        y <
        Math.min(
          gridSS.y + gridSS.height + SystemMargin,
          RuntimeLimits.MaxSystemHeight,
        );
        y++
      ) {
        const left = gridSS.x - SystemMargin;
        const right = gridSS.x + gridSS.width - 1 + SystemMargin;

        if (left < RuntimeLimits.MaxSystemWidth) {
          this.grid[left]![y]!.push(simulatorSystemMargin);
          finderGrid.setWeightAt(left, y, Infinity);
        }

        if (right < RuntimeLimits.MaxSystemWidth) {
          this.grid[right]![y]!.push(simulatorSystemMargin);
          finderGrid.setWeightAt(right, y, Infinity);
        }
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

      for (
        let x = gridSS.x;
        x < Math.min(gridSS.x + gridSS.width, RuntimeLimits.MaxSystemWidth);
        x++
      ) {
        for (
          let y = gridSS.y;
          y < Math.min(gridSS.y + gridSS.height, RuntimeLimits.MaxSystemHeight);
          y++
        ) {
          finderGrid.setWeightAt(x, y, 1);

          // The sub-system is inside a blackbox.
          if (gridSS.hidden) {
            continue;
          }

          this.grid[x]![y]!.push(simulatorSystem);

          if (x === gridSS.x && y == gridSS.y) {
            this.grid[x]![y]!.push(simulatorSystemTopLeftCorner);
          }

          if (x === gridSS.x + gridSS.width - 1 && y == gridSS.y) {
            this.grid[x]![y]!.push(simulatorSystemTopRightCorner);
          }

          if (x === gridSS.x && y == gridSS.y + gridSS.height - 1) {
            this.grid[x]![y]!.push(simulatorSystemBottomLeftCorner);
          }

          if (
            x === gridSS.x + gridSS.width - 1 &&
            y == gridSS.y + gridSS.height - 1
          ) {
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
        if (
          port.x < RuntimeLimits.MaxSystemWidth &&
          port.y < RuntimeLimits.MaxSystemHeight
        ) {
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
          RuntimeLimits.MaxSystemWidth,
        );
        x++
      ) {
        for (
          let y = gridSS.title.y - 1;
          y <
          Math.min(
            gridSS.title.y + gridSS.title.height + 1,
            RuntimeLimits.MaxSystemHeight,
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
        Math.min(
          gridSS.title.x + gridSS.title.width,
          RuntimeLimits.MaxSystemWidth,
        );
        x++, i++
      ) {
        for (
          let y = gridSS.title.y, j = 0;
          y <
          Math.min(
            gridSS.title.y + gridSS.title.height,
            RuntimeLimits.MaxSystemHeight,
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
      ss.position.x = gridSS.x;
      ss.position.y = gridSS.y;
      ss.size.width = gridSS.width;
      ss.size.height = gridSS.height;

      this.synchronizeRuntimeObjects(ss);
    }
  }
}
