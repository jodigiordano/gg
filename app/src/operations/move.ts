import {
  RuntimeSubsystem,
  RuntimePosition,
  moveSystems,
  RuntimeLink,
  moveLink,
  moveSubsystemsToParent,
  removeSubsystems,
  System,
  RuntimeSystem,
} from "@gg/core";
import { modifySpecification } from "../simulator/api.js";
import Operation from "../operation.js";
import { State } from "../state.js";
import viewport from "../renderer/viewport.js";
import { tick } from "../renderer/pixi.js";
import SystemLinker from "../renderer/systemLinker.js";
import SystemSelector from "../renderer/systemSelector.js";
import MultiSystemSelector from "../renderer/multiSystemSelector.js";

//
// Move multiple systems.
//

// State 1: select systems.

const multiSelectVisual = new MultiSystemSelector();
const multiMovingVisual = new MultiSystemSelector();

let multiSelectStartAt: RuntimePosition | null = null;
let multiSelectEndAt: RuntimePosition | null = null;

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
// Move into a container.
//

const parentSystemSelectVisual = new SystemSelector();

//
// Handlers.
//

function isChildOf(a: RuntimeSubsystem, bId: string): boolean {
  return a.systems.some(ss => ss.id === bId || isChildOf(ss, bId));
}

function isSystemPadding(
  subsystem: RuntimeSubsystem,
  x: number,
  y: number,
): boolean {
  const insideSystem =
    x >= subsystem.position.x + 1 &&
    x <= subsystem.position.x + subsystem.size.width - 2 &&
    y >= subsystem.position.y + 1 &&
    y <= subsystem.position.y + subsystem.size.height - 2;

  return !insideSystem;
}

