import { Container, Sprite, Text } from "pixi.js";
import {
  RuntimeSubsystem,
  setSubsystemTitle,
  TitleCharsPerSquare,
} from "@gg/spec";
import { BlockSize } from "../consts.js";
import Operation from "../operation.js";
import { spritesheet } from "../assets.js";
import SystemSelector from "../systemSelector.js";
import { modifySpecification } from "../simulation.js";
import { State } from "../state.js";
import { viewport } from "../viewport.js";

const editorContainer = new Container();

editorContainer.sortableChildren = true;
editorContainer.zIndex = 100;
editorContainer.visible = false;

const mask = new Sprite(spritesheet.textures.systemACenterCenter);
mask.zIndex = 1;

// @ts-ignore
editorContainer.addChild(mask);

const editor = new Text("", {
  fontFamily: "Ibm",
  fontSize: BlockSize,
  lineHeight: BlockSize,
});

editor.style.fill = "0xffffff";
editor.resolution = 2;
editor.zIndex = 2;

// @ts-ignore
editorContainer.addChild(editor);

const cursor = new Text("▋", {
  fontFamily: "Ibm",
  fontSize: BlockSize,
  lineHeight: BlockSize,
});

cursor.style.fill = "0xffffff";
cursor.resolution = 2;
cursor.zIndex = 3;

// @ts-ignore
editorContainer.addChild(cursor);

const selectVisual = new SystemSelector();

// @ts-ignore
editorContainer.addChild(selectVisual);

let subsystem: RuntimeSubsystem | null = null;
let editing = false;

function onPointerMove(state: State) {
  const subsystem = state.simulator.getSubsystemAt(state.x, state.y);

  if (subsystem) {
    selectVisual.setPosition(subsystem, { x: 0, y: 0 });
    selectVisual.visible = true;
    viewport.pause = true;
  } else {
    selectVisual.visible = false;
    viewport.pause = false;
  }
}

const operation: Operation = {
  id: "operation-system-set-title",
  setup: () => {
    viewport.addChild(editorContainer);
    viewport.addChild(selectVisual);
  },
  onBegin: state => {
    subsystem = null;
    editing = false;

    onPointerMove(state);
  },
  onEnd() {
    editorContainer.visible = false;
    selectVisual.visible = false;
  },
  onMute: () => {
    selectVisual.visible = false;
  },
  onUnmute: onPointerMove,
  onPointerMove,
  onPointerDown(state) {
    // Happens when the user selects the subsystem B
    // while editing the subsystem A.
    if (subsystem && editing) {
      // Apply operation.
      modifySpecification(() => {
        setSubsystemTitle(subsystem!, editor.text.replace(/\n/g, "\\n"));
      });

      // Reset operation.
      editorContainer.visible = false;

      subsystem = null;
      editing = false;
    }

    onPointerMove(state);
  },
  onPointerUp(state) {
    const ss = state.simulator.getSubsystemAt(state.x, state.y);

    if (!ss) {
      return;
    }

    subsystem = ss;

    if (editing) {
      // Apply operation.
      modifySpecification(() => {
        setSubsystemTitle(subsystem!, editor.text.replace(/\n/g, "\\n"));
      });

      // Reset operation.
      editorContainer.visible = false;

      subsystem = null;
      editing = false;
    } else {
      const titleX =
        (subsystem.position.x + subsystem.titlePosition.x) * BlockSize;

      const titleY =
        (subsystem.position.y + subsystem.titlePosition.y) * BlockSize;

      mask.x = titleX;
      mask.y = titleY;
      mask.width = subsystem.titleSize.width * BlockSize;
      mask.height = subsystem.titleSize.height * BlockSize;

      const title = subsystem.title.replace(/\\n/g, "\n");

      editor.text = title;
      editor.x = titleX;
      editor.y = titleY;

      const titleLastLineLength = title.split("\n").at(-1)!.length;

      cursor.x =
        editor.x +
        (titleLastLineLength % 2 === 0
          ? (titleLastLineLength / TitleCharsPerSquare) * BlockSize
          : ((titleLastLineLength - 1) / TitleCharsPerSquare) * BlockSize +
            BlockSize / TitleCharsPerSquare);

      cursor.y = editor.y + editor.height - BlockSize;

      editorContainer.visible = true;

      editing = true;
    }
  },
  onTick() {
    if (editing) {
      cursor.visible = ((Date.now() / 500) | 0) % 2 === 0;
    }
  },
  onKeyDown(state, event) {
    if (!subsystem) {
      return false;
    }

    let titleModified = false;
    let finishOperation = false;

    if (event.key === "Backspace") {
      editor.text = editor.text.slice(0, -1);
      titleModified = true;
    } else if (event.key === "Escape") {
      finishOperation = true;
    } else if (event.shiftKey && event.key === "Enter") {
      editor.text = editor.text + "\n";
      titleModified = true;
    } else if (event.key === "Enter") {
      modifySpecification(() => {
        setSubsystemTitle(subsystem!, editor.text.replace(/\n/g, "\\n"));
      });

      // Trick to hide the virtual keyboard on mobile.
      document.getElementById(
        "operation-system-set-title-input",
      )!.style.display = "none";

      finishOperation = true;
    } else if (event.key.length === 1) {
      editor.text = editor.text + event.key;

      // Example: prevents "/" from opening the Quick Search in Firefox.
      event.preventDefault();

      titleModified = true;
    }

    if (titleModified) {
      const currentTitleWidth = subsystem!.titleSize.width;
      const currentTitleHeight = subsystem!.titleSize.height;

      const titleLengths = editor.text.split("\n").map(line => line.length);

      const newTitleWidth =
        Math.ceil(Math.max(...titleLengths) / TitleCharsPerSquare) | 0;

      const newTitleHeight = titleLengths.length;

      mask.width = Math.max(currentTitleWidth, newTitleWidth) * BlockSize;

      mask.height = Math.max(currentTitleHeight, newTitleHeight) * BlockSize;

      cursor.x =
        editor.x +
        (titleLengths.at(-1)! % 2 === 0
          ? (titleLengths.at(-1)! / TitleCharsPerSquare) * BlockSize
          : ((titleLengths.at(-1)! - 1) / TitleCharsPerSquare) * BlockSize +
            BlockSize / TitleCharsPerSquare);

      cursor.y = editor.y + editor.height - BlockSize;
    }

    // Reset operation.
    if (finishOperation) {
      editorContainer.visible = false;

      subsystem = null;
      editing = false;

      onPointerMove(state);
    }

    return true;
  },
  onClick() {
    if (subsystem) {
      // Trick to show the virtual keyboard on mobile.
      const input = document.getElementById(
        "operation-system-set-title-input",
      )!;

      input.style.display = "inline-block";
      input.focus();
    }
  },
};

export default operation;
