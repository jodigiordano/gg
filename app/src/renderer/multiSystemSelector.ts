import {
  RuntimePosition,
  RuntimeSubsystem,
  RuntimeSystem,
  SystemSimulator,
} from "@gg/core";
import { Container } from "pixi.js";
import SystemSelector from "./systemSelector.js";

export default class MultiSystemSelector extends Container {
  private lassoVisual: SystemSelector;
  private selectedVisual: Container;
  private parentAt: RuntimePosition;

  public selected: RuntimeSubsystem[];
  public lassoStart: RuntimePosition;
  public lassoEnd: RuntimePosition;

  constructor() {
    super();

    this.lassoVisual = new SystemSelector();
    this.selectedVisual = new Container();

    this.parentAt = { x: 0, y: 0 };

    this.selected = [];
    this.lassoStart = { x: 0, y: 0 };
    this.lassoEnd = { x: 0, y: 0 };

    this.zIndex = 100000;
    this.visible = false;

    // @ts-ignore
    this.addChild(this.lassoVisual);

    // @ts-ignore
    this.addChild(this.selectedVisual);
  }

  set selectedVisible(visible: boolean) {
    this.selectedVisual.visible = visible;
  }

  set lassoVisible(visible: boolean) {
    this.lassoVisual.visible = visible;
  }

  set tint(tint: string) {
    this.lassoVisual.tint = tint;
  }

  reset() {
    this.selected.length = 0;
    this.selectedVisual.removeChildren();
  }

  setSystemPosition(subsystem: RuntimeSubsystem, delta: RuntimePosition): void {
    for (const [index, ss] of this.selected.entries()) {
      if (ss.id === subsystem.id) {
        const visual = this.selectedVisual.children[index] as SystemSelector;

        visual.setPosition(subsystem, delta);

        return;
      }
    }
  }

  setLassoPosition(x1: number, y1: number, x2: number, y2: number): void {
    this.parentAt = { x: x1, y: y1 };

    if (x1 < x2 && y1 > y2) {
      //
      // x1,y1 +---+ end
      //       |   |
      // start +---+ x2,y2
      //
      this.lassoStart.x = x1;
      this.lassoStart.y = y2;
      this.lassoEnd.x = x2;
      this.lassoEnd.y = y1;
    } else if (x1 >= x2 && y1 >= y2) {
      //
      // end +---+
      //     |   |
      //     +---+ start
      //
      this.lassoStart.x = x2;
      this.lassoStart.y = y2;
      this.lassoEnd.x = x1;
      this.lassoEnd.y = y1;
    } else if (x1 > x2 && y1 < y2) {
      //
      // x1,y1 +---+ start
      //       |   |
      //   end +---+ x2,y2
      //
      this.lassoStart.x = x2;
      this.lassoStart.y = y1;
      this.lassoEnd.x = x1;
      this.lassoEnd.y = y2;
    } else {
      //
      // start +---+
      //       |   |
      //       +---+ end
      //
      this.lassoStart.x = x1;
      this.lassoStart.y = y1;
      this.lassoEnd.x = x2;
      this.lassoEnd.y = y2;
    }

    this.lassoVisual.setPositionRect(
      this.lassoStart.x,
      this.lassoStart.y,
      this.lassoEnd.x,
      this.lassoEnd.y,
    );
  }

  setSelectedFromSystem(system: RuntimeSystem): void {
    this.selected = [...system.systems];

    this.setSelectedVisuals();
  }

  setSelectedFromLasso(simulator: SystemSimulator): void {
    const parent =
      simulator.getWhiteboxAt(this.parentAt.x, this.parentAt.y) ??
      simulator.getSystem();

    this.selected = simulator.getSubsystemsAt(
      parent,
      this.lassoStart.x,
      this.lassoStart.y,
      this.lassoEnd.x,
      this.lassoEnd.y,
    );

    this.setSelectedVisuals();
  }

  // TODO: don't systematically re-create SystemSelectors.
  // Instead, re-use them.
  private setSelectedVisuals(): void {
    this.selectedVisual.removeChildren();

    for (const subsystem of this.selected) {
      const visual = new SystemSelector();
      visual.visible = true;
      visual.setPosition(subsystem, { x: 0, y: 0 });
      visual.tint = this.lassoVisual.tint;

      // @ts-ignore
      this.selectedVisual.addChild(visual);
    }
  }
}
