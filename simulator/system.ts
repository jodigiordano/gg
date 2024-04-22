import pathfinding from "pathfinding";
import { RuntimeSystem, RuntimeLimits } from "@dataflows/spec";

// TODO: add ComponentTopLeftCorner, ComponentTopRightCorner, ...
// TODO: add LinkRightTurn, LinkDownTurn, ...
export enum GridObjectType {
  Empty = 0,
  Component = 1,
  Link = 2,
  Port = 3,
  PortPadding = 4,
}

export class SystemSimulator {
  private system: RuntimeSystem;
  private routes: Record<string, Record<string, number[][]>>;
  private grid: GridObjectType[][];

  constructor(system: RuntimeSystem) {
    this.system = system;
    this.routes = {};
    this.grid = new Array(RuntimeLimits.MaxSystemHeight);

    // Create grid.
    for (let i = 0; i < RuntimeLimits.MaxSystemWidth; i++) {
      this.grid[i] = new Array(RuntimeLimits.MaxSystemWidth).fill(
        GridObjectType.Empty,
      );
    }

    const finderGrid = new pathfinding.Grid(
      RuntimeLimits.MaxSystemWidth,
      RuntimeLimits.MaxSystemHeight,
    );

    // Add sub-systems & ports.
    for (const subsystem of this.system.systems) {
      // Ports padding.
      for (
        let i = subsystem.position.x - 1;
        i < subsystem.position.x + subsystem.size.width + 1;
        i++
      ) {
        for (
          let j = subsystem.position.y - 1;
          j < subsystem.position.y + subsystem.size.height + 1;
          j++
        ) {
          this.grid[i]![j] = GridObjectType.PortPadding;
          finderGrid.setWalkableAt(i, j, false);
        }
      }

      // Component.
      for (
        let i = subsystem.position.x;
        i < subsystem.position.x + subsystem.size.width;
        i++
      ) {
        for (
          let j = subsystem.position.y;
          j < subsystem.position.y + subsystem.size.height;
          j++
        ) {
          this.grid[i]![j] = GridObjectType.Component;
          finderGrid.setWalkableAt(i, j, false);
        }
      }

      // Ports.
      for (const port of subsystem.ports) {
        this.grid[port.x]![port.y] = GridObjectType.Port;
        finderGrid.setWalkableAt(port.x, port.y, true);
      }
    }

    // Add links (pathfinding).
    const finder = new pathfinding.BestFirstFinder();

    for (const link of this.system.links) {
      const subsystemA = this.system.systems.find(
        subsystem => subsystem.id === link.a,
      );

      const subsystemB = this.system.systems.find(
        subsystem => subsystem.id === link.b,
      );

      if (subsystemA && subsystemB) {
        const subsystemAPort = subsystemA.ports.find(
          port => this.grid[port.x]![port.y] === GridObjectType.Port,
        );

        const subsystemBPort = subsystemB.ports.find(
          port => this.grid[port.x]![port.y] === GridObjectType.Port,
        );

        if (subsystemAPort && subsystemBPort) {
          const route = finder.findPath(
            subsystemAPort.x,
            subsystemAPort.y,
            subsystemBPort.x,
            subsystemBPort.y,
            finderGrid.clone(),
          );

          this.routes[subsystemA.id] ??= {};
          this.routes[subsystemA.id]![subsystemB.id] = route;

          this.routes[subsystemB.id] ??= {};
          this.routes[subsystemB.id]![subsystemA.id] = route.slice().reverse();

          for (const [x, y] of route) {
            this.grid[x!]![y!] = GridObjectType.Link;
            finderGrid.setWalkableAt(x!, y!, false);
          }
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
}
