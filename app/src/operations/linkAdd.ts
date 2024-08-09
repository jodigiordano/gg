import { addLink, RuntimeSubsystem } from "@gg/core";
import { modifySpecification } from "../simulator/api.js";
import Operation from "../operation.js";
import { State } from "../state.js";
import { pauseViewport } from "../viewport.js";
import {
  createSystemLinker,
  createSystemSelector,
  setSystemLinkerPosition,
  setSystemLinkerVisible,
  setSystemSelectorPosition,
  setSystemSelectorVisible,
} from "../renderer/api.js";

let selectAVisual: string;
let selectBVisual: string;
let linkingLine: string;

let a: RuntimeSubsystem | null = null;

function onPointerMove(state: State) {
  const subsystem = state.simulator.getSubsystemAt(state.x, state.y);

  if (a) {
    setSystemSelectorVisible(selectAVisual, true);
    setSystemSelectorPosition(selectAVisual, a, { x: 0, y: 0 });

    if (subsystem && !subsystem.systems.length) {
      setSystemSelectorVisible(selectBVisual, true);
      setSystemSelectorPosition(selectBVisual, subsystem, { x: 0, y: 0 });
    } else {
      setSystemSelectorVisible(selectBVisual, false);
    }

    setSystemLinkerVisible(linkingLine, true);
    setSystemLinkerPosition(
      linkingLine,
      a.position.x + a.size.width / 2,
      a.position.y + a.size.height / 2,
      state.x,
      state.y,
    );
  } else {
    setSystemSelectorVisible(selectBVisual, false);
    setSystemLinkerVisible(linkingLine, false);

    if (subsystem && !subsystem.systems.length) {
      setSystemSelectorVisible(selectAVisual, true);
      setSystemSelectorPosition(selectAVisual, subsystem, { x: 0, y: 0 });
    } else {
      setSystemSelectorVisible(selectAVisual, false);
    }
  }
}

const operation: Operation = {
  id: "operation-link-add",
  setup: () => {
    selectAVisual = createSystemSelector();
    selectBVisual = createSystemSelector();
    linkingLine = createSystemLinker();
  },
  onBegin: state => {
    a = null;

    onPointerMove(state);
  },
  onEnd: () => {
    setSystemSelectorVisible(selectAVisual, false);
    setSystemSelectorVisible(selectBVisual, false);
    setSystemLinkerVisible(linkingLine, false);

    pauseViewport(false);
  },
  onMute: () => {
    setSystemSelectorVisible(selectAVisual, false);
    setSystemSelectorVisible(selectBVisual, false);
    setSystemLinkerVisible(linkingLine, false);
  },
  onUnmute: onPointerMove,
  onPointerUp: state => {
    if (!a) {
      return;
    }

    // Apply operation.
    const b = state.simulator.getSubsystemAt(state.x, state.y);

    if (b && b.id !== a.id && !b.systems.length) {
      modifySpecification(() => {
        addLink(state.simulator.getSystem(), a!.id, b!.id);
      });
    }

    // Reset operation.
    a = null;

    pauseViewport(false);

    onPointerMove(state);
  },
  onPointerDown: state => {
    const subsystem = state.simulator.getSubsystemAt(state.x, state.y);

    if (!subsystem || subsystem.systems.length) {
      onPointerMove(state);
      return;
    }

    a = subsystem;

    pauseViewport(true);

    onPointerMove(state);
  },
  onPointerMove,
};

export default operation;
