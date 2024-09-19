import { addLink, isSubsystemOf, RuntimeSubsystem } from "@gg/core";
import SystemSelector from "../renderer/systemSelector.js";
import SystemLinker from "../renderer/systemLinker.js";
import { modifySpecification } from "../simulator/api.js";
import Operation from "../operation.js";
import { State } from "../state.js";
import viewport from "../renderer/viewport.js";
import { tick } from "../renderer/pixi.js";

const selectAVisual = new SystemSelector();
const selectBVisual = new SystemSelector();
const linkingLine = new SystemLinker();

let a: RuntimeSubsystem | null = null;

function onPointerMove(state: State) {
  selectAVisual.visible = false;
  selectBVisual.visible = false;
  linkingLine.visible = false;

  const subsystem = state.simulator.getSubsystemAt(state.x, state.y);

  // The user is linking a system.
  if (a) {
    selectAVisual.visible = true;
    selectAVisual.setPosition(a, { x: 0, y: 0 });

    if (
      subsystem &&
      !isSubsystemOf(a, subsystem) &&
      !isSubsystemOf(subsystem, a)
    ) {
      selectBVisual.visible = true;
      selectBVisual.setPosition(subsystem, { x: 0, y: 0 });
    }

    linkingLine.visible = true;
    linkingLine.setPosition(
      a.position.x + Math.floor(a.size.width / 2),
      a.position.y + Math.floor(a.size.height / 2),
      state.x,
      state.y,
    );

    return;
  }

  const link =
    state.simulator.getLinkAt(state.x, state.y) ??
    state.simulator.getLinkByTitleAt(state.x, state.y);

  // The user is hovering a link.
  if (link) {
    const path = state.simulator.getPath(link)!;
    const boundaries = state.simulator.getBoundaries();

    const [startX, startY] = path.at(1)!;

    selectAVisual.visible = true;
    selectAVisual.setPositionRect(
      startX - boundaries.translateX,
      startY - boundaries.translateY,
      startX - boundaries.translateX,
      startY - boundaries.translateY,
    );

    const [endX, endY] = path.at(-2)!;

    selectBVisual.visible = true;
    selectBVisual.setPositionRect(
      endX - boundaries.translateX,
      endY - boundaries.translateY,
      endX - boundaries.translateX,
      endY - boundaries.translateY,
    );

    return;
  }

  // The user is hovering a system.
  if (subsystem) {
    selectAVisual.visible = true;
    selectAVisual.setPosition(subsystem, { x: 0, y: 0 });

    return;
  }
}

const operation: Operation = {
  id: "operation-link",
  setup: () => {
    viewport.addChild(selectAVisual);
    viewport.addChild(selectBVisual);
    viewport.addChild(linkingLine);
  },
  onBegin: state => {
    a = null;

    onPointerMove(state);
  },
  onEnd: () => {
    selectAVisual.visible = false;
    selectBVisual.visible = false;
    linkingLine.visible = false;

    viewport.pause = false;
  },
  onMute: () => {
    selectAVisual.visible = false;
    selectBVisual.visible = false;
    linkingLine.visible = false;
  },
  onUnmute: onPointerMove,
  onPointerUp: state => {
    if (a) {
      // Apply operation.
      const b = state.simulator.getSubsystemAt(state.x, state.y);

      if (b && b.id !== a.id) {
        modifySpecification(() => {
          addLink(state.simulator.getSystem(), a!.id, b!.id, {
            middlePattern: state.linkPattern,
          });
        }).then(() => {
          onPointerMove(state);
          tick();
        });
      }

      // Reset operation.
      a = null;

      viewport.pause = false;

      onPointerMove(state);

      return;
    }

    const link =
      state.simulator.getLinkAt(state.x, state.y) ??
      state.simulator.getLinkByTitleAt(state.x, state.y);

    if (!link) {
      return;
    }

    modifySpecification(() => {
      if (link.specification.middlePattern === state.linkPattern) {
        if (link.startPattern === "none" && link.endPattern === "none") {
          link.specification.startPattern = "none";
          link.specification.endPattern = "solid-arrow";
        } else if (
          link.startPattern === "none" &&
          link.endPattern === "solid-arrow"
        ) {
          link.specification.startPattern = "solid-arrow";
          link.specification.endPattern = "none";
        } else if (
          link.startPattern === "solid-arrow" &&
          link.endPattern === "none"
        ) {
          link.specification.startPattern = "solid-arrow";
          link.specification.endPattern = "solid-arrow";
        } else if (
          link.startPattern === "solid-arrow" &&
          link.endPattern === "solid-arrow"
        ) {
          link.specification.startPattern = "none";
          link.specification.endPattern = "none";
        }
      } else {
        link.specification.middlePattern = state.linkPattern;
      }
    }).then(() => {
      onPointerMove(state);
      tick();
    });

    onPointerMove(state);
  },
  onPointerDown: state => {
    const link =
      state.simulator.getLinkAt(state.x, state.y) ??
      state.simulator.getLinkByTitleAt(state.x, state.y);

    // The user clicks on a link.
    if (link) {
      onPointerMove(state);
      return;
    }

    const subsystem = state.simulator.getSubsystemAt(state.x, state.y);

    // The user clicks on a system.
    if (subsystem) {
      a = subsystem;
      viewport.pause = true;
      onPointerMove(state);
      return;
    }

    onPointerMove(state);
  },
  onPointerMove,
};

export default operation;
