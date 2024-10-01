import {
  removeLink,
  removeSubsystems,
  RuntimePosition,
  RuntimeSubsystem,
} from "@gg/core";
import { modifySpecification } from "../simulator/api.js";
import SystemSelector from "../renderer/systemSelector.js";
import Operation from "../operation.js";
import { State } from "../state.js";
import viewport from "../renderer/viewport.js";
import { tick } from "../renderer/pixi.js";
import MultiSystemSelector from "../renderer/multiSystemSelector.js";

//
// Erase multiple systems.
//

const multiSelectVisual = new MultiSystemSelector();

multiSelectVisual.tint = "#e6194b";

let multiSelectStartAt: RuntimePosition | null = null;
let multiSelectEndAt: RuntimePosition | null = null;

//
// Erase one system.
//

const selectSystemVisual = new SystemSelector();

selectSystemVisual.tint = "#e6194b";

//
// Erase one link.
//

const selectLinkVisual1 = new SystemSelector();
const selectLinkVisual2 = new SystemSelector();

selectLinkVisual1.tint = "#e6194b";
selectLinkVisual2.tint = "#e6194b";

//
// Handlers.
//

function isSystemPadding(
  subsystem: RuntimeSubsystem,
  x: number,
  y: number,
): boolean {
  const insideSystem =
    x >= subsystem.position.x + 1 &&
    x <= subsystem.position.x + subsystem.size.width - 2 &&
    y >= subsystem.position.y + 1 &&
    y <= subsystem.position.y + subsystem.size.height - 2;

  return !insideSystem;
}

function onPointerMove(state: State) {
  multiSelectVisual.visible = true;
  multiSelectVisual.lassoVisible = false;
  multiSelectVisual.selectedVisible = true;
  selectSystemVisual.visible = false;
  selectLinkVisual1.visible = false;
  selectLinkVisual2.visible = false;

  //
  // Erase multiple systems.
  //
  if (multiSelectStartAt) {
    multiSelectVisual.lassoVisible = true;

    multiSelectEndAt = { x: state.x, y: state.y };

    multiSelectVisual.setLassoPosition(
      multiSelectStartAt.x,
      multiSelectStartAt.y,
      multiSelectEndAt.x,
      multiSelectEndAt.y,
    );

    multiSelectVisual.setSelectedFromLasso(state.simulator);

    return;
  }

  const link = state.simulator.getLinkAt(state.x, state.y);

  if (link) {
    const path = state.simulator.getPath(link)!;
    const boundaries = state.simulator.getBoundaries();

    const [startX, startY] = path.at(0)!;

    selectLinkVisual1.visible = true;
    selectLinkVisual1.setPositionRect(
      startX - boundaries.translateX,
      startY - boundaries.translateY,
      startX - boundaries.translateX,
      startY - boundaries.translateY,
    );

    const [endX, endY] = path.at(-1)!;

    selectLinkVisual2.visible = true;
    selectLinkVisual2.setPositionRect(
      endX - boundaries.translateX,
      endY - boundaries.translateY,
      endX - boundaries.translateX,
      endY - boundaries.translateY,
    );

    viewport.pause = true;

    return;
  }

  const subsystem = state.simulator.getSubsystemAt(state.x, state.y);

  if (
    /* Whitebox */
    (subsystem &&
      subsystem.systems.length &&
      isSystemPadding(subsystem, state.x, state.y)) ||
    /* Blackbox */
    (subsystem && !subsystem.systems.length)
  ) {
    selectSystemVisual.visible = true;
    selectSystemVisual.setPosition(subsystem, { x: 0, y: 0 });

    viewport.pause = true;
  }
}

function onBegin(state: State): void {
  //
  // Erase multiple systems.
  //
  multiSelectVisual.reset();
  multiSelectVisual.visible = false;
  multiSelectVisual.lassoVisible = false;
  multiSelectVisual.selectedVisible = false;

  multiSelectStartAt = null;
  multiSelectEndAt = null;

  //
  // Shared.
  //
  viewport.pause = false;
  onPointerMove(state);
}

const operation: Operation = {
  id: "operation-erase",
  setup: () => {
    viewport.addChild(multiSelectVisual);
    viewport.addChild(selectSystemVisual);
    viewport.addChild(selectLinkVisual1);
    viewport.addChild(selectLinkVisual2);
  },
  onBegin,
  onEnd: () => {
    multiSelectVisual.visible = false;
    selectSystemVisual.visible = false;
    selectLinkVisual1.visible = false;
    selectLinkVisual2.visible = false;

    viewport.pause = false;
  },
  onMute: () => {
    multiSelectVisual.visible = false;
    selectSystemVisual.visible = false;
    selectLinkVisual1.visible = false;
    selectLinkVisual2.visible = false;
  },
  onUnmute: onPointerMove,
  onPointerDown: state => {
    viewport.pause = true;

    //
    // Erase one link.
    //
    const link = state.simulator.getLinkAt(state.x, state.y);

    if (link) {
      return;
    }

    //
    // Erase one system.
    //
    const subsystem = state.simulator.getSubsystemAt(state.x, state.y);

    if (
      /* Whitebox */
      (subsystem &&
        subsystem.systems.length &&
        isSystemPadding(subsystem, state.x, state.y)) ||
      /* Blackbox */
      (subsystem && !subsystem.systems.length)
    ) {
      return;
    }

    //
    // Erase multiple systems.
    //
    multiSelectStartAt = { x: state.x, y: state.y };
    multiSelectEndAt = null;

    onPointerMove(state);
  },
  onPointerUp: state => {
    //
    // Erase multiple systems.
    //
    if (multiSelectStartAt && multiSelectEndAt) {
      // Systems are selected in onPointerMove.
      if (multiSelectVisual.selected.length) {
        modifySpecification(() => {
          removeSubsystems(multiSelectVisual.selected);
        }).then(() => {
          onBegin(state);
          tick();
        });
      } else {
        onBegin(state);
      }

      return;
    }

    //
    // Erase one link.
    //
    const link = state.simulator.getLinkAt(state.x, state.y);

    if (link) {
      modifySpecification(() => {
        removeLink(state.simulator.getSystem(), link);
      }).then(() => {
        onBegin(state);
        tick();
      });

      return;
    }

    //
    // Erase one system.
    //
    const subsystem = state.simulator.getSubsystemAt(state.x, state.y);

    if (
      /* Whitebox */
      (subsystem &&
        subsystem.systems.length &&
        isSystemPadding(subsystem, state.x, state.y)) ||
      /* Blackbox */
      (subsystem && !subsystem.systems.length)
    ) {
      modifySpecification(() => {
        removeSubsystems([subsystem]);
      }).then(() => {
        onBegin(state);
        tick();
      });
    }

    //
    // Operation incomplete.
    //
    onBegin(state);
  },
  onPointerMove,
  onKeyDown: (state, event) => {
    //
    // Delete many systems.
    //
    if (multiSelectVisual.selected.length && event.key === "Delete") {
      modifySpecification(() => {
        removeSubsystems(multiSelectVisual.selected);
      }).then(() => {
        onBegin(state);
        tick();
      });

      return;
    }
  },
};

export default operation;
