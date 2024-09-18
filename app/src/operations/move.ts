import {
  RuntimeSubsystem,
  RuntimePosition,
  moveSystem,
  RuntimeLink,
  moveLink,
} from "@gg/core";
import SystemSelector from "../renderer/systemSelector.js";
import { modifySpecification } from "../simulator/api.js";
import Operation from "../operation.js";
import { State } from "../state.js";
import viewport from "../renderer/viewport.js";
import { tick } from "../renderer/pixi.js";
import SystemLinker from "../renderer/systemLinker.js";

// System

const selectSystemVisual = new SystemSelector();
const moveSystemVisual = new SystemSelector();

let subsystem: RuntimeSubsystem | null = null;
let systemPickedUpAt: RuntimePosition | null = null;

// Link

const selectLinkVisual = new SystemSelector();
const moveLinkVisual = new SystemLinker();

let link: RuntimeLink | null = null;
let linkSystemIdToReplace: string | null = null;

function onPointerMove(state: State) {
  selectSystemVisual.visible = false;
  moveSystemVisual.visible = false;
  selectLinkVisual.visible = false;
  moveLinkVisual.visible = false;

  // Moving a link.
  if (link && linkSystemIdToReplace) {
    const path = state.simulator.getPath(link)!;
    const boundaries = state.simulator.getBoundaries();

    const [startX, startY] =
      linkSystemIdToReplace === link.b ? path.at(-1)! : path.at(0)!;

    moveLinkVisual.visible = true;
    moveLinkVisual.setPosition(
      startX - boundaries.translateX,
      startY - boundaries.translateY,
      state.x,
      state.y,
    );

    selectLinkVisual.visible = true;

    const ssToMoveLinkAt = state.simulator.getSubsystemAt(state.x, state.y);

    if (
      ssToMoveLinkAt &&
      !ssToMoveLinkAt.systems.length &&
      ssToMoveLinkAt.id !== link.a &&
      ssToMoveLinkAt.id !== link.b
    ) {
      selectSystemVisual.visible = true;
      selectSystemVisual.setPosition(ssToMoveLinkAt, { x: 0, y: 0 });

      subsystem = ssToMoveLinkAt;
    }

    return;
  }

  // Moving a system.
  if (subsystem && systemPickedUpAt) {
    selectSystemVisual.visible = true;
    selectSystemVisual.setPosition(subsystem, { x: 0, y: 0 });

    moveSystemVisual.visible = true;
    moveSystemVisual.setPosition(subsystem, {
      x: state.x - systemPickedUpAt.x,
      y: state.y - systemPickedUpAt.y,
    });

    return;
  }

  // Hovering a link.
  const linkToMove = state.simulator.getLinkAt(state.x, state.y);

  if (linkToMove) {
    const path = state.simulator.getPath(linkToMove)!;
    const boundaries = state.simulator.getBoundaries();

    const pathIndex = path.findIndex(
      ([x, y]) =>
        x === state.x + boundaries.translateX &&
        y === state.y + boundaries.translateY,
    );

    const [startX, startY] =
      pathIndex === path.length - 1 || pathIndex > path.length / 2
        ? path.at(-1)!
        : path.at(0)!;

    selectLinkVisual.visible = true;
    selectLinkVisual.setPositionRect(
      startX - boundaries.translateX,
      startY - boundaries.translateY,
      startX - boundaries.translateX,
      startY - boundaries.translateY,
    );

    return;
  }

  // Hovering a system.
  const ssToPickUp = state.simulator.getSubsystemAt(state.x, state.y);

  if (ssToPickUp) {
    selectSystemVisual.visible = true;
    selectSystemVisual.setPosition(ssToPickUp, { x: 0, y: 0 });
  }
}

const operation: Operation = {
  id: "operation-move",
  setup: () => {
    viewport.addChild(selectSystemVisual);
    viewport.addChild(moveSystemVisual);
    viewport.addChild(selectLinkVisual);
    viewport.addChild(moveLinkVisual);
  },
  onBegin: state => {
    subsystem = null;
    systemPickedUpAt = null;

    link = null;
    linkSystemIdToReplace = null;

    onPointerMove(state);
  },
  onEnd: () => {
    selectSystemVisual.visible = false;
    moveSystemVisual.visible = false;
    selectLinkVisual.visible = false;
    moveLinkVisual.visible = false;

    viewport.pause = false;
  },
  onMute: () => {
    selectSystemVisual.visible = false;
    moveSystemVisual.visible = false;
    selectLinkVisual.visible = false;
    moveLinkVisual.visible = false;
  },
  onUnmute: onPointerMove,
  onPointerDown: state => {
    subsystem = null;
    systemPickedUpAt = null;
    link = null;
    linkSystemIdToReplace = null;

    const linkToMove = state.simulator.getLinkAt(state.x, state.y);

    if (linkToMove) {
      viewport.pause = true;

      const path = state.simulator.getPath(linkToMove)!;
      const boundaries = state.simulator.getBoundaries();

      const pathIndex = path.findIndex(
        ([x, y]) =>
          x === state.x + boundaries.translateX &&
          y === state.y + boundaries.translateY,
      );

      link = linkToMove;

      linkSystemIdToReplace =
        pathIndex < path.length / 2 ? linkToMove.a : linkToMove.b;

      return;
    }

    const ssToPickUp = state.simulator.getSubsystemAt(state.x, state.y);

    if (ssToPickUp) {
      viewport.pause = true;

      subsystem = ssToPickUp;
      systemPickedUpAt = { x: state.x, y: state.y };

      onPointerMove(state);
    }
  },
  onPointerUp: state => {
    if (link && linkSystemIdToReplace && subsystem) {
      modifySpecification(() => {
        moveLink(link!, linkSystemIdToReplace!, subsystem!.id);
      }).then(() => {
        onPointerMove(state);
        tick();
      });
    } else if (subsystem && systemPickedUpAt) {
      const deltaX = state.x - systemPickedUpAt.x;
      const deltaY = state.y - systemPickedUpAt.y;

      modifySpecification(() => {
        moveSystem(subsystem!, deltaX, deltaY);
      }).then(() => {
        onPointerMove(state);
        tick();
      });
    }

    // Reset operation.
    viewport.pause = false;

    subsystem = null;
    systemPickedUpAt = null;

    link = null;
    linkSystemIdToReplace = null;

    onPointerMove(state);
  },
  onPointerMove,
};

export default operation;
