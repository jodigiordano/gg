import SystemSelector from "../renderer/systemSelector.js";
import { State } from "../state.js";
import { modifySpecification } from "../simulation.js";
import Operation from "../operation.js";
import { viewport } from "../viewport.js";

const selectVisual = new SystemSelector();

function onPointerMove(state: State): void {
  const subsystem = state.simulator.getSubsystemAt(state.x, state.y);

  if (subsystem && subsystem.systems.length) {
    selectVisual.setPosition(subsystem, { x: 0, y: 0 });
    selectVisual.visible = true;
    viewport.pause = true;
  } else {
    selectVisual.visible = false;
    viewport.pause = false;
  }
}

const operation: Operation = {
  id: "operation-system-hide-systems",
  setup: () => {
    viewport.addChild(selectVisual);
  },
  onBegin: onPointerMove,
  onEnd: () => {
    selectVisual.visible = false;

    viewport.pause = false;
  },
  onMute: () => {
    selectVisual.visible = false;
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
    viewport.pause = false;

    onPointerMove(state);
  },
  onPointerDown: onPointerMove,
  onPointerMove,
};

export default operation;
