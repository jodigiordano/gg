import {
  RuntimeSubsystem,
  RuntimePosition,
  moveSubsystemToParent,
  moveSystem,
} from "@gg/core";
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

function isChildOf(a: RuntimeSubsystem, bId: string): boolean {
  return a.systems.some(ss => ss.id === bId || isChildOf(ss, bId));
}

function onPointerMove(state: State) {
  if (subsystem && pickedUpAt) {
    selectVisual.visible = true;
    selectVisual.setPosition(subsystem, { x: 0, y: 0 });

    moveVisual.visible = true;
    moveVisual.setPosition(subsystem, {
      x: state.x - pickedUpAt.x,
      y: state.y - pickedUpAt.y,
    });

    let parent = state.simulator.getSubsystemAt(state.x, state.y);

    if (
      // User moves the ss over itself.
      (parent?.id && parent.id === subsystem.id) ||
      // User moves the ss inside a child ss.
      (parent?.id && isChildOf(subsystem, parent.id))
    ) {
      parent = subsystem.parent as RuntimeSubsystem;
    }

    if (parent?.id) {
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
    if (!subsystem || !pickedUpAt) {
      return;
    }

    const parent =
      state.simulator.getSubsystemAt(state.x, state.y) ?? state.system;

    modifySpecification(() => {
      if (
        // User moves the ss over itself.
        subsystem!.id === parent.id ||
        // User moves the ss inside the same parent.
        subsystem!.parent!.id === parent.id ||
        // User moves the ss inside a child ss.
        (parent.id && isChildOf(subsystem!, parent.id))
      ) {
        moveSystem(
          subsystem!,
          state.x - pickedUpAt!.x,
          state.y - pickedUpAt!.y,
        );
      } else {
        let x: number;
        let y: number;

        if (parent.id) {
          const offset = state.simulator.getParentOffset(parent);

          x = Math.max(0, state.x - parent.position.x - offset.x);
          y = Math.max(0, state.y - parent.position.y - offset.y);
        } else {
          x = state.x + (subsystem!.position.x - pickedUpAt!.x);
          y = state.y + (subsystem!.position.y - pickedUpAt!.y);
        }

        moveSubsystemToParent(subsystem!, parent, x, y);

        if (parent.id) {
          parent.specification.hideSystems = false;
        }
      }
    });

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
