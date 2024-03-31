import { System } from '@dataflows/spec';

interface GridObject {}

const MAX_SIZE = 128;

export class Simulator {
  private system: System;
  private grid: GridObject[][];

  constructor(system: System) {
    this.system = system;
    this.grid = new Array(MAX_SIZE);

    for (let i = 0; i < MAX_SIZE; i++) {
      this.grid[i] = new Array(MAX_SIZE);
    }
  }

  layout() {
    for (const component of this.system.components) {
      // TODO: add positions to components.
    }
  }
}
