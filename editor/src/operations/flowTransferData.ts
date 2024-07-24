import { modifySpecification, tickFlowPlayer } from "../simulation.js";
import SystemSelector from "../systemSelector.js";
import { State } from "../state.js";
import Operation from "../operation.js";
import { viewport } from "../viewport.js";
import { addFlowStep, removeFlowStep } from "@gg/core";

const selectLinkVisual1 = new SystemSelector();
const selectLinkVisual2 = new SystemSelector();

function onPointerMove(state: State): void {
  const link = state.simulator.getLinkAt(state.x, state.y);

  if (link) {
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
      const steps = state.system.flows.at(0)?.steps ?? [];

      const step = steps.find(
        s =>
          (s.keyframe === state.flowKeyframe &&
            s.from === link.a &&
            s.to === link.b) ||
          (s.from === link.b && s.to === link.a),
      );

      if (step && step.from === link.a) {
        const { specification } = step!;

        const { from } = specification;

        specification.from = specification.to;
        specification.to = from;
      } else if (step) {
        removeFlowStep(state.system, step);
      } else {
        addFlowStep(state.system, state.flowKeyframe, link.a, link.b);
      }
    });

    tickFlowPlayer();
    onPointerMove(state);
  },
  onPointerDown: () => {},
  onPointerMove,
};

export default operation;
