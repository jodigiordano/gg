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

const availableColors = dialog.querySelectorAll(".colors button");

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

const selectVisual1 = new SystemSelector();
const selectVisual2 = new SystemSelector();

function onPointerMove(state: State) {
  selectVisual1.visible = false;
  selectVisual2.visible = false;

  const linkByTitle = state.simulator.getLinkByTitleAt(state.x, state.y);

  if (linkByTitle && linkByTitle.title.length > 0) {
    selectVisual1.visible = true;
    selectVisual1.setPositionRect(
      linkByTitle.titlePosition.x,
      linkByTitle.titlePosition.y,
      linkByTitle.titlePosition.x + linkByTitle.titleSize.width,
      linkByTitle.titlePosition.y + linkByTitle.titleSize.height,
    );

    return;
  }

  const link = state.simulator.getLinkAt(state.x, state.y);

  if (link) {
    const path = state.simulator.getPath(link)!;
    const boundaries = state.simulator.getBoundaries();

    const [startX, startY] = path.at(0)!;

    selectVisual1.visible = true;
    selectVisual1.setPositionRect(
      startX - boundaries.translateX,
      startY - boundaries.translateY,
      startX - boundaries.translateX,
      startY - boundaries.translateY,
    );

    const [endX, endY] = path.at(-1)!;

    selectVisual2.visible = true;
    selectVisual2.setPositionRect(
      endX - boundaries.translateX,
      endY - boundaries.translateY,
      endX - boundaries.translateX,
      endY - boundaries.translateY,
    );

    return;
  }

  const ss = state.simulator.getSubsystemAt(state.x, state.y);

  if (ss) {
    selectVisual1.setPosition(ss, { x: 0, y: 0 });
    selectVisual1.visible = true;
  }
}

const operation: Operation = {
  id: "operation-set-color",
  setup: () => {
    viewport.addChild(selectVisual1);
    viewport.addChild(selectVisual2);
  },
  onBegin: state => {
    onPointerMove(state);

    dialog.inert = true;
    dialog.showModal();
    dialog.inert = false;
  },
  onEnd: () => {
    selectVisual1.visible = false;
    selectVisual2.visible = false;

    button.style.removeProperty("background-color");
    button.style.removeProperty("color");
  },
  onMute: () => {
    selectVisual1.visible = false;
    selectVisual2.visible = false;
  },
  onUnmute: onPointerMove,
  onPointerMove,
  onPointerDown: () => {},
  onKeyDown: () => {},
  onPointerUp: state => {
    const linkByTitle = state.simulator.getLinkByTitleAt(state.x, state.y);

    if (linkByTitle) {
      modifySpecification(() => {
        linkByTitle.specification.titleBackgroundColor = fillColor;
      }).then(() => {
        onPointerMove(state);
        tick();
      });

      return;
    }

    const link = state.simulator.getLinkAt(state.x, state.y);

    if (link) {
      modifySpecification(() => {
        link.specification.backgroundColor = fillColor;
      }).then(() => {
        onPointerMove(state);
        tick();
      });

      return;
    }

    const system = state.simulator.getSubsystemAt(state.x, state.y);

    if (system) {
      modifySpecification(() => {
        system.specification.backgroundColor = fillColor;
      }).then(() => {
        onPointerMove(state);
        tick();
      });
    }
  },
};

export default operation;
