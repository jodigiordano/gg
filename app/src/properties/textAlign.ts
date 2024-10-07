import { TextAlign } from "@gg/core";

let textAlign: TextAlign | null = null;
let onChangeCallback: ((pattern: TextAlign) => void) | null = null;

const propertyTitle = document.getElementById("property-text-align-title")!;
const property = document.getElementById("property-text-align")!;

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

    textAlign = button.dataset.value as TextAlign;

    if (onChangeCallback) {
      onChangeCallback(textAlign);
    }

    // Remove focus once clicked.
    this.blur();
  });
}

export function show(
  options: {
    initial?: TextAlign;
    onChange?: (pattern: TextAlign) => void;
  } = {},
): void {
  propertyTitle.classList.remove("hidden");
  property.classList.remove("hidden");

  textAlign = options.initial ?? null;
  onChangeCallback = options.onChange ?? null;

  resetButtonStates();

  for (const button of buttons) {
    if (button.dataset.value === textAlign) {
      button.classList.add("selected");
    }
  }
}

export function hide(): void {
  propertyTitle.classList.add("hidden");
  property.classList.add("hidden");

  onChangeCallback = null;
}

export function value(): TextAlign {
  return textAlign ?? "left";
}
