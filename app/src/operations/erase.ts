import { removeLink, removeSubsystem } from "@gg/core";
import { modifySpecification } from "../simulation.js";
import SystemSelector from "../systemSelector.js";
import Operation from "../operation.js";
import { State } from "../state.js";
import { viewport } from "../viewport.js";

const selectSystemVisual = new SystemSelector();
const selectLinkVisual1 = new SystemSelector();
const selectLinkVisual2 = new SystemSelector();

function onPointerMove(state: State) {
  const link = state.simulator.getLinkAt(state.x, state.y);

  if (link) {
    selectSystemVisual.visible = false;

    const route = state.simulator.getRoute(link.a, link.b)!;
    const boundaries = state.simulator.getBoundaries();

    const [startX, startY] = route.at(0)!;

    selectLinkVisual1.visible = true;
    selectLinkVisual1.setPositionRect(
      startX - boundaries.translateX,
      startY - boundaries.translateY,
      startX - boundaries.translateX,
      startY - boundaries.translateY,
    );

    const [endX, endY] = route.at(-1)!;

    selectLinkVisual2.visible = true;
    selectLinkVisual2.setPositionRect(
      endX - boundaries.translateX,
      endY - boundaries.translateY,
      endX - boundaries.translateX,
      endY - boundaries.translateY,
    );

    viewport.pause = true;
  } else {
    selectLinkVisual1.visible = false;
    selectLinkVisual2.visible = false;

    viewport.pause = false;

    const subsystem = state.simulator.getSubsystemAt(state.x, state.y);

    if (subsystem) {
      selectSystemVisual.visible = true;
      selectSystemVisual.setPosition(subsystem, { x: 0, y: 0 });

      viewport.pause = true;
    } else {
      selectSystemVisual.visible = false;

      viewport.pause = false;
    }
  }
}

const operation: Operation = {
  id: "operation-erase",
  setup: () => {
    viewport.addChild(selectSystemVisual);
    viewport.addChild(selectLinkVisual1);
    viewport.addChild(selectLinkVisual2);
  },
  onBegin: onPointerMove,
  onEnd: () => {
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
  onPointerUp: state => {
    const link = state.simulator.getLinkAt(state.x, state.y);

    if (link) {
      modifySpecification(() => {
        removeLink(state.system, link);
      });
    } else {
      const subsystem = state.simulator.getSubsystemAt(state.x, state.y);

      if (subsystem) {
        modifySpecification(() => {
          removeSubsystem(subsystem);
        });
      }
    }

    onPointerMove(state);
  },
  onPointerDown: () => {},
  onPointerMove,
};

export default operation;
