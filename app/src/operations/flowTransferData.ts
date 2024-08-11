import { modifySpecification } from "../simulator/api.js";
import SystemSelector from "../renderer/systemSelector.js";
import { State } from "../state.js";
import Operation from "../operation.js";
import viewport from "../renderer/viewport.js";
import { addFlowStep, removeFlowStep } from "@gg/core";
import { tick } from "../renderer/pixi.js";

const selectLinkVisual1 = new SystemSelector();
const selectLinkVisual2 = new SystemSelector();

function onPointerMove(state: State): void {
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
  } else {
    selectLinkVisual1.visible = false;
    selectLinkVisual2.visible = false;
    viewport.pause = false;
  }
}

const operation: Operation = {
  id: "operation-flow-data-transfer",
  setup: () => {
    viewport.addChild(selectLinkVisual1);
    viewport.addChild(selectLinkVisual2);
  },
  onBegin: onPointerMove,
  onEnd: () => {
    selectLinkVisual1.visible = false;
    selectLinkVisual2.visible = false;

    viewport.pause = false;
  },
  onMute: () => {
    selectLinkVisual1.visible = false;
    selectLinkVisual2.visible = false;
  },
  onUnmute: onPointerMove,
  onPointerUp: state => {
    const link = state.simulator.getLinkAt(state.x, state.y);

    if (!link) {
      onPointerMove(state);
      return;
    }

    modifySpecification(() => {
      const system = state.simulator.getSystem();
      const steps = system.flows.at(0)?.steps ?? [];

      const keyframe = state.flowKeyframe | 0;

      const step = steps.find(
        s =>
          s.keyframe === keyframe &&
          ((s.from === link.a && s.to === link.b) ||
            (s.from === link.b && s.to === link.a)),
      );

      if (step && step.from === link.a) {
        const { specification } = step!;

        const { from } = specification;

        specification.from = specification.to;
        specification.to = from;
      } else if (step) {
        removeFlowStep(system, step);
      } else {
        addFlowStep(system, keyframe, link.a, link.b);
      }
    }).then(() => {
      state.flowPlayer?.draw();
      onPointerMove(state);
      tick();
    });

    onPointerMove(state);
  },
  onPointerDown: () => {},
  onPointerMove,
};

export default operation;
