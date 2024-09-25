import { Container } from "pixi.js";
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

//
// Move multiple systems.
//

// State 1: select systems.

const multiSelectVisual = new SystemSelector();
const multiSelectedVisuals = new Container();
const multiMovingVisuals = new Container();

let multiSelectStartAt: RuntimePosition | null = null;
let multiSelectEndAt: RuntimePosition | null = null;

let multiSelected: RuntimeSubsystem[] = [];

let multiX1 = 0;
let multiY1 = 0;
let multiX2 = 0;
let multiY2 = 0;

// State 2: move systems.

let multiPickedUpAt: RuntimePosition | null = null;

//
// Move one system.
//

const oneSystemSelectVisual = new SystemSelector();
const oneSystemMoveVisual = new SystemSelector();

let oneSystemSelected: RuntimeSubsystem | null = null;
let oneSystemPickedUpAt: RuntimePosition | null = null;

//
// Move one link.
//

const oneLinkSelectVisual = new SystemSelector();
const oneLinkMoveVisual = new SystemLinker();

let oneLinkSelected: RuntimeLink | null = null;
let oneLinkSelectedSystemId: string | null = null;

//
// Handlers.
//

function onPointerMove(state: State) {
  oneSystemSelectVisual.visible = false;
  oneSystemMoveVisual.visible = false;
  oneLinkSelectVisual.visible = false;
  oneLinkMoveVisual.visible = false;
  multiSelectVisual.visible = false;
  multiSelectedVisuals.visible = true;
  multiMovingVisuals.visible = false;

  //
  // Move multiple systems - Stage 2.
  //
  if (multiPickedUpAt) {
    multiSelectedVisuals.visible = true;
    multiMovingVisuals.visible = true;

    const deltaX = state.x - multiPickedUpAt.x;
    const deltaY = state.y - multiPickedUpAt.y;

    for (const [index, subsystem] of multiSelected.entries()) {
      const visual = multiMovingVisuals.children[index] as SystemSelector;

      visual.setPosition(subsystem, { x: deltaX, y: deltaY });
    }

    return;
  }

  //
  // Move multiple systems - Stage 1.
  //
  if (multiSelectStartAt) {
    multiSelectVisual.visible = true;

    multiSelectEndAt = { x: state.x, y: state.y };

    if (
      multiSelectStartAt.x < multiSelectEndAt.x &&
      multiSelectStartAt.y > multiSelectEndAt.y
    ) {
      //
      // x1,y1 +---+ end
      //       |   |
      // start +---+ x2,y2
      //
      multiX1 = multiSelectStartAt.x;
      multiY1 = multiSelectEndAt.y;
      multiX2 = multiSelectEndAt.x;
      multiY2 = multiSelectStartAt.y;
    } else if (
      multiSelectStartAt.x > multiSelectEndAt.x &&
      multiSelectStartAt.y > multiSelectEndAt.y
    ) {
      //
      // end +---+
      //     |   |
      //     +---+ start
      //
      multiX1 = multiSelectEndAt.x;
      multiY1 = multiSelectEndAt.y;
      multiX2 = multiSelectStartAt.x;
      multiY2 = multiSelectStartAt.y;
    } else if (
      multiSelectStartAt.x > multiSelectEndAt.x &&
      multiSelectStartAt.y < multiSelectEndAt.y
    ) {
      //
      // x1,y1 +---+ start
      //       |   |
      //   end +---+ x2,y2
      //
      multiX1 = multiSelectEndAt.x;
      multiY1 = multiSelectStartAt.y;
      multiX2 = multiSelectStartAt.x;
      multiY2 = multiSelectEndAt.y;
    } else {
      //
      // start +---+
      //       |   |
      //       +---+ end
      //
      multiX1 = multiSelectStartAt.x;
      multiY1 = multiSelectStartAt.y;
      multiX2 = multiSelectEndAt.x;
      multiY2 = multiSelectEndAt.y;
    }

    multiSelectVisual.setPositionRect(multiX1, multiY1, multiX2, multiY2);

    const parent =
      state.simulator.getWhiteboxAt(
        multiSelectStartAt.x,
        multiSelectStartAt.y,
      ) ?? state.simulator.getSystem();

    multiSelected = state.simulator.getSubsystemsAt(
      parent,
      multiX1,
      multiY1,
      multiX2,
      multiY2,
    );

    // TODO: don't systematically re-create SystemSelectors.
    // Instead, re-use them.

    multiSelectedVisuals.removeChildren();

    if (multiSelected.length) {
      for (const subsystem of multiSelected) {
        const visual = new SystemSelector();
        visual.visible = true;
        visual.setPosition(subsystem, { x: 0, y: 0 });

        // @ts-ignore
        multiSelectedVisuals.addChild(visual);
      }
    }

    return;
  }

  //
  // Moving one link.
  //
  if (oneLinkSelected && oneLinkSelectedSystemId) {
    const path = state.simulator.getPath(oneLinkSelected)!;
    const boundaries = state.simulator.getBoundaries();

    const [startX, startY] =
      oneLinkSelectedSystemId === oneLinkSelected.b
        ? path.at(-1)!
        : path.at(0)!;

    oneLinkMoveVisual.visible = true;
    oneLinkMoveVisual.setPosition(
      startX - boundaries.translateX,
      startY - boundaries.translateY,
      state.x,
      state.y,
    );

    oneLinkSelectVisual.visible = true;

    const ssToMoveLinkAt = state.simulator.getSubsystemAt(state.x, state.y);

    if (
      ssToMoveLinkAt &&
      !ssToMoveLinkAt.systems.length &&
      ssToMoveLinkAt.id !== oneLinkSelected.a &&
      ssToMoveLinkAt.id !== oneLinkSelected.b
    ) {
      oneSystemSelectVisual.visible = true;
      oneSystemSelectVisual.setPosition(ssToMoveLinkAt, { x: 0, y: 0 });

      oneSystemSelected = ssToMoveLinkAt;
    }

    return;
  }

  //
  // Moving one system.
  //
  if (oneSystemSelected && oneSystemPickedUpAt) {
    oneSystemSelectVisual.visible = true;
    oneSystemSelectVisual.setPosition(oneSystemSelected, { x: 0, y: 0 });

    oneSystemMoveVisual.visible = true;
    oneSystemMoveVisual.setPosition(oneSystemSelected, {
      x: state.x - oneSystemPickedUpAt.x,
      y: state.y - oneSystemPickedUpAt.y,
    });

    return;
  }

  //
  // Hovering one link.
  //
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

    oneLinkSelectVisual.visible = true;
    oneLinkSelectVisual.setPositionRect(
      startX - boundaries.translateX,
      startY - boundaries.translateY,
      startX - boundaries.translateX,
      startY - boundaries.translateY,
    );

    return;
  }

  //
  // Hovering one system.
  //
  const ssToPickUp = state.simulator.getSubsystemAt(state.x, state.y);

  if (ssToPickUp) {
    oneSystemSelectVisual.visible = true;
    oneSystemSelectVisual.setPosition(ssToPickUp, { x: 0, y: 0 });
  }
}

