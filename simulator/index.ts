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

export class Simulator {
  private system: RuntimeSystem;
  private grid: GridObjectType[][];

  constructor(system: RuntimeSystem) {
    this.system = system;
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

    // Add components & ports.
    for (const component of this.system.components) {
      // Ports padding.
      for (
        let i = component.position.x - 1;
        i < component.position.x + component.size.width + 1;
        i++
      ) {
        for (
          let j = component.position.y - 1;
          j < component.position.y + component.size.height + 1;
          j++
        ) {
          this.grid[i]![j] = GridObjectType.PortPadding;
          finderGrid.setWalkableAt(i, j, false);
        }
      }

      // Component.
      for (
        let i = component.position.x;
        i < component.position.x + component.size.width;
        i++
      ) {
        for (
          let j = component.position.y;
          j < component.position.y + component.size.height;
          j++
        ) {
          this.grid[i]![j] = GridObjectType.Component;
          finderGrid.setWalkableAt(i, j, false);
        }
      }

      // Ports.
      for (const port of component.ports) {
        this.grid[port.x]![port.y] = GridObjectType.Port;
        finderGrid.setWalkableAt(port.x, port.y, true);
      }
    }

    // Add links (pathfinding).
    const finder = new pathfinding.BestFirstFinder();

    for (const link of this.system.links) {
      const componentA = this.system.components.find(
        (component) => component.name === link.componentAName,
      );
      const componentB = this.system.components.find(
        (component) => component.name === link.componentBName,
      );

      if (componentA && componentB) {
        const componentAPort = componentA.ports.find(
          (port) => this.grid[port.x]![port.y] === GridObjectType.Port,
        );
        const componentBPort = componentB.ports.find(
          (port) => this.grid[port.x]![port.y] === GridObjectType.Port,
        );

        if (componentAPort && componentBPort) {
          const path = finder.findPath(
            componentAPort.x,
            componentAPort.y,
            componentBPort.x,
            componentBPort.y,
            finderGrid.clone(),
          );

          for (const [x, y] of path) {
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
}
