import {
  RuntimeSubsystem,
  RuntimePosition,
  moveSystems,
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

// Move one system.

const selectOneSystemVisual = new SystemSelector();
const moveOneSystemVisual = new SystemSelector();

let selectedSystem: RuntimeSubsystem | null = null;
let selectedSystemPickedUpAt: RuntimePosition | null = null;

// Move one link.

const selectOneLinkVisual = new SystemSelector();
const moveOneLinkVisual = new SystemLinker();

let selectedLink: RuntimeLink | null = null;
let selectedLinkSystemId: string | null = null;

function onPointerMove(state: State) {
  selectOneSystemVisual.visible = false;
  moveOneSystemVisual.visible = false;
  selectOneLinkVisual.visible = false;
  moveOneLinkVisual.visible = false;

  // Moving a link.
  if (selectedLink && selectedLinkSystemId) {
    const path = state.simulator.getPath(selectedLink)!;
    const boundaries = state.simulator.getBoundaries();

    const [startX, startY] =
      selectedLinkSystemId === selectedLink.b ? path.at(-1)! : path.at(0)!;

    moveOneLinkVisual.visible = true;
    moveOneLinkVisual.setPosition(
      startX - boundaries.translateX,
      startY - boundaries.translateY,
      state.x,
      state.y,
    );

    selectOneLinkVisual.visible = true;

    const ssToMoveLinkAt = state.simulator.getSubsystemAt(state.x, state.y);

    if (
      ssToMoveLinkAt &&
      !ssToMoveLinkAt.systems.length &&
      ssToMoveLinkAt.id !== selectedLink.a &&
      ssToMoveLinkAt.id !== selectedLink.b
    ) {
      selectOneSystemVisual.visible = true;
      selectOneSystemVisual.setPosition(ssToMoveLinkAt, { x: 0, y: 0 });

      selectedSystem = ssToMoveLinkAt;
    }

    return;
  }

  // Moving a system.
  if (selectedSystem && selectedSystemPickedUpAt) {
    selectOneSystemVisual.visible = true;
    selectOneSystemVisual.setPosition(selectedSystem, { x: 0, y: 0 });

    moveOneSystemVisual.visible = true;
    moveOneSystemVisual.setPosition(selectedSystem, {
      x: state.x - selectedSystemPickedUpAt.x,
      y: state.y - selectedSystemPickedUpAt.y,
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

    selectOneLinkVisual.visible = true;
    selectOneLinkVisual.setPositionRect(
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
    selectOneSystemVisual.visible = true;
    selectOneSystemVisual.setPosition(ssToPickUp, { x: 0, y: 0 });
  }
}

const operation: Operation = {
  id: "operation-move",
  setup: () => {
    viewport.addChild(selectOneSystemVisual);
    viewport.addChild(moveOneSystemVisual);
    viewport.addChild(selectOneLinkVisual);
    viewport.addChild(moveOneLinkVisual);
  },
  onBegin: state => {
    selectedSystem = null;
    selectedSystemPickedUpAt = null;

    selectedLink = null;
    selectedLinkSystemId = null;

    onPointerMove(state);
  },
  onEnd: () => {
    selectOneSystemVisual.visible = false;
    moveOneSystemVisual.visible = false;
    selectOneLinkVisual.visible = false;
    moveOneLinkVisual.visible = false;

    viewport.pause = false;
  },
  onMute: () => {
    selectOneSystemVisual.visible = false;
    moveOneSystemVisual.visible = false;
    selectOneLinkVisual.visible = false;
    moveOneLinkVisual.visible = false;
  },
  onUnmute: onPointerMove,
  onPointerDown: state => {
    selectedSystem = null;
    selectedSystemPickedUpAt = null;
    selectedLink = null;
    selectedLinkSystemId = null;

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

      selectedLink = linkToMove;

      selectedLinkSystemId =
        pathIndex < path.length / 2 ? linkToMove.a : linkToMove.b;

      return;
    }

    const ssToPickUp = state.simulator.getSubsystemAt(state.x, state.y);

    if (ssToPickUp) {
      viewport.pause = true;

      selectedSystem = ssToPickUp;
      selectedSystemPickedUpAt = { x: state.x, y: state.y };

      onPointerMove(state);
    }
  },
  onPointerUp: state => {
    if (selectedLink && selectedLinkSystemId && selectedSystem) {
      modifySpecification(() => {
        moveLink(selectedLink!, selectedLinkSystemId!, selectedSystem!.id);
      }).then(() => {
        onPointerMove(state);
        tick();
      });
    } else if (selectedSystem && selectedSystemPickedUpAt) {
      const deltaX = state.x - selectedSystemPickedUpAt.x;
      const deltaY = state.y - selectedSystemPickedUpAt.y;

      modifySpecification(() => {
        moveSystems([selectedSystem!], deltaX, deltaY);
      }).then(() => {
        onPointerMove(state);
        tick();
      });
    }

    // Reset operation.
    viewport.pause = false;

    selectedSystem = null;
    selectedSystemPickedUpAt = null;

    selectedLink = null;
    selectedLinkSystemId = null;

    onPointerMove(state);
  },
  onPointerMove,
};

export default operation;
