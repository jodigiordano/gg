import PathFinderGrid from "./pathfinding/grid";
import { PathFinder } from "./pathfinding/finder";

import {
  RuntimeSystem,
  RuntimeLimits,
  RuntimeSubsystem,
  RuntimeLink,
  TitleCharsPerSquare,
} from "@dataflows/spec";

// TODO: add SystemTopLeftCorner, SystemTopRightCorner, ...
// TODO: add LinkRightTurn, LinkDownTurn, ...
export enum SimulatorObjectType {
  BlackBox = 1,
  WhiteBox = 2,
  Link = 3,
  Port = 4,
  PortPadding = 5,
  SystemTitle = 6,
  SystemTitlePadding = 7,
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

export interface SimulatorPortPadding extends SimulatorObject {
  type: SimulatorObjectType.PortPadding;
  system: RuntimeSubsystem;
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

export interface SystemSimulatorOptions {
  // By default, all sub-systems of the system are displayed on the grid.
  // This option treat a sub-system as a blackbox, i.e. not showing what's
  // inside.
  blackBoxes: string[];

  // TODO: option to hide sub-systems ?
}

const PaddingWhiteBox = 2;

interface GridSystem {
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
  private system: RuntimeSystem;
  private routes: Record<string, Record<string, number[][]>>;
  private gridSystems: Record<string, GridSystem>;
  private grid: SimulatorObject[][][];
  private options: SystemSimulatorOptions;

  constructor(
    system: RuntimeSystem,
    options: SystemSimulatorOptions = { blackBoxes: [] },
  ) {
    this.system = system;
    this.routes = {};
    this.gridSystems = {};
    this.grid = new Array(RuntimeLimits.MaxSystemHeight);
    this.options = options;

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
    this.computeGridObjectSizes(system);
    this.computeGridObjectPositions(system);
    this.computeGridObjectPorts(system);
    this.computeGridObjectTitles(system);

    // Add sub-systems & ports.
    const toDraw: RuntimeSubsystem[] = [...this.system.systems];

    while (toDraw.length) {
      const ss = toDraw.shift()!;

      const blackbox =
        !ss.systems.length || this.options.blackBoxes.includes(ss.canonicalId);

      if (!blackbox) {
        for (const sss of ss.systems) {
          toDraw.push(sss);
        }
      }

      const gridSS = this.gridSystems[ss.canonicalId]!;

      // Ports padding.
      const simulatorPortPadding: SimulatorPortPadding = Object.freeze({
        type: SimulatorObjectType.PortPadding,
        system: ss,
      });

      for (let x = gridSS.x - 1; x < gridSS.x + gridSS.width + 1; x++) {
        this.grid[x]![gridSS.y - 1]!.push(simulatorPortPadding);
        finderGrid.setWeightAt(x, gridSS.y - 1, Infinity);

        this.grid[x]![gridSS.y + gridSS.height]!.push(simulatorPortPadding);
        finderGrid.setWeightAt(x, gridSS.y + gridSS.height, Infinity);
      }

      for (let y = gridSS.y - 1; y < gridSS.y + gridSS.height + 1; y++) {
        this.grid[gridSS.x - 1]![y]!.push(simulatorPortPadding);
        finderGrid.setWeightAt(gridSS.x - 1, y, Infinity);

        this.grid[gridSS.x + gridSS.width]![y]!.push(simulatorPortPadding);
        finderGrid.setWeightAt(gridSS.x + gridSS.width, y, Infinity);
      }

      // Sub-systems.
      const simulatorSystem: SimulatorBlackBox | SimulatorWhiteBox =
        Object.freeze({
          type: blackbox
            ? SimulatorObjectType.BlackBox
            : SimulatorObjectType.WhiteBox,
          system: ss,
        });

      for (let x = gridSS.x; x < gridSS.x + gridSS.width; x++) {
        for (let y = gridSS.y; y < gridSS.y + gridSS.height; y++) {
          this.grid[x]![y]!.push(simulatorSystem);
          finderGrid.setWeightAt(x, y, blackbox ? Infinity : 1);
        }
      }

      // Ports.
      const simulatorPort: SimulatorPort = Object.freeze({
        type: SimulatorObjectType.Port,
        system: ss,
      });

      for (const port of gridSS.ports) {
        this.grid[port.x]![port.y]!.push(simulatorPort);
        finderGrid.setWeightAt(port.x, port.y, 1);
      }

      // Title padding.
      const simulatorSystemTitlePadding: SimulatorSystemTitlePadding =
        Object.freeze({
          type: SimulatorObjectType.SystemTitlePadding,
          system: ss,
        });

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
          this.grid[x]![y]!.push(simulatorSystemTitlePadding);
          finderGrid.setWeightAt(x, y, Infinity);
        }
      }

