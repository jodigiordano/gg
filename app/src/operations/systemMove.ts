import { RuntimeSubsystem, RuntimePosition, moveSystem } from "@gg/core";
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

let subsystem: RuntimeSubsystem | null = null;
let pickedUpAt: RuntimePosition | null = null;

function onPointerMove(state: State) {
  if (subsystem && pickedUpAt) {
    setSystemSelectorVisible(selectVisual, true);
    setSystemSelectorPosition(selectVisual, subsystem, { x: 0, y: 0 });

    setSystemSelectorVisible(moveVisual, true);
    setSystemSelectorPosition(moveVisual, subsystem, {
      x: state.x - pickedUpAt.x,
      y: state.y - pickedUpAt.y,
    });
  } else {
    setSystemSelectorVisible(moveVisual, false);

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
  id: "operation-system-move",
  setup: () => {
    selectVisual = createSystemSelector();
    moveVisual = createSystemSelector();
  },
  onBegin: state => {
    subsystem = null;
    pickedUpAt = null;

    onPointerMove(state);
  },
  onEnd: () => {
    setSystemSelectorVisible(selectVisual, false);
    setSystemSelectorVisible(moveVisual, false);

    pauseViewport(false);
  },
  onMute: () => {
    setSystemSelectorVisible(selectVisual, false);
    setSystemSelectorVisible(moveVisual, false);
  },
  onUnmute: onPointerMove,
  onPointerDown: state => {
    const ss = state.simulator.getSubsystemAt(state.x, state.y);

    if (!ss) {
      onPointerMove(state);
      return;
    }

    pauseViewport(true);

    subsystem = ss;
    pickedUpAt = { x: state.x, y: state.y };

    onPointerMove(state);
  },
  onPointerUp: state => {
    if (!subsystem || !pickedUpAt) {
      return;
    }

    const deltaX = state.x - pickedUpAt.x;
    const deltaY = state.y - pickedUpAt.y;

    modifySpecification(() => {
      moveSystem(subsystem!, deltaX, deltaY);
    });

    setSystemSelectorPosition(selectVisual, subsystem, {
      x: deltaX,
      y: deltaY,
    });

    // Reset operation.
    pauseViewport(false);

    subsystem = null;
    pickedUpAt = null;

    onPointerMove(state);
  },
  onPointerMove,
};

export default operation;
