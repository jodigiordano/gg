import { removeLink, removeSubsystem } from "@gg/core";
import { modifySpecification } from "../simulator/api.js";
import SystemSelector from "../renderer/systemSelector.js";
import Operation from "../operation.js";
import { State } from "../state.js";
import viewport from "../renderer/viewport.js";
import { tick } from "../renderer/pixi.js";

const selectSystemVisual = new SystemSelector();
const selectLinkVisual1 = new SystemSelector();
const selectLinkVisual2 = new SystemSelector();

function onPointerMove(state: State) {
  selectSystemVisual.visible = false;
  selectLinkVisual1.visible = false;
  selectLinkVisual2.visible = false;
  viewport.pause = false;

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

  const subsystem = state.simulator.getSubsystemAt(state.x, state.y);

  if (subsystem) {
    selectSystemVisual.visible = true;
    selectSystemVisual.setPosition(subsystem, { x: 0, y: 0 });

    viewport.pause = true;
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
        removeLink(state.simulator.getSystem(), link);
      }).then(() => {
        onPointerMove(state);
        tick();
      });
    } else {
      const subsystem = state.simulator.getSubsystemAt(state.x, state.y);

      if (subsystem) {
        modifySpecification(() => {
          removeSubsystem(subsystem);
        }).then(() => {
          onPointerMove(state);
          tick();
        });
      }
    }

    onPointerMove(state);
  },
  onPointerDown: () => {},
  onPointerMove,
};

export default operation;
