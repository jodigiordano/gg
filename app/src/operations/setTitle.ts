import {
  RuntimeLink,
  RuntimeSubsystem,
  setSubsystemTitle,
  setLinkTitle,
  TextFont,
  TextAlign,
} from "@gg/core";
import Operation from "../operation.js";
import SystemSelector from "../renderer/systemSelector.js";
import { initializeText, modifySpecification } from "../simulator/api.js";
import { State } from "../state.js";
import viewport from "../renderer/viewport.js";
import { tick } from "../renderer/pixi.js";
import { state } from "../state.js";
import { BlockSize } from "../helpers.js";

const dialog = document.getElementById(
  "input-set-title-dialog",
) as HTMLDialogElement;

dialog.addEventListener("keydown", event => {
  event.stopPropagation();
});

const title = dialog.querySelector("h1") as HTMLElement;
const editorWrapper = dialog.querySelector(".editor-wrapper") as HTMLDivElement;
const editor = dialog.querySelector(".editor") as HTMLTextAreaElement;

editor.addEventListener("input", function () {
  editorWrapper.dataset.replicatedValue = editor.value;
});

//
// Font
//

const styleFontText = dialog.querySelector(
  ".styling-font-text",
) as HTMLButtonElement;

const styleFontSketch = dialog.querySelector(
  ".styling-font-sketch",
) as HTMLButtonElement;

const styleFontCode = dialog.querySelector(
  ".styling-font-code",
) as HTMLButtonElement;

function setFont(font: TextFont): void {
  editor.style.fontFamily = font;

  styleFontText.classList.remove("pressed");
  styleFontSketch.classList.remove("pressed");
  styleFontCode.classList.remove("pressed");

  if (font === "text") {
    styleFontText.classList.add("pressed");
  } else if (font === "sketch") {
    styleFontSketch.classList.add("pressed");
  } else {
    styleFontCode.classList.add("pressed");
  }
}

function getFont(): TextFont {
  if (styleFontText.classList.contains("pressed")) {
    return "text";
  }

  if (styleFontSketch.classList.contains("pressed")) {
    return "sketch";
  }

  return "code";
}

styleFontText.addEventListener("click", function () {
  setFont("text");
});

styleFontSketch.addEventListener("click", function () {
  setFont("sketch");
});

styleFontCode.addEventListener("click", function () {
  setFont("code");
});

//
// Align
//

const styleAlignLeft = dialog.querySelector(
  ".styling-align-left",
) as HTMLButtonElement;

const styleAlignCenter = dialog.querySelector(
  ".styling-align-center",
) as HTMLButtonElement;

const styleAlignRight = dialog.querySelector(
  ".styling-align-right",
) as HTMLButtonElement;

function setAlign(align: TextAlign): void {
  editor.style.textAlign = align;

  styleAlignLeft.classList.remove("pressed");
  styleAlignCenter.classList.remove("pressed");
  styleAlignRight.classList.remove("pressed");

  if (align === "left") {
    styleAlignLeft.classList.add("pressed");
  } else if (align === "center") {
    styleAlignCenter.classList.add("pressed");
  } else {
    styleAlignRight.classList.add("pressed");
  }
}

function getAlign(): TextAlign {
  if (styleAlignLeft.classList.contains("pressed")) {
    return "left";
  }

  if (styleAlignCenter.classList.contains("pressed")) {
    return "center";
  }

  return "right";
}

styleAlignLeft.addEventListener("click", function () {
  setAlign("left");
});

styleAlignCenter.addEventListener("click", function () {
  setAlign("center");
});

styleAlignRight.addEventListener("click", function () {
  setAlign("right");
});

//
// Apply
//

document
  .getElementById("operation-set-title-apply")
  ?.addEventListener("click", function () {
    // Apply operation.
    if (subsystem || link) {
      modifySpecification(() => {
        const title = initializeText(
          editor.value,
          "#000000",
          getFont(),
          getAlign(),
          subsystem
            ? subsystem.size.width -
                subsystem.titleMargin.left -
                subsystem.titleMargin.right -
                subsystem.padding.left -
                subsystem.padding.right
            : 1,
        );

        let width = 0;
        let height = 0;

        if (title.tokensFlat) {
          for (const token of title.tokensFlat) {
            const x = token.bounds.x === Infinity ? 0 : token.bounds.x;
            const y = token.bounds.y === Infinity ? 0 : token.bounds.y;

            if (x + token.bounds.width > width) {
              width = x + token.bounds.width;
            }

            if (y + token.bounds.height > height) {
              height = y + token.bounds.height;
            }
          }
        } else {
          width = title.width;
          height = title.height;
        }

        width /= BlockSize;
        height /= BlockSize;

        let minOverflowToAddOneMoreBlock = 0.5;

        if (link) {
          minOverflowToAddOneMoreBlock = 0.25;
        }

        width =
          width - Math.floor(width) > minOverflowToAddOneMoreBlock
            ? Math.ceil(width)
            : Math.floor(width);

        height =
          height - Math.floor(height) > minOverflowToAddOneMoreBlock
            ? Math.ceil(height)
            : Math.floor(height);

        if (subsystem) {
          setSubsystemTitle(
            subsystem,
            editor.value.replace(/\n/g, "\\n"),
            getFont(),
            getAlign(),
            width,
            height,
          );
        } else if (link) {
          setLinkTitle(
            link,
            editor.value.replace(/\n/g, "\\n"),
            getFont(),
            getAlign(),
            width,
            height,
          );
        }
      }).then(() => {
        onBegin(state);
        tick();
      });
    }

    dialog.close();
  });