      // Title.
      const titleLines = ss.title.split("\n");

      for (
        let x = gridSS.title.x, i = 0;
        x < gridSS.title.x + gridSS.title.width;
        x++, i++
      ) {
        for (
          let y = gridSS.title.y, j = 0;
          y < gridSS.title.y + gridSS.title.height;
          y++, j++
        ) {
          const simulatorSystemTitle: SimulatorSystemTitle = {
            type: SimulatorObjectType.SystemTitle,
            system: ss,
            chars: titleLines[j]!.slice(
              i * TitleCharsPerSquare,
              i * TitleCharsPerSquare + TitleCharsPerSquare
            ),
          };

          this.grid[x]![y]!.push(simulatorSystemTitle);
          finderGrid.setWeightAt(x, y, Infinity);
        }
      }
    }

    // Add links (pathfinding).
    const finder = new PathFinder({
      avoidStaircase: true,
      turnPenalty: 1,
    });

    for (const link of this.system.links) {
      const subsystemA = this.gridSystems[link.a]!;
      const subsystemB = this.gridSystems[link.b]!;

      // The link references two sub-systems that are hidden inside a blackbox.
      if (subsystemA.hidden && subsystemB.hidden) {
        continue;
      }

      const subsystemAPorts = subsystemA.ports.filter(
        port =>
          this.grid[port.x]![port.y]!.at(-1)?.type === SimulatorObjectType.Port,
      );

      const subsystemBPorts = subsystemB.ports.filter(
        port =>
          this.grid[port.x]![port.y]!.at(-1)?.type === SimulatorObjectType.Port,
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
            this.grid[x!]![y!]!.push(simulatorLink);

            // A path is still considered walkable but it has a higher cost
            // than an Empty tile. It enables tunnels.
            finderGrid.setWeightAt(x!, y!, 2);
          }

          break;
        }
      }
    }
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
        if (!this.grid[i]![j]!.length) {
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

  getRoute(fromSystemId: string, toSystemId: string): number[][] | undefined {
    return this.routes[fromSystemId]?.[toSystemId];
  }

  private initializeGridObjects(
    system: RuntimeSystem | RuntimeSubsystem,
  ): void {
    // Depth-first traversal.
    for (const ss of system.systems) {
      this.initializeGridObjects(ss);
    }

    // Root system.
    if (!system.canonicalId) {
      return;
    }

    // Initialize system.
    const gridObject = {
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
    // Depth-first traversal.
    for (const ss of system.systems) {
      this.computeGridVisibility(
        ss,
        hidden || this.options.blackBoxes.includes(ss.canonicalId),
      );
    }

    // Root system.
    if (!system.canonicalId) {
      return;
    }

    const gridObject = this.gridSystems[system.canonicalId]!;
    const blackbox = this.options.blackBoxes.includes(system.canonicalId);

    gridObject.hidden = !blackbox && hidden;
  }

  private computeGridObjectSizes(
    system: RuntimeSystem | RuntimeSubsystem,
  ): void {
    // Depth-first traversal.
    for (const ss of system.systems) {
      this.computeGridObjectSizes(ss);
    }

    // Root system.
    if (!system.canonicalId) {
      return;
    }

    const gridObject = this.gridSystems[system.canonicalId]!;
    const blackbox = this.options.blackBoxes.includes(system.canonicalId);

    if (gridObject.hidden) {
      gridObject.width = 0;
      gridObject.height = 0;
    } else if (!blackbox && system.systems.length) {
      let maxWidth = 0;
      let maxHeight = 0;

      for (const ss of system.systems) {
        const width = ss.position.x + this.gridSystems[ss.canonicalId]!.width;
        const height = ss.position.y + this.gridSystems[ss.canonicalId]!.height;

        if (width > maxWidth) {
          maxWidth = width;
        }

        if (height > maxHeight) {
          maxHeight = height;
        }
      }

      // +----------------------+
      // | Title                |
      // | +-----+    +-----+   |
      // | | Foo |====| Bar |   |
      // | +-----+    +-----+   |
      // +----------------------+

      if (system.titleSize.width > maxWidth) {
        maxWidth = system.titleSize.width;
      }

      gridObject.width = maxWidth + 2 * PaddingWhiteBox;
      gridObject.height =
        maxHeight + 2 * PaddingWhiteBox + 2 * system.titleSize.height;
    } else {
      gridObject.width = system.size.width;
      gridObject.height = system.size.height;
    }
  }

  private computeGridObjectPositions(
    system: RuntimeSystem | RuntimeSubsystem,
  ): void {
    // Leaf sub-system. Position already set.
    if (!system.systems.length) {
      return;
    }

    const parentGridObject = system.canonicalId
      ? this.gridSystems[system.canonicalId]!
      : { x: 0, y: 0, width: 0, height: 0 };

    let bottomX = parentGridObject.x;
    let bottomY = parentGridObject.y;

    const sortedLeftRight = system.systems.sort(
      (a, b) => a.position.x - b.position.x,
    );

    for (const ss of sortedLeftRight) {
      const gridObject = this.gridSystems[ss.canonicalId]!;

      gridObject.x = parentGridObject.x + ss.position.x;

      if (gridObject.x < bottomX) {
        gridObject.x = bottomX + 1;
      }

      gridObject.x += PaddingWhiteBox;

      bottomX = gridObject.x + gridObject.width;
    }

    const sortedTopBottom = system.systems.sort(
      (a, b) => a.position.y - b.position.y,
    );

    for (const ss of sortedTopBottom) {
      const gridObject = this.gridSystems[ss.canonicalId]!;

      gridObject.y = parentGridObject.y + ss.position.y;

      if (gridObject.x < bottomY) {
        gridObject.y = bottomY + 1;
      }

      gridObject.y += PaddingWhiteBox;
      gridObject.y += system.titlePosition.y + system.titleSize.height;

      bottomY = gridObject.y + gridObject.height;
    }

    for (const ss of system.systems) {
      // Breadth-first traversal.
      this.computeGridObjectPositions(ss);
    }
  }

  private computeGridObjectPorts(
    system: RuntimeSystem | RuntimeSubsystem,
  ): void {
    for (const ss of system.systems) {
      const gridObject = this.gridSystems[ss.canonicalId]!;
      const blackbox = this.options.blackBoxes.includes(ss.canonicalId);

      // When the sub-system is hidden, it has the same ports as its parent.
      // I am not making a deep copy here because it is not necessary and
      // save some CPU cycles but beware!
      if (gridObject.hidden) {
        gridObject.ports = this.gridSystems[system.canonicalId!]!.ports;
        // Whitebox.
      } else if (!blackbox && ss.systems.length) {
        gridObject.ports = [];

        for (let x = 1; x < gridObject.width; x += 2) {
          gridObject.ports.push({ x: gridObject.x + x, y: gridObject.y - 1 });

          gridObject.ports.push({
            x: gridObject.x + x,
            y: gridObject.y + gridObject.height,
          });
        }

        for (let y = 1; y < gridObject.height; y += 2) {
          gridObject.ports.push({ x: gridObject.x - 1, y: gridObject.y + y });

          gridObject.ports.push({
            x: gridObject.x + gridObject.width,
            y: gridObject.y + y,
          });
        }
        // Blackbox.
      } else {
        gridObject.ports = ss.ports.map(port => ({
          x: gridObject.x + port.x,
          y: gridObject.y + port.y,
        }));
      }
    }

    // Breadth-first traversal.
    for (const ss of system.systems) {
      this.computeGridObjectPorts(ss);
    }
  }

  private computeGridObjectTitles(
    system: RuntimeSystem | RuntimeSubsystem,
  ): void {
    // Depth-first traversal.
    for (const ss of system.systems) {
      this.computeGridObjectTitles(ss);
    }

    // Root system.
    if (!system.canonicalId) {
      return;
    }

    const gridObject = this.gridSystems[system.canonicalId]!;

    if (gridObject.hidden) {
      return;
    }

    gridObject.title = {
      x: gridObject.x + system.titlePosition.x,
      y: gridObject.y + system.titlePosition.y,
      width: system.titleSize.width,
      height: system.titleSize.height,
    };
  }
}
