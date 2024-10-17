import Operation from "../operation.js";
import SystemSelector from "../renderer/systemSelector.js";
import { State } from "../state.js";
import viewport from "../renderer/viewport.js";
import { loadSimulation } from "../simulator/api.js";

const debugButton = document.getElementById("operation-debug")!;

if (import.meta.env.DEV) {
  debugButton.classList.remove("hidden");
}

const selectVisual = new SystemSelector();

function onPointerMove(state: State) {
  selectVisual.visible = false;

  const link =
    state.simulator.getLinkAt(state.x, state.y) ??
    state.simulator.getLinkByTitleAt(state.x, state.y);

  // The user is hovering a link.
  if (link) {
    selectVisual.visible = true;
    selectVisual.setPositionRect(state.x, state.y, state.x, state.y);

    return;
  }
}

const operation: Operation = {
  id: "operation-debug",
  setup: () => {
    viewport.addChild(selectVisual);
  },
  onBegin: () => {},
  onEnd: () => {
    selectVisual.visible = false;
  },
  onPointerUp: state => {
    const link =
      state.simulator.getLinkAt(state.x, state.y) ??
      state.simulator.getLinkByTitleAt(state.x, state.y);

    if (!link) {
      return;
    }

    const spec = JSON.stringify(
      state.simulator.getSystem().specification,
      null,
      2,
    );

    loadSimulation(spec, { linkIndexToDebug: link.index });
  },
  onPointerDown: () => {},
  onPointerMove,
  onKeyDown: () => {},
  onPointerEnter: () => {},
  onPointerLeave: () => {},
  onPointerDoublePress: () => {},
  onEvent: () => {},
};

export default operation;