function onBegin(state: State): void {
  //
  // Move multiple systems.
  //
  multiSelectVisual.visible = true;

  multiSelectedVisuals.visible = true;
  multiSelectedVisuals.removeChildren();

  multiMovingVisuals.visible = true;
  multiMovingVisuals.removeChildren();

  multiSelectStartAt = null;
  multiSelectEndAt = null;

  multiSelected.length = 0;

  multiPickedUpAt = null;

  //
  // Move one system.
  //
  oneSystemSelected = null;
  oneSystemPickedUpAt = null;

  //
  // Move one link.
  //
  oneLinkSelected = null;
  oneLinkSelectedSystemId = null;

  //
  // Shared.
  //
  viewport.pause = false;
  onPointerMove(state);
}

const operation: Operation = {
  id: "operation-move",
  setup: () => {
    //
    // Move multiple systems.
    //
    viewport.addChild(multiSelectVisual);
    viewport.addChild(multiSelectedVisuals);
    viewport.addChild(multiMovingVisuals);

    //
    // Move one system.
    //
    viewport.addChild(oneSystemSelectVisual);
    viewport.addChild(oneSystemMoveVisual);

    //
    // Move one link.
    //
    viewport.addChild(oneLinkSelectVisual);
    viewport.addChild(oneLinkMoveVisual);
  },
  onBegin,
  onEnd: () => {
    //
    // Move multiple systems.
    //
    multiSelectVisual.visible = false;
    multiSelectedVisuals.visible = false;
    multiMovingVisuals.visible = false;

    //
    // Move one system.
    //
    oneSystemSelectVisual.visible = false;
    oneSystemMoveVisual.visible = false;

    //
    // Move one link.
    //
    oneLinkSelectVisual.visible = false;
    oneLinkMoveVisual.visible = false;

    //
    // Shared.
    //
    viewport.pause = false;
  },
  onMute: () => {
    //
    // Move multiple systems.
    //
    multiSelectVisual.visible = false;
    //multiSelectedVisuals.visible = false;
    multiMovingVisuals.visible = false;

    //
    // Move one system.
    //
    oneSystemSelectVisual.visible = false;
    oneSystemMoveVisual.visible = false;

    //
    // Move one link.
    //
    oneLinkSelectVisual.visible = false;
    oneLinkMoveVisual.visible = false;
  },
  onUnmute: onPointerMove,
  onPointerDown: state => {
    viewport.pause = true;

    const multiSystemToPickUp = state.simulator.getSubsystemAt(
      state.x,
      state.y,
    );

    //
    // Move multiple systems - Stage 2.
    //
    if (multiSystemToPickUp && multiSelected.includes(multiSystemToPickUp)) {
      multiPickedUpAt = { x: state.x, y: state.y };

      for (const subsystem of multiSelected) {
        const visual = new SystemSelector();
        visual.visible = true;
        visual.setPosition(subsystem, { x: 0, y: 0 });

        // @ts-ignore
        multiMovingVisuals.addChild(visual);
      }

      return;
    }

    //
    // Move one system or move one link.
    //
    oneSystemSelected = null;
    oneSystemPickedUpAt = null;
    oneLinkSelected = null;
    oneLinkSelectedSystemId = null;

    //
    // Move one link.
    //
    const linkToMove = state.simulator.getLinkAt(state.x, state.y);

    if (linkToMove) {
      const path = state.simulator.getPath(linkToMove)!;
      const boundaries = state.simulator.getBoundaries();

      const pathIndex = path.findIndex(
        ([x, y]) =>
          x === state.x + boundaries.translateX &&
          y === state.y + boundaries.translateY,
      );

      oneLinkSelected = linkToMove;

      oneLinkSelectedSystemId =
        pathIndex < path.length / 2 ? linkToMove.a : linkToMove.b;

      return;
    }

    //
    // Move one system.
    //
    const ssToPickUp = state.simulator.getSubsystemAt(state.x, state.y);

    if (ssToPickUp) {
      oneSystemSelected = ssToPickUp;
      oneSystemPickedUpAt = { x: state.x, y: state.y };

      onPointerMove(state);

      return;
    }

    //
    // Move multiple systems - Stage 1.
    //
    multiSelectStartAt = { x: state.x, y: state.y };
    multiSelectEndAt = null;
  },
  onPointerUp: state => {
    //
    // Move multiple systems - Stage 2.
    //
    if (multiPickedUpAt) {
      const deltaX = state.x - multiPickedUpAt.x;
      const deltaY = state.y - multiPickedUpAt.y;

      modifySpecification(() => {
        moveSystems(multiSelected, deltaX, deltaY);
      }).then(() => {
        onBegin(state);
        tick();
      });

      return;
    }

    //
    // Move multiple systems - Stage 1.
    //
    if (multiSelectStartAt && multiSelectEndAt) {
      // Systems are selected in onPointerMove.
      if (multiSelected.length) {
        multiSelectStartAt = null;
        multiSelectEndAt = null;

        onPointerMove(state);
      } else {
        onBegin(state);
      }

      return;
    }

    //
    // Move one link.
    //
    if (oneLinkSelected && oneLinkSelectedSystemId && oneSystemSelected) {
      modifySpecification(() => {
        moveLink(
          oneLinkSelected!,
          oneLinkSelectedSystemId!,
          oneSystemSelected!.id,
        );
      }).then(() => {
        onBegin(state);
        tick();
      });

      return;
    }

    //
    // Move one system.
    //
    if (oneSystemSelected && oneSystemPickedUpAt) {
      const deltaX = state.x - oneSystemPickedUpAt.x;
      const deltaY = state.y - oneSystemPickedUpAt.y;

      modifySpecification(() => {
        moveSystems([oneSystemSelected!], deltaX, deltaY);
      }).then(() => {
        onBegin(state);
        tick();
      });

      return;
    }

    //
    // Operation incomplete.
    //
    onBegin(state);
  },
  onPointerMove,
};

export default operation;
