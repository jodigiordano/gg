import { addSubsystem, SystemMinSize } from "@gg/core";
import { State } from "../state.js";
import { pauseViewport } from "../viewport.js";
import { modifySpecification } from "../simulator/api.js";
import Operation from "../operation.js";
import {
  createSystemSelector,
  setSystemSelectorPosition,
  setSystemSelectorPositionRect,
  setSystemSelectorVisible,
} from "../renderer/api.js";

let placeholderVisual: string;
let parentVisual: string;

function onPointerMove(state: State): void {
  setSystemSelectorPositionRect(
    placeholderVisual,
    state.x,
    state.y,
    state.x + SystemMinSize.width - 1,
    state.y + SystemMinSize.height - 1,
  );

  const parent = state.simulator.getSubsystemAt(state.x, state.y);

  if (parent) {
    setSystemSelectorPosition(parentVisual, parent, { x: 0, y: 0 });
    setSystemSelectorVisible(parentVisual, true);
  } else {
    setSystemSelectorVisible(parentVisual, false);
  }
}

let pointerIsDown = false;

const operation: Operation = {
  id: "operation-system-add",
  setup: () => {
    placeholderVisual = createSystemSelector();
    parentVisual = createSystemSelector();
  },
  onBegin: state => {
    setSystemSelectorVisible(placeholderVisual, true);

    pointerIsDown = false;

    onPointerMove(state);
  },
  onEnd: () => {
    setSystemSelectorVisible(placeholderVisual, false);
    setSystemSelectorVisible(parentVisual, false);

    pauseViewport(false);
  },
  onMute: () => {
    setSystemSelectorVisible(placeholderVisual, false);
    setSystemSelectorVisible(parentVisual, false);
  },
  onUnmute: state => {
    setSystemSelectorVisible(placeholderVisual, true);

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
    }).then(() => {
      onPointerMove(state);
    });

    pauseViewport(false);
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

    onPointerMove(state);
  },
  onPointerMove: state => {
    if (pointerIsDown) {
      pauseViewport(true);
    }

    onPointerMove(state);
  },
};

export default operation;