//
// Cancel
//

document
  .getElementById("operation-set-title-cancel")
  ?.addEventListener("click", function () {
    onBegin(state);
  });

dialog.addEventListener("keydown", event => {
  if (event.key === "Escape" || event.key === "1") {
    onBegin(state);
  }
});

//
// State
//

const selectSystemVisual = new SystemSelector();
const selectLinkVisual1 = new SystemSelector();
const selectLinkVisual2 = new SystemSelector();
const selectLinkVisual3 = new SystemSelector();

let subsystem: RuntimeSubsystem | null = null;
let link: RuntimeLink | null = null;

//
// Handlers
//

function onPointerMove(state: State) {
  selectSystemVisual.visible = false;
  selectLinkVisual1.visible = false;
  selectLinkVisual2.visible = false;
  selectLinkVisual3.visible = false;
  viewport.pause = false;

  if (dialog.open) {
    selectSystemVisual.setPosition(subsystem!, { x: 0, y: 0 });
    selectSystemVisual.visible = true;
    viewport.pause = true;

    return;
  }

  const link =
    state.simulator.getLinkAt(state.x, state.y) ??
    state.simulator.getLinkByTitleAt(state.x, state.y);

  if (link) {
    const path = state.simulator.getPath(link)!;
    const boundaries = state.simulator.getBoundaries();

    const [startX, startY] = path.at(0)!;

    selectLinkVisual1.visible = true;
    selectLinkVisual1.setPositionRect(
      startX - boundaries.translateX,
      startY - boundaries.translateY,
      startX - boundaries.translateX,
      startY - boundaries.translateY,
    );

    const [endX, endY] = path.at(-1)!;

    selectLinkVisual2.visible = true;
    selectLinkVisual2.setPositionRect(
      endX - boundaries.translateX,
      endY - boundaries.translateY,
      endX - boundaries.translateX,
      endY - boundaries.translateY,
    );

    if (link.title.length > 0) {
      selectLinkVisual3.visible = true;
      selectLinkVisual3.setPositionRect(
        link.titlePosition.x,
        link.titlePosition.y,
        link.titlePosition.x + link.titleSize.width,
        link.titlePosition.y + link.titleSize.height,
      );
    }

    viewport.pause = true;

    return;
  }

  const ss = state.simulator.getSubsystemAt(state.x, state.y);

  if (ss) {
    selectSystemVisual.setPosition(ss, { x: 0, y: 0 });
    selectSystemVisual.visible = true;
    viewport.pause = true;
  }
}

function onBegin(state: State): void {
  subsystem = null;
  link = null;

  dialog.close();

  viewport.pause = false;
  onPointerMove(state);
}

const operation: Operation = {
  id: "operation-set-title",
  setup: () => {
    viewport.addChild(selectSystemVisual);
    viewport.addChild(selectLinkVisual1);
    viewport.addChild(selectLinkVisual2);
    viewport.addChild(selectLinkVisual3);
  },
  onBegin,
  onEnd: () => {
    selectSystemVisual.visible = false;
    selectLinkVisual1.visible = false;
    selectLinkVisual2.visible = false;
    selectLinkVisual3.visible = false;

    viewport.pause = false;
  },
  onMute: () => {
    selectSystemVisual.visible = false;
    selectLinkVisual1.visible = false;
    selectLinkVisual2.visible = false;
    selectLinkVisual3.visible = false;
  },
  onUnmute: onPointerMove,
  onPointerMove,
  onPointerDown: () => {},
  onKeyDown: () => {},
  onPointerUp: state => {
    if (dialog.open) {
      return;
    }

    const linkToEdit =
      state.simulator.getLinkAt(state.x, state.y) ??
      state.simulator.getLinkByTitleAt(state.x, state.y);

    if (linkToEdit) {
      link = linkToEdit;

      title.innerHTML = link.title ? "Edit title" : "Add title";
      editor.value = link.title.replace(/\\n/g, "\n");
      editorWrapper.dataset.replicatedValue = editor.value;

      setFont(link.titleFont);
      setAlign(link.titleAlign);

      dialog.showModal();
      editor.focus();

      return;
    }

    const systemToEdit = state.simulator.getSubsystemAt(state.x, state.y);

    if (systemToEdit) {
      subsystem = systemToEdit;

      title.innerHTML = subsystem.title ? "Edit title" : "Add title";
      editor.value = subsystem.title.replace(/\\n/g, "\n");
      editorWrapper.dataset.replicatedValue = editor.value;

      setFont(subsystem.titleFont);
      setAlign(subsystem.titleAlign);

      dialog.showModal();
      editor.focus();
    }
  },
};

export default operation;
