import { State } from "../state.js";
import { pauseViewport } from "../viewport.js";
import { modifySpecification } from "../simulator/api.js";
import Operation from "../operation.js";
import {
  createSystemSelector,
  setSystemSelectorPosition,
  setSystemSelectorVisible,
} from "../renderer/api.js";

let selectVisual: string;

function onPointerMove(state: State): void {
  const subsystem = state.simulator.getSubsystemAt(state.x, state.y);

  if (subsystem && subsystem.systems.length) {
    setSystemSelectorPosition(selectVisual, subsystem, { x: 0, y: 0 });
    setSystemSelectorVisible(selectVisual, true);
    pauseViewport(true);
  } else {
    setSystemSelectorVisible(selectVisual, false);
    pauseViewport(false);
  }
}

const operation: Operation = {
  id: "operation-system-hide-systems",
  setup: () => {
    selectVisual = createSystemSelector();
  },
  onBegin: onPointerMove,
  onEnd: () => {
    setSystemSelectorVisible(selectVisual, false);

    pauseViewport(false);
  },
  onMute: () => {
    setSystemSelectorVisible(selectVisual, false);
  },
  onUnmute: onPointerMove,
  onPointerUp: state => {
    // Avoid performing the operation when the user does a
    // pointerdown => drag outside the subsystem => pointer up.
    const subsystem = state.simulator.getSubsystemAt(state.x, state.y);

    if (subsystem) {
      modifySpecification(() => {
        const { specification } = subsystem!;

        specification.hideSystems = !specification.hideSystems;
      });
    }

    // Reset operation.
    pauseViewport(false);

    onPointerMove(state);
  },
  onPointerDown: onPointerMove,
  onPointerMove,
};

export default operation;
