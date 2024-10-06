import { BorderPattern } from "@gg/core";

//
// Border pattern
//

let borderPattern: BorderPattern | null = null;
let onChangeCallback: ((pattern: BorderPattern) => void) | null = null;

const propertyTitle = document.getElementById("property-border-title")!;
const property = document.getElementById("property-border")!;

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

    borderPattern = button.dataset.value as BorderPattern;

    if (onChangeCallback) {
      onChangeCallback(borderPattern);
    }

    // Remove focus once clicked.
    this.blur();
  });
}

export function showBorderPattern(
  options: {
    initial?: BorderPattern;
    onChange?: (pattern: BorderPattern) => void;
  } = {},
): void {
  propertyTitle.classList.remove("hidden");
  property.classList.remove("hidden");

  borderPattern = options.initial ?? null;
  onChangeCallback = options.onChange ?? null;

  resetButtonStates();

  for (const button of buttons) {
    if (button.dataset.value === borderPattern) {
      button.classList.add("selected");
    }
  }
}

export function hideBorderPattern(): void {
  propertyTitle.classList.add("hidden");
  property.classList.add("hidden");

  onChangeCallback = null;
}

export function getBorderPattern(): BorderPattern {
  return borderPattern ?? "light";
}
