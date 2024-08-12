import { RuntimeLink, RuntimeSubsystem, setSubsystemTitle, setLinkTitle } from "@gg/core";
import Operation from "../operation.js";
import SystemSelector from "../renderer/systemSelector.js";
import { modifySpecification } from "../simulator/api.js";
import { State } from "../state.js";
import viewport from "../renderer/viewport.js";
import { tick } from "../renderer/pixi.js";
import { state } from "../state.js";

const dialog = document.getElementById(
  "input-set-title-dialog",
) as HTMLDialogElement;

dialog.addEventListener("keydown", event => {
  event.stopPropagation();
});

const title = dialog.querySelector("h1") as HTMLElement;
const editor = dialog.querySelector("textarea") as HTMLTextAreaElement;

document
  .getElementById("operation-set-title-apply")
  ?.addEventListener("click", function () {
    if (editor.value) {
      // Apply operation.
      modifySpecification(() => {
        if (subsystem) {
          setSubsystemTitle(subsystem, editor.value.replace(/\n/g, "\\n"));
        } else if (link) {
          setLinkTitle(link, editor.value.replace(/\n/g, "\\n"));
        }
      }).then(() => {
        onPointerMove(state);
        tick();
      });

      // Reset operation.
      dialog.close();

      subsystem = null;
      link = null;

      onPointerMove(state);

      tick();
    }
  });

const selectSystemVisual = new SystemSelector();
const selectLinkVisual1 = new SystemSelector();
const selectLinkVisual2 = new SystemSelector();

let subsystem: RuntimeSubsystem | null = null;
let link: RuntimeLink | null = null;

function onPointerMove(state: State) {
  selectSystemVisual.visible = false;
  selectLinkVisual1.visible = false;
  selectLinkVisual2.visible = false;
  viewport.pause = false;

  if (dialog.open) {
    selectSystemVisual.setPosition(subsystem!, { x: 0, y: 0 });
    selectSystemVisual.visible = true;
    viewport.pause = true;

    return;
  }

  const link = state.simulator.getLinkAt(state.x, state.y);

  if (link) {
    const path = state.simulator.getPath(link.a, link.b)!;
    const boundaries = state.simulator.getBoundaries();

    const [startX, startY] = path.at(0)!;

    selectLinkVisual1.visible = true;
    selectLinkVisual1.setPositionRect(
      startX - boundaries.translateX,
      startY - boundaries.translateY,
      startX - boundaries.translateX,
      startY - boundaries.translateY,
    );

    const [endX, endY] = path.at(-1)!;

    selectLinkVisual2.visible = true;
    selectLinkVisual2.setPositionRect(
      endX - boundaries.translateX,
      endY - boundaries.translateY,
      endX - boundaries.translateX,
      endY - boundaries.translateY,
    );

    viewport.pause = true;

    return;
  }

  const ss = state.simulator.getSubsystemAt(state.x, state.y);

  if (ss) {
    selectSystemVisual.setPosition(ss, { x: 0, y: 0 });
    selectSystemVisual.visible = true;
    viewport.pause = true;
  }
}

const operation: Operation = {
  id: "operation-set-title",
  setup: () => {
    viewport.addChild(selectSystemVisual);
    viewport.addChild(selectLinkVisual1);
    viewport.addChild(selectLinkVisual2);
  },
  onBegin: onPointerMove,
  onEnd() {
    selectSystemVisual.visible = false;
    selectLinkVisual1.visible = false;
    selectLinkVisual2.visible = false;

    viewport.pause = false;
  },
  onMute: () => {
    selectSystemVisual.visible = false;
    selectLinkVisual1.visible = false;
    selectLinkVisual2.visible = false;
  },
  onUnmute: onPointerMove,
  onPointerMove,
  onPointerDown() {},
  onPointerUp(state) {
    if (dialog.open) {
      return;
    }

    const linkToEdit = state.simulator.getLinkAt(state.x, state.y);

    if (linkToEdit) {
      link = linkToEdit;

      title.innerHTML = link.title ? "Edit title" : "Add title";
      editor.value = link.title.replace(/\\n/g, "\n");

      dialog.showModal();

      return;
    }

    const systemToEdit = state.simulator.getSubsystemAt(state.x, state.y);

    if (systemToEdit) {
      subsystem = systemToEdit;

      title.innerHTML = subsystem.title ? "Edit title" : "Add title";
      editor.value = subsystem.title.replace(/\\n/g, "\n");

      dialog.showModal();
    }
  },
};

export default operation;
