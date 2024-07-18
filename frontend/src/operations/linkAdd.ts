import { Graphics } from "pixi.js";
import { addLink, RuntimeSubsystem } from "@gg/spec";
import SystemSelector from "../systemSelector.js";
import { modifySpecification } from "../simulation.js";
import Operation from "../operation.js";
import { State } from "../state.js";
import { viewport } from "../viewport.js";
import { BlockSize } from "../consts.js";

const selectAVisual = new SystemSelector();
const selectBVisual = new SystemSelector();
const linkingLine = new Graphics();

let a: RuntimeSubsystem | null = null;

function onPointerMove(state: State) {
  const subsystem = state.simulator.getSubsystemAt(state.x, state.y);

  if (a) {
    selectAVisual.visible = true;
    selectAVisual.setPosition(a, { x: 0, y: 0 });

    if (subsystem && !subsystem.systems.length) {
      selectBVisual.visible = true;
      selectBVisual.setPosition(subsystem, { x: 0, y: 0 });
    } else {
      selectBVisual.visible = false;
    }

    linkingLine.visible = true;
    linkingLine.clear();
    linkingLine.lineStyle(BlockSize / 4, 0xffffff);

    linkingLine.moveTo(
      (a.position.x + a.size.width / 2) * BlockSize,
      (a.position.y + a.size.height / 2) * BlockSize,
    );

    linkingLine.lineTo(state.x * BlockSize, state.y * BlockSize);
  } else {
    selectBVisual.visible = false;
    linkingLine.visible = false;

    if (subsystem && !subsystem.systems.length) {
      selectAVisual.visible = true;
      selectAVisual.setPosition(subsystem, { x: 0, y: 0 });
    } else {
      selectAVisual.visible = false;
    }
  }
}

const operation: Operation = {
  id: "operation-link-add",
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
  },
  onMute: () => {
    selectAVisual.visible = false;
    selectBVisual.visible = false;
    linkingLine.visible = false;
  },
  onUnmute: onPointerMove,
  onPointerUp: state => {
    if (!a) {
      return;
    }

    // Apply operation.
    const b = state.simulator.getSubsystemAt(state.x, state.y);

    if (b && b.id !== a.id && !b.systems.length) {
      modifySpecification(() => {
        addLink(state.system, a!.id, b!.id);
      });
    }

    // Reset operation.
    a = null;

    viewport.pause = false;

    onPointerMove(state);
  },
  onPointerDown: state => {
    const subsystem = state.simulator.getSubsystemAt(state.x, state.y);

    if (!subsystem || subsystem.systems.length) {
      onPointerMove(state);
      return;
    }

    a = subsystem;

    viewport.pause = true;

    onPointerMove(state);
  },
  onPointerMove,
};

export default operation;
