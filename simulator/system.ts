import Grid from "./pathfinding/grid";
import { PathFinder } from "./pathfinding/finder";

import {
  RuntimeSystem,
  RuntimeLimits,
  RuntimeSubsystem,
} from "@dataflows/spec";

// TODO: add ComponentTopLeftCorner, ComponentTopRightCorner, ...
// TODO: add LinkRightTurn, LinkDownTurn, ...
export enum GridObjectType {
  Empty = 0,
  BlackBox = 1,
  WhiteBox = 2,
  Link = 3,
  Port = 4,
  PortPadding = 5,
  SystemTitle = 6,
  SystemTitlePadding = 7,
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
}

export class SystemSimulator {
  private system: RuntimeSystem;
  private routes: Record<string, Record<string, number[][]>>;
  private gridSystems: Record<string, GridSystem>;
  private grid: GridObjectType[][];
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
      this.grid[i] = new Array(RuntimeLimits.MaxSystemWidth).fill(
        GridObjectType.Empty,
      );
    }

    // TODO: faster way to initialize?
    const finderGrid = new Grid(this.grid.map(row => row.map(() => 0)));

    // Compute grid objects.
    this.initializeGridObjects(system);
    this.computeGridObjectSizes(system, false);
    this.computeGridObjectPositions(system);
    this.computeGridObjectPorts(system, false);
    this.computeGridObjectTitles(system, false);

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
      for (let x = gridSS.x - 1; x < gridSS.x + gridSS.width + 1; x++) {
        for (let y = gridSS.y - 1; y < gridSS.y + gridSS.height + 1; y++) {
          this.grid[x]![y] = GridObjectType.PortPadding;

          finderGrid.setWalkableAt(x, y, false);
        }
      }

      // Sub-systems.
      for (let x = gridSS.x; x < gridSS.x + gridSS.width; x++) {
        for (let y = gridSS.y; y < gridSS.y + gridSS.height; y++) {
          this.grid[x]![y] = blackbox
            ? GridObjectType.BlackBox
            : GridObjectType.WhiteBox;

          finderGrid.setWalkableAt(x, y, !blackbox);
        }
      }

      // Ports.
      for (const port of gridSS.ports) {
        this.grid[port.x]![port.y] = GridObjectType.Port;
        finderGrid.setWalkableAt(port.x, port.y, true);
      }

      // Title.
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
          this.grid[x]![y] = GridObjectType.SystemTitlePadding;

          finderGrid.setWalkableAt(x, y, false);
        }
      }

      for (
        let x = gridSS.title.x;
        x < gridSS.title.x + gridSS.title.width;
        x++
      ) {
        for (
          let y = gridSS.title.y;
          y < gridSS.title.y + gridSS.title.height;
          y++
        ) {
          this.grid[x]![y] = GridObjectType.SystemTitle;

          finderGrid.setWalkableAt(x, y, false);
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

      const subsystemAPorts = subsystemA.ports.filter(
        port => this.grid[port.x]![port.y] === GridObjectType.Port,
      );

      const subsystemBPorts = subsystemB.ports.filter(
        port => this.grid[port.x]![port.y] === GridObjectType.Port,
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

          for (const [x, y] of route) {
            this.grid[x!]![y!] = GridObjectType.Link;

            finderGrid.setWalkableAt(x!, y!, false);
          }

          break;
        }
      }
    }
  }

  get layout() {
    return this.grid;
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
    };

    this.gridSystems[system.canonicalId] = gridObject;
  }

  private computeGridObjectSizes(
    system: RuntimeSystem | RuntimeSubsystem,
    hidden: boolean,
  ): void {
    // Depth-first traversal.
    for (const ss of system.systems) {
      this.computeGridObjectSizes(
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

    if (!blackbox && hidden) {
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
    hidden: boolean,
  ): void {
    // Depth-first traversal.
    for (const ss of system.systems) {
      this.computeGridObjectPorts(
        ss,
        hidden || this.options.blackBoxes.includes(ss.canonicalId),
      );
    }

    // Root system.
    if (!system.canonicalId) {
      return;
    }

    const blackbox = this.options.blackBoxes.includes(system.canonicalId);

    if (!blackbox && hidden) {
      return;
    }

    const gridObject = this.gridSystems[system.canonicalId]!;

    if (!blackbox && system.systems.length) {
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
    } else {
      gridObject.ports = system.ports.map(port => ({
        x: gridObject.x + port.x,
        y: gridObject.y + port.y,
      }));
    }
  }

  private computeGridObjectTitles(
    system: RuntimeSystem | RuntimeSubsystem,
    hidden: boolean,
  ): void {
    // Depth-first traversal.
    for (const ss of system.systems) {
      this.computeGridObjectTitles(
        ss,
        hidden || this.options.blackBoxes.includes(ss.canonicalId),
      );
    }

    // Root system.
    if (!system.canonicalId) {
      return;
    }

    const blackbox = this.options.blackBoxes.includes(system.canonicalId);

    if (!blackbox && hidden) {
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
}
