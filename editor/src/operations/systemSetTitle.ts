import { RuntimeSubsystem, setSubsystemTitle } from "@gg/core";
import Operation from "../operation.js";
import SystemSelector from "../systemSelector.js";
import { modifySpecification } from "../simulation.js";
import { State } from "../state.js";
import { viewport } from "../viewport.js";
import { app } from "../pixi.js";
import { state } from "../state.js";

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

      // TODO: hmmm...
      app.ticker.update();
    }
  });

const selectVisual = new SystemSelector();

let subsystem: RuntimeSubsystem | null = null;

function onPointerMove(state: State) {
  if (dialog.open) {
    selectVisual.setPosition(subsystem!, { x: 0, y: 0 });
    selectVisual.visible = true;
    viewport.pause = true;

    return;
  }

  const ss = state.simulator.getSubsystemAt(state.x, state.y);

  if (ss) {
    selectVisual.setPosition(ss, { x: 0, y: 0 });
    selectVisual.visible = true;
    viewport.pause = true;
  } else {
    selectVisual.visible = false;
    viewport.pause = false;
  }
}

const operation: Operation = {
  id: "operation-system-set-title",
  setup: () => {
    viewport.addChild(selectVisual);
  },
  onBegin: onPointerMove,
  onEnd() {
    selectVisual.visible = false;

    viewport.pause = false;
  },
  onMute: () => {
    selectVisual.visible = false;
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
