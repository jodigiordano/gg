import { addSubsystem, RuntimeSize } from "@gg/core";
import SystemSelector from "../renderer/systemSelector.js";
import { State } from "../state.js";
import { modifySpecification } from "../simulator/api.js";
import Operation from "../operation.js";
import viewport from "../renderer/viewport.js";
import { tick } from "../renderer/pixi.js";
import * as SystemBorderProperty from "../properties/systemBorder.js";
import * as TextAlignProperty from "../properties/textAlign.js";
import * as TextFontProperty from "../properties/textFont.js";

const placeholderVisual = new SystemSelector();
const parentVisual = new SystemSelector();

const SystemMinSize: RuntimeSize = {
  width: 7,
  height: /* title */ 2 + /* placeholders */ 3 * 3,
};

function onPointerMove(state: State): void {
  parentVisual.visible = false;
  viewport.pause = true;

  placeholderVisual.setPositionRect(
    state.x - Math.floor(SystemMinSize.width / 2),
    state.y - Math.floor(SystemMinSize.height / 2),
    state.x + SystemMinSize.width - 1 - Math.floor(SystemMinSize.width / 2),
    state.y + SystemMinSize.height - 1 - Math.floor(SystemMinSize.height / 2),
  );

  const parent = state.simulator.getSubsystemAt(state.x, state.y);

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
  id: "operation-add-list",
  setup: () => {
    viewport.addChild(placeholderVisual);
    viewport.addChild(parentVisual);
  },
  onBegin: state => {
    placeholderVisual.visible = true;
    parentVisual.visible = false;

    SystemBorderProperty.show({ initial: "light" });
    TextAlignProperty.show({ initial: "left" });
    TextFontProperty.show({ initial: "text" });

    viewport.pause = false;
    onPointerMove(state);
  },
  onEnd: () => {
    placeholderVisual.visible = false;
    parentVisual.visible = false;

    SystemBorderProperty.hide();
    TextAlignProperty.hide();
    TextFontProperty.hide();

    viewport.pause = false;
  },
  onPointerUp: state => {
    const parent =
      state.simulator.getSubsystemAt(state.x, state.y) ??
      state.simulator.getSystem();

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
      const list = addSubsystem(parent, "list", x, y, "List", {
        borderPattern: SystemBorderProperty.value(),
        titleAlign: TextAlignProperty.value(),
        titleFont: TextFontProperty.value(),
      });

      addSubsystem(list, "box", 0, 0, "item 1");
      addSubsystem(list, "box", 0, 10, "item 2");
      addSubsystem(list, "box", 0, 20, "item 3");
    }).then(() => {
      onAdded(state);
      tick();
    });
  },
  onPointerMove,
  onPointerDown: onPointerMove,
  onKeyDown: () => {},
  onPointerEnter: state => {
    placeholderVisual.visible = true;

    onPointerMove(state);
  },
  onPointerLeave: () => {
    placeholderVisual.visible = false;
    parentVisual.visible = false;
  },
};

export default operation;
