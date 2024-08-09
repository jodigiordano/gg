import { addFlowStep, removeFlowStep } from "@gg/core";
import { modifySpecification } from "../simulator/api.js";
import { State } from "../state.js";
import { pauseViewport } from "../viewport.js";
import Operation from "../operation.js";
import {
  createSystemSelector,
  setSystemSelectorPositionRect,
  setSystemSelectorVisible,
} from "../renderer/api.js";

let selectLinkVisual1: string;
let selectLinkVisual2: string;

function onPointerMove(state: State): void {
  const link = state.simulator.getLinkAt(state.x, state.y);

  if (link) {
    const route = state.simulator.getRoute(link.a, link.b)!;
    const boundaries = state.simulator.getBoundaries();

    const [startX, startY] = route.at(0)!;

    setSystemSelectorVisible(selectLinkVisual1, true);
    setSystemSelectorPositionRect(
      selectLinkVisual1,
      startX - boundaries.translateX,
      startY - boundaries.translateY,
      startX - boundaries.translateX,
      startY - boundaries.translateY,
    );

    const [endX, endY] = route.at(-1)!;

    setSystemSelectorVisible(selectLinkVisual2, true);
    setSystemSelectorPositionRect(
      selectLinkVisual2,
      endX - boundaries.translateX,
      endY - boundaries.translateY,
      endX - boundaries.translateX,
      endY - boundaries.translateY,
    );

    pauseViewport(true);
  } else {
    setSystemSelectorVisible(selectLinkVisual1, false);
    setSystemSelectorVisible(selectLinkVisual2, false);
    pauseViewport(false);
  }
}

const operation: Operation = {
  id: "operation-flow-data-transfer",
  setup: () => {
    selectLinkVisual1 = createSystemSelector();
    selectLinkVisual2 = createSystemSelector();
  },
  onBegin: onPointerMove,
  onEnd: () => {
    setSystemSelectorVisible(selectLinkVisual1, false);
    setSystemSelectorVisible(selectLinkVisual2, false);

    pauseViewport(false);
  },
  onMute: () => {
    setSystemSelectorVisible(selectLinkVisual1, false);
    setSystemSelectorVisible(selectLinkVisual2, false);
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
      state.flowKeyframe = state.flowKeyframe | 0;

      if (state.flowPlayer) {
        state.flowPlayer.setKeyframe(state.flowKeyframe);
        state.flowPlayer.draw();
      }
    });

    onPointerMove(state);
  },
  onPointerDown: () => {},
  onPointerMove,
};

export default operation;
