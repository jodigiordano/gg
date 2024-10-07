import { TextFont } from "@gg/core";

let textFont: TextFont | null = null;
let onChangeCallback: ((pattern: TextFont) => void) | null = null;

const propertyTitle = document.getElementById("property-text-font-title")!;
const property = document.getElementById("property-text-font")!;

const buttons = property.querySelectorAll(
  "button",
) as unknown as HTMLButtonElement[];

function resetButtonStates(): void {
  for (const button of buttons) {
    button.classList.remove("selected");
  }
}

for (const button of buttons) {
  button.addEventListener("click", function () {
    resetButtonStates();

    button.classList.add("selected");

    textFont = button.dataset.value as TextFont;

    if (onChangeCallback) {
      onChangeCallback(textFont);
    }

    // Remove focus once clicked.
    this.blur();
  });
}

export function show(
  options: {
    initial?: TextFont;
    onChange?: (pattern: TextFont) => void;
  } = {},
): void {
  propertyTitle.classList.remove("hidden");
  property.classList.remove("hidden");

  textFont = options.initial ?? null;
  onChangeCallback = options.onChange ?? null;

  resetButtonStates();

  for (const button of buttons) {
    if (button.dataset.value === textFont) {
      button.classList.add("selected");
    }
  }
}

export function hide(): void {
  propertyTitle.classList.add("hidden");
  property.classList.add("hidden");

  onChangeCallback = null;
}

export function value(): TextFont {
  return textFont ?? "text";
}
