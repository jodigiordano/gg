import { addSubsystem, SystemMinSize } from "@gg/core";
import SystemSelector from "../renderer/systemSelector.js";
import { State } from "../state.js";
import { modifySpecification } from "../simulation.js";
import Operation from "../operation.js";
import { viewport } from "../viewport.js";

const placeholderVisual = new SystemSelector();
const parentVisual = new SystemSelector();

function onPointerMove(state: State): void {
  placeholderVisual.setPositionRect(
    state.x,
    state.y,
    state.x + SystemMinSize.width - 1,
    state.y + SystemMinSize.height - 1,
  );

  const parent = state.simulator.getSubsystemAt(state.x, state.y);

  if (parent) {
    parentVisual.setPosition(parent, { x: 0, y: 0 });
    parentVisual.visible = true;
  } else {
    parentVisual.visible = false;
  }
}

let pointerIsDown = false;

const operation: Operation = {
  id: "operation-system-add",
  setup: () => {
    viewport.addChild(placeholderVisual);
    viewport.addChild(parentVisual);
  },
  onBegin: state => {
    placeholderVisual.visible = true;

    pointerIsDown = false;

    onPointerMove(state);
  },
  onEnd: () => {
    placeholderVisual.visible = false;
    parentVisual.visible = false;

    viewport.pause = false;
  },
  onMute: () => {
    placeholderVisual.visible = false;
    parentVisual.visible = false;
  },
  onUnmute: state => {
    placeholderVisual.visible = true;

    onPointerMove(state);
  },
  onPointerUp: state => {
    const parent =
      state.simulator.getSubsystemAt(state.x, state.y) ??
      state.simulator.getSystem();

    let x: number;
    let y: number;

    if (parent.id) {
      const offset = state.simulator.getParentOffset(parent);

      x = Math.max(0, state.x - parent.position.x - offset.x);
      y = Math.max(0, state.y - parent.position.y - offset.y);
    } else {
      x = state.x;
      y = state.y;
    }

    modifySpecification(() => {
      addSubsystem(parent, x, y, "");
    });

    viewport.pause = false;
    pointerIsDown = false;

    onPointerMove(state);
  },
  // This code is only necessary on mobile.
  //
  // On mobile, there is no mouse pointer being drag around.
  // Therefore, the position of the overlay is only updated
  // on "pointerdown". Here we update the position of the overlay
  // so it appears under the pointer for this event.
  onPointerDown: state => {
    pointerIsDown = true;

    onPointerMove(state);
  },
  onPointerMove: state => {
    if (pointerIsDown) {
      viewport.pause = true;
    }

    onPointerMove(state);
  },
};

export default operation;
