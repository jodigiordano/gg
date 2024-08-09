import {
  RuntimeSubsystem,
  RuntimePosition,
  moveSubsystemToParent,
  moveSystem,
} from "@gg/core";
import { modifySpecification } from "../simulator/api.js";
import Operation from "../operation.js";
import { State } from "../state.js";
import { pauseViewport } from "../viewport.js";
import {
  createSystemSelector,
  setSystemSelectorPosition,
  setSystemSelectorVisible,
} from "../renderer/api.js";

let selectVisual: string;
let moveVisual: string;
let parentVisual: string;

let subsystem: RuntimeSubsystem | null = null;
let pickedUpAt: RuntimePosition | null = null;

function isChildOf(a: RuntimeSubsystem, bId: string): boolean {
  return a.systems.some(ss => ss.id === bId || isChildOf(ss, bId));
}

function onPointerMove(state: State) {
  if (subsystem && pickedUpAt) {
    setSystemSelectorVisible(selectVisual, true);
    setSystemSelectorPosition(selectVisual, subsystem, { x: 0, y: 0 });

    setSystemSelectorVisible(moveVisual, true);
    setSystemSelectorPosition(moveVisual, subsystem, {
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
      setSystemSelectorPosition(parentVisual, parent, { x: 0, y: 0 });
      setSystemSelectorVisible(parentVisual, true);
    } else {
      setSystemSelectorVisible(parentVisual, false);
    }
  } else {
    setSystemSelectorVisible(moveVisual, false);
    setSystemSelectorVisible(parentVisual, false);

    const subsystem = state.simulator.getSubsystemAt(state.x, state.y);

    if (subsystem) {
      setSystemSelectorPosition(selectVisual, subsystem, { x: 0, y: 0 });
      setSystemSelectorVisible(selectVisual, true);
    } else {
      setSystemSelectorVisible(selectVisual, false);
    }
  }
}

const operation: Operation = {
  id: "operation-system-set-parent",
  setup: () => {
    selectVisual = createSystemSelector();
    moveVisual = createSystemSelector();
    parentVisual = createSystemSelector();
  },
  onBegin: state => {
    subsystem = null;
    pickedUpAt = null;

    onPointerMove(state);
  },
  onEnd: () => {
    setSystemSelectorVisible(selectVisual, false);
    setSystemSelectorVisible(moveVisual, false);
    setSystemSelectorVisible(parentVisual, false);

    pauseViewport(false);
  },
  onMute: () => {
    setSystemSelectorVisible(selectVisual, false);
    setSystemSelectorVisible(moveVisual, false);
    setSystemSelectorVisible(parentVisual, false);
  },
  onUnmute: onPointerMove,
  onPointerUp: state => {
    if (!subsystem || !pickedUpAt) {
      return;
    }

    const parent =
      state.simulator.getSubsystemAt(state.x, state.y) ??
      state.simulator.getSystem();

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
    pauseViewport(false);

    subsystem = null;
    pickedUpAt = null;

    onPointerMove(state);
  },
  onPointerDown: state => {
    const ss = state.simulator.getSubsystemAt(state.x, state.y);

    if (!ss) {
      // Reset operation.
      pauseViewport(false);

      subsystem = null;
      pickedUpAt = null;

      onPointerMove(state);

      return;
    }

    pauseViewport(true);

    subsystem = ss;
    pickedUpAt = { x: state.x, y: state.y };

    onPointerMove(state);
  },
  onPointerMove,
};

export default operation;
