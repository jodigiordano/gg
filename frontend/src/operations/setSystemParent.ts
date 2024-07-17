import {
  RuntimeSubsystem,
  RuntimePosition,
  moveSubsystemToParent,
} from "@gg/spec";
import SystemSelector from "../systemSelector.js";
import { modifySpecification } from "../simulation.js";
import Operation from "../operation.js";
import { State } from "../state.js";
import { viewport } from "../viewport.js";

const selectVisual = new SystemSelector();
const moveVisual = new SystemSelector();
const parentVisual = new SystemSelector();

let subsystem: RuntimeSubsystem | null = null;
let pickedUpAt: RuntimePosition | null = null;

function onPointerMove(state: State) {
  if (subsystem && pickedUpAt) {
    selectVisual.visible = true;
    selectVisual.setPosition(subsystem, { x: 0, y: 0 });

    moveVisual.visible = true;
    moveVisual.setPosition(subsystem, {
      x: state.x - pickedUpAt.x,
      y: state.y - pickedUpAt.y,
    });

    const parent = state.simulator.getSubsystemAt(state.x, state.y);

    if (parent) {
      parentVisual.setPosition(parent, { x: 0, y: 0 });
      parentVisual.visible = true;
    } else {
      parentVisual.visible = false;
    }
  } else {
    moveVisual.visible = false;
    parentVisual.visible = false;

    const subsystem = state.simulator.getSubsystemAt(state.x, state.y);

    if (subsystem) {
      selectVisual.setPosition(subsystem, { x: 0, y: 0 });
      selectVisual.visible = true;
    } else {
      selectVisual.visible = false;
    }
  }
}

const operation: Operation = {
  id: "operation-system-set-parent",
  setup: () => {
    viewport.addChild(selectVisual);
    viewport.addChild(moveVisual);
    viewport.addChild(parentVisual);
  },
  onBegin: state => {
    subsystem = null;
    pickedUpAt = null;

    onPointerMove(state);
  },
  onEnd: () => {
    selectVisual.visible = false;
    moveVisual.visible = false;
    parentVisual.visible = false;

    viewport.pause = false;
  },
  onMute: () => {
    selectVisual.visible = false;
    moveVisual.visible = false;
    parentVisual.visible = false;
  },
  onUnmute: onPointerMove,
  onPointerUp: state => {
    if (!subsystem) {
      return;
    }

    const parent =
      state.simulator.getSubsystemAt(state.x, state.y) ?? state.system;

    if (
      parent.canonicalId !== subsystem.canonicalId &&
      parent.canonicalId !== subsystem.parent?.canonicalId
    ) {
      let x: number;
      let y: number;

      if (parent.canonicalId) {
        const offset = state.simulator.getParentOffset(parent);

        x = Math.max(0, state.x - parent.position.x - offset.x);
        y = Math.max(0, state.y - parent.position.y - offset.y);
      } else {
        x = state.x;
        y = state.y;
      }

      modifySpecification(() => {
        moveSubsystemToParent(subsystem!, parent, x, y);

        if (parent.canonicalId) {
          parent.specification.hideSystems = false;
        }
      });
    }

    // Reset operation.
    viewport.pause = false;

    subsystem = null;
    pickedUpAt = null;

    onPointerMove(state);
  },
  onPointerDown: state => {
    const ss = state.simulator.getSubsystemAt(state.x, state.y);

    if (!ss) {
      // Reset operation.
      viewport.pause = false;

      subsystem = null;
      pickedUpAt = null;

      onPointerMove(state);

      return;
    }

    viewport.pause = true;

    subsystem = ss;
    pickedUpAt = { x: state.x, y: state.y };

    onPointerMove(state);
  },
  onPointerMove,
};

export default operation;
