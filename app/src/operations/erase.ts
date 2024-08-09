import { removeLink, removeSubsystem } from "@gg/core";
import { modifySpecification } from "../simulator/api.js";
import Operation from "../operation.js";
import { State } from "../state.js";
import { pauseViewport } from "../viewport.js";
import {
  createSystemSelector,
  setSystemSelectorPosition,
  setSystemSelectorPositionRect,
  setSystemSelectorVisible,
} from "../renderer/api.js";

let selectSystemVisual: string;
let selectLinkVisual1: string;
let selectLinkVisual2: string;

function onPointerMove(state: State) {
  const link = state.simulator.getLinkAt(state.x, state.y);

  if (link) {
    setSystemSelectorVisible(selectSystemVisual, false);

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

    const subsystem = state.simulator.getSubsystemAt(state.x, state.y);

    if (subsystem) {
      setSystemSelectorVisible(selectSystemVisual, true);
      setSystemSelectorPosition(selectSystemVisual, subsystem, { x: 0, y: 0 });

      pauseViewport(true);
    } else {
      setSystemSelectorVisible(selectSystemVisual, false);

      pauseViewport(false);
    }
  }
}

const operation: Operation = {
  id: "operation-erase",
  setup: () => {
    selectSystemVisual = createSystemSelector();
    selectLinkVisual1 = createSystemSelector();
    selectLinkVisual2 = createSystemSelector();
  },
  onBegin: onPointerMove,
  onEnd: () => {
    setSystemSelectorVisible(selectSystemVisual, false);
    setSystemSelectorVisible(selectLinkVisual1, false);
    setSystemSelectorVisible(selectLinkVisual2, false);

    pauseViewport(false);
  },
  onMute: () => {
    setSystemSelectorVisible(selectSystemVisual, false);
    setSystemSelectorVisible(selectLinkVisual1, false);
    setSystemSelectorVisible(selectLinkVisual2, false);
  },
  onUnmute: onPointerMove,
  onPointerUp: state => {
    const link = state.simulator.getLinkAt(state.x, state.y);

    if (link) {
      modifySpecification(() => {
        removeLink(state.simulator.getSystem(), link);
      }).then(() => {
        onPointerMove(state);
      });
    } else {
      const subsystem = state.simulator.getSubsystemAt(state.x, state.y);

      if (subsystem) {
        modifySpecification(() => {
          removeSubsystem(subsystem);
        }).then(() => {
          onPointerMove(state);
        });
      }
    }
  },
  onPointerDown: () => {},
  onPointerMove,
};

export default operation;
