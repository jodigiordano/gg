import {
  RuntimeSubsystem,
  RuntimePosition,
  duplicateSystems,
  RuntimeSystem,
  System,
  removeSubsystem,
} from "@gg/core";
import { modifySpecification } from "../simulator/api.js";
import Operation from "../operation.js";
import { State } from "../state.js";
import viewport from "../renderer/viewport.js";
import { tick } from "../renderer/pixi.js";
import SystemSelector from "../renderer/systemSelector.js";
import MultiSystemSelector from "../renderer/multiSystemSelector.js";
import { loadJSON } from "@gg/core";

//
// Duplicate multiple systems.
//

// State 1: select systems.

const multiSelectVisual = new MultiSystemSelector();
const multiMovingVisual = new MultiSystemSelector();

multiSelectVisual.tint = "#4363d8";
multiMovingVisual.tint = "#4363d8";

let multiSelectStartAt: RuntimePosition | null = null;
let multiSelectEndAt: RuntimePosition | null = null;

// State 2: move systems.

let multiPickedUpAt: RuntimePosition | null = null;

//
// Duplicate one system.
//

const oneSystemSelectVisual = new SystemSelector();
const oneSystemMoveVisual = new SystemSelector();

oneSystemSelectVisual.tint = "#4363d8";
oneSystemMoveVisual.tint = "#4363d8";

let oneSystemSelected: RuntimeSubsystem | null = null;
let oneSystemPickedUpAt: RuntimePosition | null = null;

//
// Duplicate into a container.
//

const parentSystemSelectVisual = new SystemSelector();

parentSystemSelectVisual.tint = "#4363d8";

//
// Duplicate a system on paste.
//

let systemFromClipboard: RuntimeSystem | null = null;

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
  multiSelectVisual.visible = true;
  multiSelectVisual.lassoVisible = false;
  multiSelectVisual.selectedVisible = true;
  multiMovingVisual.visible = true;
  multiMovingVisual.lassoVisible = false;
  multiMovingVisual.selectedVisible = false;
  parentSystemSelectVisual.visible = false;

  //
  // Move multiple systems - Stage 2.1 or
  // Paste from clipboard
  //
  if (multiPickedUpAt) {
    // Do not show the selected systems when they are coming from the clipboard.
    if (systemFromClipboard) {
      multiSelectVisual.visible = false;
    }

    // Show the moving systems.
    multiMovingVisual.selectedVisible = true;

    const deltaX = state.x - multiPickedUpAt.x;
    const deltaY = state.y - multiPickedUpAt.y;

    for (const subsystem of multiSelectVisual.selected) {
      multiMovingVisual.setSystemPosition(subsystem, { x: deltaX, y: deltaY });
    }

    // Show hovering another system (container).
    let parent = state.simulator.getSubsystemAt(state.x, state.y);

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
  // Duplicate multiple systems.
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
  // Duplicate one system.
  //
  oneSystemSelected = null;
  oneSystemPickedUpAt = null;

  //
  // Duplicate from clipboard.
  //
  systemFromClipboard = null;

  //
  // Shared.
  //
  viewport.pause = false;
  onPointerMove(state);
}

