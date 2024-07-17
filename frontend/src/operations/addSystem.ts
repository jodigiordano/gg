import { addSubsystem, SystemMinSize } from "@gg/spec";
import SystemSelector from "../systemSelector.js";
import { State } from "../state.js";
import { modifySpecification } from "../simulation.js";
import Operation from "../operation.js";
import { viewport } from "../viewport.js";

const selectVisual = new SystemSelector();

function setSelectorPosition(state: State): void {
  selectVisual.setPositionRect(
    state.x,
    state.y,
    state.x + SystemMinSize.width - 1,
    state.y + SystemMinSize.height - 1,
  );
}

let pointerIsDown = false;

const operation: Operation = {
  id: "operation-system-add",
  setup: () => {
    viewport.addChild(selectVisual);
  },
  onBegin: state => {
    selectVisual.visible = true;

    pointerIsDown = false;

    setSelectorPosition(state);
  },
  onEnd: () => {
    selectVisual.visible = false;
  },
  onMute: () => {
    selectVisual.visible = false;
  },
  onUnmute: () => {
    selectVisual.visible = true;
  },
  onPointerUp: state => {
    const subsystem =
      state.simulator.getSubsystemAt(state.x, state.y) ?? state.system;

    modifySpecification(() => {
      addSubsystem(subsystem, state.x, state.y, "");
    });

    viewport.pause = false;
    pointerIsDown = false;
  },
  // This code is only necessary on mobile.
  //
  // On mobile, there is no mouse pointer being drag around.
  // Therefore, the position of the overlay is only updated
  // on "pointerdown". Here we update the position of the overlay
  // so it appears under the pointer for this event.
  onPointerDown: state => {
    pointerIsDown = true;
    setSelectorPosition(state);
  },
  onPointerMove: state => {
    if (pointerIsDown) {
      viewport.pause = true;
    }

    setSelectorPosition(state);
  },
};

export default operation;
