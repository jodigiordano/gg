import { TextAlign, TextFont } from "@gg/core";

let onChangeCallback:
  | ((value: string, font: TextFont, align: TextAlign) => void)
  | null = null;

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
    if (onChangeCallback) {
      onChangeCallback(editor.value, getFont(), getAlign());
    }

    dialog.close();
  });

//
// Cancel
//

document
  .getElementById("operation-set-title-cancel")
  ?.addEventListener("click", function () {
    dialog.close();
  });

dialog.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    dialog.close();
  }
});

export function open(
  options: {
    value?: string;
    font?: TextFont;
    align?: TextAlign;
    onChange?: (value: string, font: TextFont, align: TextAlign) => void;
  } = {},
): void {
  onChangeCallback = options.onChange ?? null;

  title.innerHTML = options.value ? "Edit title" : "Add title";
  editor.value = (options.value ?? "").replace(/\\n/g, "\n");
  editorWrapper.dataset.replicatedValue = editor.value;

  setFont(options.font ?? "text");
  setAlign(options.align ?? "center");

  dialog.inert = true;
  dialog.showModal();
  dialog.inert = false;

  editor.focus();
}