function onPointerMove(state: State) {
  oneSystemSelectVisual.visible = false;
  oneSystemMoveVisual.visible = false;
  oneLinkSelectVisual.visible = false;
  oneLinkMoveVisual.visible = false;
  multiSelectVisual.visible = true;
  multiSelectVisual.lassoVisible = false;
  multiSelectVisual.selectedVisible = true;
  multiMovingVisual.visible = true;
  multiMovingVisual.lassoVisible = false;
  multiMovingVisual.selectedVisible = false;
  parentSystemSelectVisual.visible = false;

  //
  // Move multiple systems - Stage 2.1
  //
  if (multiPickedUpAt) {
    // Show the moving systems.
    multiMovingVisual.selectedVisible = true;

    const deltaX = state.x - multiPickedUpAt.x;
    const deltaY = state.y - multiPickedUpAt.y;

    for (const subsystem of multiSelectVisual.selected) {
      multiMovingVisual.setSystemPosition(subsystem, { x: deltaX, y: deltaY });
    }

    // Show hovering another system (container).
    let parent = state.simulator.getSubsystemAt(state.x, state.y);

    // The systems are hovering the perimeter of another system,
    // which is part of a list.
    if (
      parent?.parent?.type === "list" &&
      isSystemPadding(parent as RuntimeSubsystem, state.x, state.y)
    ) {
      parent = parent.parent;
    }

    if (
      // User moves the ss over itself.
      (parent?.id &&
        multiSelectVisual.selected.some(
          selected => selected.id === parent!.id,
        )) ||
      // User moves the ss inside a child ss.
      (parent?.id && isChildOf(multiSelectVisual.selected[0]!, parent.id))
    ) {
      parent = multiSelectVisual.selected[0]!.parent as RuntimeSubsystem;
    }

    if (parent?.id) {
      parentSystemSelectVisual.setPosition(parent, { x: 0, y: 0 });
      parentSystemSelectVisual.visible = true;
    }

    return;
  }

  //
  // Move multiple systems - Stage 1.
  //
  if (multiSelectStartAt) {
    multiSelectVisual.lassoVisible = true;

    multiSelectEndAt = { x: state.x, y: state.y };

    multiSelectVisual.setLassoPosition(
      multiSelectStartAt.x,
      multiSelectStartAt.y,
      multiSelectEndAt.x,
      multiSelectEndAt.y,
    );

    multiSelectVisual.setSelectedFromLasso(state.simulator);

    multiMovingVisual.setLassoPosition(
      multiSelectStartAt.x,
      multiSelectStartAt.y,
      multiSelectEndAt.x,
      multiSelectEndAt.y,
    );

    multiMovingVisual.setSelectedFromLasso(state.simulator);

    return;
  }

  //
  // Move multiple systems - Stage 2.2
  //
  if (multiSelectVisual.selected.length) {
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
    // Show the moving system.
    oneSystemSelectVisual.visible = true;
    oneSystemSelectVisual.setPosition(oneSystemSelected, { x: 0, y: 0 });

    oneSystemMoveVisual.visible = true;
    oneSystemMoveVisual.setPosition(oneSystemSelected, {
      x: state.x - oneSystemPickedUpAt.x,
      y: state.y - oneSystemPickedUpAt.y,
    });

    // Show hovering another system (container).
    let parent = state.simulator.getSubsystemAt(state.x, state.y);

    // The system is hovering the perimeter of another system,
    // which is part of a list.
    if (
      parent?.parent?.type === "list" &&
      isSystemPadding(parent as RuntimeSubsystem, state.x, state.y)
    ) {
      parent = parent.parent;
    }

    if (
      // User moves the ss over itself.
      (parent?.id && oneSystemSelected.id === parent.id) ||
      // User moves the ss inside a child ss.
      (parent?.id && isChildOf(oneSystemSelected, parent.id))
    ) {
      parent = oneSystemSelected.parent as RuntimeSubsystem;
    }

    if (parent?.id) {
      parentSystemSelectVisual.setPosition(parent, { x: 0, y: 0 });
      parentSystemSelectVisual.visible = true;
    }

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

  if (
    /* Whitebox */
    (ssToPickUp &&
      ssToPickUp.systems.length &&
      isSystemPadding(ssToPickUp, state.x, state.y)) ||
    /* Blackbox */
    (ssToPickUp && !ssToPickUp.systems.length)
  ) {
    oneSystemSelectVisual.visible = true;
    oneSystemSelectVisual.setPosition(ssToPickUp, { x: 0, y: 0 });
  }
}

function onBegin(state: State): void {
  //
  // Move multiple systems.
  //
  multiSelectVisual.reset();
  multiSelectVisual.visible = false;
  multiSelectVisual.lassoVisible = false;
  multiSelectVisual.selectedVisible = false;

  multiMovingVisual.reset();
  multiMovingVisual.visible = false;
  multiMovingVisual.lassoVisible = false;
  multiMovingVisual.selectedVisible = false;

  multiSelectStartAt = null;
  multiSelectEndAt = null;

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
    viewport.addChild(multiMovingVisual);

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

    //
    // Move into container.
    //
    viewport.addChild(parentSystemSelectVisual);
  },
  onBegin,
  onEnd: () => {
    //
    // Move multiple systems.
    //
    multiSelectVisual.visible = false;
    multiMovingVisual.visible = false;

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
    // Move into container.
    //
    parentSystemSelectVisual.visible = false;

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
    multiMovingVisual.visible = false;

    //
    // Move one system.
    //
    oneSystemSelectVisual.visible = false;
    oneSystemMoveVisual.visible = false;

    //
    // Move into container.
    //
    parentSystemSelectVisual.visible = false;

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
    if (
      multiSystemToPickUp &&
      multiSelectVisual.selected.includes(multiSystemToPickUp)
    ) {
      multiPickedUpAt = { x: state.x, y: state.y };

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

    if (
      /* Whitebox */
      (ssToPickUp &&
        ssToPickUp.systems.length &&
        isSystemPadding(ssToPickUp, state.x, state.y)) ||
      /* Blackbox */
      (ssToPickUp && !ssToPickUp.systems.length)
    ) {
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

    onPointerMove(state);
  },
  onPointerUp: state => {
    //
    // Move multiple systems into a container, or not. - Stage 2.
    //
    if (multiPickedUpAt) {
      let parent =
        state.simulator.getSubsystemAt(state.x, state.y) ??
        state.simulator.getSystem();

      // The systems are moved to the perimeter of another system,
      // which is part of a list.
      if (
        parent.parent?.type === "list" &&
        isSystemPadding(parent as RuntimeSubsystem, state.x, state.y)
      ) {
        parent = parent.parent;
      }

      modifySpecification(() => {
        if (
          // User moves the ss over itself.
          multiSelectVisual.selected.some(ss => ss.id === parent.id) ||
          // User moves the ss inside the same parent.
          multiSelectVisual.selected.some(ss => ss.parent!.id === parent.id) ||
          // User moves the ss inside a child ss.
          (parent.id &&
            multiSelectVisual.selected.some(ss => isChildOf(ss, parent.id)))
        ) {
          const deltaX = state.x - multiPickedUpAt!.x;
          const deltaY = state.y - multiPickedUpAt!.y;

          moveSystems(multiSelectVisual.selected, deltaX, deltaY);
        } else {
          // Move the ss inside a container.
          if (parent.id) {
            // The ss dragged by the user.
            const multiPickedUp = state.simulator.getSubsystemAt(
              multiPickedUpAt!.x,
              multiPickedUpAt!.y,
            )!;

            // Delta of top-left of the ss with the dragging anchor.
            const localDeltaX = multiPickedUp!.position.x - multiPickedUpAt!.x;
            const localDeltaY = multiPickedUp!.position.y - multiPickedUpAt!.y;

            // Padding and title offsets.
            const containerOffset = state.simulator.getParentOffset(parent);

            // Local position inside the container.
            const x =
              state.x - parent.position.x - containerOffset.x + localDeltaX;

            const y =
              state.y - parent.position.y - containerOffset.y + localDeltaY;

            // Local positions of other moved systems,
            // based on the system dragged by the user.
            const positions = multiSelectVisual.selected.map(ss => {
              if (ss.id === multiPickedUp.id) {
                return { x, y };
              }

              return {
                x: x + (ss.position.x - multiPickedUp.position.x),
                y: y + (ss.position.y - multiPickedUp.position.y),
              };
            });

            moveSubsystemsToParent(
              multiSelectVisual.selected,
              parent,
              positions,
            );
          } /* Move the ss outside of a container (i.e. in the root container) */ else {
            const deltaX = state.x - multiPickedUpAt!.x;
            const deltaY = state.y - multiPickedUpAt!.y;

            const positions = multiSelectVisual.selected.map(ss => ({
              x: ss.position.x + deltaX,
              y: ss.position.y + deltaY,
            }));

            moveSubsystemsToParent(
              multiSelectVisual.selected,
              parent,
              positions,
            );
          }
        }
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
      if (multiSelectVisual.selected.length) {
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
    // Move one system into a container, or not.
    //
    if (oneSystemSelected && oneSystemPickedUpAt) {
      let parent =
        state.simulator.getSubsystemAt(state.x, state.y) ??
        state.simulator.getSystem();

      // The system is moved to the perimeter of another system,
      // which is part of a list.
      if (
        parent.parent?.type === "list" &&
        isSystemPadding(parent as RuntimeSubsystem, state.x, state.y)
      ) {
        parent = parent.parent;
      }

      modifySpecification(() => {
        if (
          // User moves the ss over itself.
          oneSystemSelected!.id === parent.id ||
          // User moves the ss inside the same parent.
          oneSystemSelected!.parent!.id === parent.id ||
          // User moves the ss inside a child ss.
          (parent.id && isChildOf(oneSystemSelected!, parent.id))
        ) {
          moveSystems(
            [oneSystemSelected!],
            state.x - oneSystemPickedUpAt!.x,
            state.y - oneSystemPickedUpAt!.y,
          );
        } else {
          const deltaX = oneSystemSelected!.position.x - oneSystemPickedUpAt!.x;
          const deltaY = oneSystemSelected!.position.y - oneSystemPickedUpAt!.y;

          let x: number;
          let y: number;

          // Move the ss inside a container.
          if (parent.id) {
            const offset = state.simulator.getParentOffset(parent);

            x = state.x - parent.position.x - offset.x + deltaX;
            y = state.y - parent.position.y - offset.y + deltaY;
          } /* Move the ss outside of a container (i.e. in the root container) */ else {
            x = state.x + deltaX;
            y = state.y + deltaY;
          }

          moveSubsystemsToParent([oneSystemSelected!], parent, [{ x, y }]);
        }
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
  onKeyDown: (state, event) => {
    //
    // Select everything.
    //
    if (event.ctrlKey && event.key === "a") {
      onBegin(state);

      multiSelectVisual.setLassoPosition(
        -Number.MAX_SAFE_INTEGER,
        -Number.MAX_SAFE_INTEGER,
        Number.MAX_SAFE_INTEGER,
        Number.MAX_SAFE_INTEGER,
      );

      multiSelectVisual.setSelectedFromLasso(state.simulator);

      multiMovingVisual.setLassoPosition(
        -Number.MAX_SAFE_INTEGER,
        -Number.MAX_SAFE_INTEGER,
        Number.MAX_SAFE_INTEGER,
        Number.MAX_SAFE_INTEGER,
      );

      multiMovingVisual.setSelectedFromLasso(state.simulator);

      return;
    }

    //
    // Delete many systems.
    //
    if (multiSelectVisual.selected.length && event.key === "Delete") {
      modifySpecification(() => {
        removeSubsystems(multiSelectVisual.selected);
      }).then(() => {
        onBegin(state);
        tick();
      });

      return;
    }

    //
    // Copy many systems & links in the clipboard.
    //
    if (
      multiSelectVisual.selected.length &&
      event.ctrlKey &&
      event.key === "c"
    ) {
      let rootSystem = multiSelectVisual
        .selected[0]! as unknown as RuntimeSystem;

      while (rootSystem.parent) {
        rootSystem = rootSystem.parent;
      }

      const specification: System = {
        specificationVersion: "1.0.0",
        title: "",
        systems: multiSelectVisual.selected.map(ss => ss.specification),
        links: (rootSystem.specification.links ?? []).filter(
          link =>
            multiSelectVisual.selected.some(ss => ss.id === link.a) &&
            multiSelectVisual.selected.some(ss => ss.id === link.b),
        ),
      };

      navigator.clipboard
        .writeText(JSON.stringify(specification, null, 2))
        .then(() => {
          onBegin(state);
          tick();
        });

      return;
    }
  },
};

export default operation;
