import { RuntimeSubsystem, setSubsystemTitle } from "@gg/core";
import Operation from "../operation.js";
import { modifySpecification } from "../simulator/api.js";
import { State } from "../state.js";
import { state } from "../state.js";
import { pauseViewport } from "../viewport.js";
import {
  createSystemSelector,
  setSystemSelectorPosition,
  setSystemSelectorVisible,
} from "../renderer/api.js";

const dialog = document.getElementById(
  "input-system-set-title-dialog",
) as HTMLDialogElement;

dialog.addEventListener("keydown", event => {
  event.stopPropagation();
});

const title = dialog.querySelector("h1") as HTMLElement;
const editor = dialog.querySelector("textarea") as HTMLTextAreaElement;

document
  .getElementById("operation-system-set-title-apply")
  ?.addEventListener("click", function () {
    if (editor.value) {
      // Apply operation.
      modifySpecification(() => {
        setSubsystemTitle(subsystem!, editor.value.replace(/\n/g, "\\n"));
      });

      // Reset operation.
      dialog.close();

      subsystem = null;

      onPointerMove(state);
    }
  });

let selectVisual: string;

let subsystem: RuntimeSubsystem | null = null;

function onPointerMove(state: State) {
  if (dialog.open) {
    setSystemSelectorPosition(selectVisual, subsystem!, { x: 0, y: 0 });
    setSystemSelectorVisible(selectVisual, true);
    pauseViewport(true);

    return;
  }

  const ss = state.simulator.getSubsystemAt(state.x, state.y);

  if (ss) {
    setSystemSelectorPosition(selectVisual, ss, { x: 0, y: 0 });
    setSystemSelectorVisible(selectVisual, true);
    pauseViewport(true);
  } else {
    setSystemSelectorVisible(selectVisual, false);
    pauseViewport(false);
  }
}

const operation: Operation = {
  id: "operation-system-set-title",
  setup: () => {
    selectVisual = createSystemSelector();
  },
  onBegin: onPointerMove,
  onEnd() {
    setSystemSelectorVisible(selectVisual, false);

    pauseViewport(false);
  },
  onMute: () => {
    setSystemSelectorVisible(selectVisual, false);
  },
  onUnmute: onPointerMove,
  onPointerMove,
  onPointerDown() {},
  onPointerUp(state) {
    if (dialog.open) {
      return;
    }

    const ss = state.simulator.getSubsystemAt(state.x, state.y);

    if (!ss) {
      return;
    }

    subsystem = ss;

    title.innerHTML = subsystem.title ? "Edit title" : "Add title";
    editor.value = subsystem.title.replace(/\\n/g, "\n");

    dialog.showModal();
  },
};

export default operation;
