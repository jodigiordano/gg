import Operation from "../operation.js";
import SystemSelector from "../renderer/systemSelector.js";
import { State } from "../state.js";
import viewport from "../renderer/viewport.js";
import { modifySpecification } from "../simulator/api.js";
import { tick } from "../renderer/pixi.js";
import { getForegroundColor } from "../helpers.js";

const button = document.getElementById(
  "operation-set-color",
) as HTMLButtonElement;

const dialog = document.getElementById(
  "input-set-color-dialog",
) as HTMLDialogElement;

const availableColors = dialog.querySelectorAll(".colors div");

let fillColor: string | undefined = undefined;

for (const availableColor of availableColors) {
  availableColor.addEventListener("click", function () {
    fillColor = (availableColor as HTMLDivElement).dataset.color;

    if (fillColor === "") {
      fillColor = undefined;
    }

    if (fillColor) {
      button.style.backgroundColor = fillColor;
      button.style.color = getForegroundColor(fillColor);
    } else {
      button.style.removeProperty("background-color");
      button.style.removeProperty("color");
    }

    dialog.close();
  });
}

const selectSystemVisual = new SystemSelector();
const selectLinkTitleVisual = new SystemSelector();

function onPointerMove(state: State) {
  selectSystemVisual.visible = false;
  selectLinkTitleVisual.visible = false;
  viewport.pause = false;

  const link = state.simulator.getLinkByTitleAt(state.x, state.y);

  if (link && link.title.length > 0) {
    selectLinkTitleVisual.visible = true;
    selectLinkTitleVisual.setPositionRect(
      link.titlePosition.x,
      link.titlePosition.y,
      link.titlePosition.x + link.titleSize.width,
      link.titlePosition.y + link.titleSize.height,
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
  id: "operation-set-color",
  setup: () => {
    viewport.addChild(selectSystemVisual);
    viewport.addChild(selectLinkTitleVisual);
  },
  onBegin: state => {
    onPointerMove(state);

    dialog.inert = true;
    dialog.showModal();
    dialog.inert = false;
  },
  onEnd() {
    selectSystemVisual.visible = false;
    selectLinkTitleVisual.visible = false;

    button.style.removeProperty("background-color");
    button.style.removeProperty("color");

    viewport.pause = false;
  },
  onMute: () => {
    selectSystemVisual.visible = false;
    selectLinkTitleVisual.visible = false;
  },
  onUnmute: onPointerMove,
  onPointerMove,
  onPointerDown() {},
  onPointerUp(state) {
    const linkToEdit = state.simulator.getLinkByTitleAt(state.x, state.y);

    if (linkToEdit) {
      modifySpecification(() => {
        linkToEdit.specification.titleBackgroundColor = fillColor;
      }).then(() => {
        onPointerMove(state);
        tick();
      });

      return;
    }

    const systemToEdit = state.simulator.getSubsystemAt(state.x, state.y);

    if (systemToEdit) {
      modifySpecification(() => {
        systemToEdit.specification.backgroundColor = fillColor;
      }).then(() => {
        onPointerMove(state);
        tick();
      });
    }
  },
};

export default operation;
