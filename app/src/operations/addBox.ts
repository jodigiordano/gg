import { addSubsystem, RuntimeSize, RuntimeSubsystem } from "@gg/core";
import SystemSelector from "../renderer/systemSelector.js";
import { State } from "../state.js";
import { modifySpecification } from "../simulator/api.js";
import Operation from "../operation.js";
import viewport from "../renderer/viewport.js";
import { tick } from "../renderer/pixi.js";
import * as BorderProperty from "../properties/border.js";
import * as BorderEdgesProperty from "../properties/borderEdges.js";
import * as TextAlignProperty from "../properties/textAlign.js";
import * as TextFontProperty from "../properties/textFont.js";
import * as OpacityProperty from "../properties/opacity.js";

const placeholderVisual = new SystemSelector();
const parentVisual = new SystemSelector();

const SystemMinSize: RuntimeSize = {
  width: 5,
  height: 3,
};

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

function onPointerMove(state: State): void {
  parentVisual.visible = false;

  placeholderVisual.setPositionRect(
    state.x - Math.floor(SystemMinSize.width / 2),
    state.y - Math.floor(SystemMinSize.height / 2),
    state.x + SystemMinSize.width - 1 - Math.floor(SystemMinSize.width / 2),
    state.y + SystemMinSize.height - 1 - Math.floor(SystemMinSize.height / 2),
  );

  const parent = state.simulator.getSubsystemAt(state.x, state.y);

  // The box is added to the perimeter of a system,
  // which is part of a list.
  if (
    parent?.parent?.type === "list" &&
    isSystemPadding(parent, state.x, state.y)
  ) {
    parentVisual.setPosition(parent.parent, { x: 0, y: 0 });
    parentVisual.visible = true;

    return;
  }

  if (parent) {
    parentVisual.setPosition(parent, { x: 0, y: 0 });
    parentVisual.visible = true;
  }
}

function onAdded(state: State): void {
  placeholderVisual.visible = true;
  parentVisual.visible = false;

  viewport.pause = false;
  onPointerMove(state);
}

const operation: Operation = {
  id: "operation-add-box",
  setup: () => {
    viewport.addChild(placeholderVisual);
    viewport.addChild(parentVisual);
  },
  onBegin: state => {
    BorderProperty.show({ initial: "light" });
    BorderEdgesProperty.show({ initial: "straight" });
    TextAlignProperty.show({ initial: "left" });
    TextFontProperty.show({ initial: "text" });
    OpacityProperty.show({ initial: 1 });

    onAdded(state);
  },
  onEnd: () => {
    placeholderVisual.visible = false;
    parentVisual.visible = false;

    BorderProperty.hide();
    BorderEdgesProperty.hide();
    TextAlignProperty.hide();
    TextFontProperty.hide();
    OpacityProperty.hide();

    viewport.pause = false;
  },
  onPointerUp: state => {
    let parent =
      state.simulator.getSubsystemAt(state.x, state.y) ??
      state.simulator.getSystem();

    // The box is added to the perimeter of another box,
    // which is part of a list.
    if (
      parent.parent?.type === "list" &&
      isSystemPadding(parent as RuntimeSubsystem, state.x, state.y)
    ) {
      parent = parent.parent;
    }

    let x: number;
    let y: number;

    if (parent.id) {
      const offset = state.simulator.getParentOffset(parent);

      x = Math.max(0, state.x - parent.position.x - offset.x);
      y = Math.max(0, state.y - parent.position.y - offset.y);
    } else {
      x = state.x;
      y = state.y;
    }

    x -= Math.floor(SystemMinSize.width / 2);
    y -= Math.floor(SystemMinSize.height / 2);

    modifySpecification(() => {
      addSubsystem(parent, "box", x, y, "", {
        borderPattern: BorderProperty.value(),
        borderEdges: BorderEdgesProperty.value(),
        titleAlign: TextAlignProperty.value(),
        titleFont: TextFontProperty.value(),
        opacity: OpacityProperty.value(),
      });
    }).then(() => {
      onAdded(state);
      tick();
    });
  },
  onPointerMove,
  onPointerDown: state => {
    viewport.pause = true;

    onPointerMove(state);
  },
  onKeyDown: () => {},
  onPointerEnter: (state: State) => {
    placeholderVisual.visible = true;

    onPointerMove(state);
  },
  onPointerLeave: () => {
    placeholderVisual.visible = false;
    parentVisual.visible = false;
  },
};

export default operation;