const operation: Operation = {
  id: "operation-duplicate",
  setup: () => {
    //
    // Duplicate multiple systems.
    //
    viewport.addChild(multiSelectVisual);
    viewport.addChild(multiMovingVisual);

    //
    // Duplicate one system.
    //
    viewport.addChild(oneSystemSelectVisual);
    viewport.addChild(oneSystemMoveVisual);

    //
    // Duplicate into container.
    //
    viewport.addChild(parentSystemSelectVisual);
  },
  onBegin,
  onEnd: () => {
    //
    // Duplicate multiple systems.
    //
    multiSelectVisual.visible = false;
    multiMovingVisual.visible = false;

    //
    // Duplicate one system.
    //
    oneSystemSelectVisual.visible = false;
    oneSystemMoveVisual.visible = false;

    //
    // Duplicate into container.
    //
    parentSystemSelectVisual.visible = false;

    //
    // Shared.
    //
    viewport.pause = false;
  },
  onMute: () => {
    //
    // Duplicate multiple systems.
    //
    multiSelectVisual.visible = false;
    multiMovingVisual.visible = false;

    //
    // Duplicate one system.
    //
    oneSystemSelectVisual.visible = false;
    oneSystemMoveVisual.visible = false;

    //
    // Duplicate into container.
    //
    parentSystemSelectVisual.visible = false;
  },
  onUnmute: onPointerMove,
  onPointerDown: state => {
    viewport.pause = true;

    const multiSystemToPickUp = state.simulator.getSubsystemAt(
      state.x,
      state.y,
    );

    //
    // Duplicate multiple systems - Stage 2.
    //
    if (
      multiSystemToPickUp &&
      multiSelectVisual.selected.includes(multiSystemToPickUp)
    ) {
      multiPickedUpAt = { x: state.x, y: state.y };

      return;
    }

    //
    // Duplicate one system or move one link.
    //
    oneSystemSelected = null;
    oneSystemPickedUpAt = null;

    //
    // Duplicate one system.
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
    // Duplicate multiple systems - Stage 1.
    //
    multiSelectStartAt = { x: state.x, y: state.y };
    multiSelectEndAt = null;

    onPointerMove(state);
  },
  onPointerUp: state => {
    //
    // Duplicate multiple systems into a container, or not. - Stage 2.
    //
    if (multiPickedUpAt) {
      const parent =
        state.simulator.getSubsystemAt(state.x, state.y) ??
        state.simulator.getSystem();

      modifySpecification(() => {
        if (
          // User doesn't duplicate the ss over itself.
          multiSelectVisual.selected.some(ss => ss.id === parent.id) &&
          // User duplicates the ss inside the same parent.
          (multiSelectVisual.selected.some(ss => ss.parent!.id === parent.id) ||
            // User duplicates the ss inside a child ss.
            (parent.id &&
              multiSelectVisual.selected.some(ss => isChildOf(ss, parent.id))))
        ) {
          const deltaX = state.x - multiPickedUpAt!.x;
          const deltaY = state.y - multiPickedUpAt!.y;

          duplicateSystems(
            multiSelectVisual.selected,
            parent,
            multiSelectVisual.selected.map(ss => ({
              x: ss.specification.position.x + deltaX,
              y: ss.specification.position.y + deltaY,
            })),
            systemFromClipboard?.links ?? [],
          );
        } else {
          // Duplicate the ss inside a container.
          if (parent.id) {
            // The ss dragged by the user.
            const multiPickedUp = systemFromClipboard
              ? null
              : state.simulator.getSubsystemAt(
                  multiPickedUpAt!.x,
                  multiPickedUpAt!.y,
                )!;

            const draggedX = multiPickedUp?.position?.x ?? 0;
            const draggedY = multiPickedUp?.position?.y ?? 0;

            // Delta of top-left of the ss with the dragging anchor.
            const localDeltaX = draggedX - multiPickedUpAt!.x;
            const localDeltaY = draggedY - multiPickedUpAt!.y;

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
              if (ss.id === multiPickedUp?.id) {
                return { x, y };
              }

              return {
                x: x + (ss.position.x - draggedX),
                y: y + (ss.position.y - draggedY),
              };
            });

            duplicateSystems(
              multiSelectVisual.selected,
              parent,
              positions,
              systemFromClipboard?.links ?? [],
            );
          } /* Duplicate the ss outside of a container (i.e. in the root container) */ else {
            const deltaX = state.x - multiPickedUpAt!.x;
            const deltaY = state.y - multiPickedUpAt!.y;

            const positions = multiSelectVisual.selected.map(ss => ({
              x: ss.position.x + deltaX,
              y: ss.position.y + deltaY,
            }));

            duplicateSystems(
              multiSelectVisual.selected,
              parent,
              positions,

              systemFromClipboard?.links ?? [],
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
    // Duplicate multiple systems - Stage 1.
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
    // Duplicate one system into a container, or not.
    //
    if (oneSystemSelected && oneSystemPickedUpAt) {
      const parent =
        state.simulator.getSubsystemAt(state.x, state.y) ??
        state.simulator.getSystem();

      modifySpecification(() => {
        if (
          // User doesn't duplicate the ss over itself.
          oneSystemSelected!.id !== parent.id &&
          // User duplicates the ss inside the same parent.
          (oneSystemSelected!.parent!.id === parent.id ||
            // User duplicates the ss inside a child ss.
            (parent.id && isChildOf(oneSystemSelected!, parent.id)))
        ) {
          duplicateSystems(
            [oneSystemSelected!],
            parent,
            [
              {
                x:
                  oneSystemSelected!.specification.position.x +
                  (state.x - oneSystemPickedUpAt!.x),
                y:
                  oneSystemSelected!.specification.position.y +
                  (state.y - oneSystemPickedUpAt!.y),
              },
            ],
            systemFromClipboard?.links ?? [],
          );
        } else {
          const deltaX = oneSystemSelected!.position.x - oneSystemPickedUpAt!.x;
          const deltaY = oneSystemSelected!.position.y - oneSystemPickedUpAt!.y;

          let x: number;
          let y: number;

          // Duplicate the ss inside a container.
          if (parent.id) {
            const offset = state.simulator.getParentOffset(parent);

            x = state.x - parent.position.x - offset.x + deltaX;
            y = state.y - parent.position.y - offset.y + deltaY;
          } /* Duplicate the ss outside of a container (i.e. in the root container) */ else {
            x = state.x + deltaX;
            y = state.y + deltaY;
          }

          duplicateSystems(
            [oneSystemSelected!],
            parent,
            [{ x, y }],
            systemFromClipboard?.links ?? [],
          );
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

    //
    // Delete many systems.
    //
    if (multiSelectVisual.selected.length && event.key === "Delete") {
      modifySpecification(() => {
        for (const subsystem of multiSelectVisual.selected) {
          removeSubsystem(subsystem);
        }
      }).then(() => {
        onBegin(state);
        tick();
      });

      return;
    }

    //
    // Paste many systems & links from the clipboard.
    //
    if (event.ctrlKey && event.key === "v") {
      navigator.clipboard.readText().then(fromClipboard => {
        let result: ReturnType<typeof loadJSON>;

        try {
          result = loadJSON(fromClipboard);
        } catch {
          /* NOOP */
          return;
        }

        if (result.errors.length) {
          return;
        }

        systemFromClipboard = result.system;

        multiSelectVisual.setSelectedFromSystem(systemFromClipboard);
        multiMovingVisual.setSelectedFromSystem(systemFromClipboard);

        let left = Number.MAX_SAFE_INTEGER;
        let right = -Number.MAX_SAFE_INTEGER;
        let top = Number.MAX_SAFE_INTEGER;
        let bottom = -Number.MAX_SAFE_INTEGER;

        for (const system of systemFromClipboard.systems) {
          if (system.position.x < left) {
            left = system.position.x;
          }

          if (system.position.x + system.size.width > right) {
            right = system.position.x + system.size.width;
          }

          if (system.position.y < top) {
            top = system.position.y;
          }

          if (system.position.y + system.size.height > bottom) {
            bottom = system.position.y + system.size.height;
          }
        }

        // Happens when there are no subsystems.
        if (left > right) {
          left = right;
        }

        if (top > bottom) {
          top = bottom;
        }

        multiPickedUpAt = {
          x: Math.floor(left + (right - left) / 2),
          y: Math.floor(top + (bottom - top) / 2),
        };

        onPointerMove(state);
        tick();
      });
    }
  },
};

export default operation;
