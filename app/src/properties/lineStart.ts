import { PathEndingPattern } from "@gg/core";

let lineStart: PathEndingPattern | null = null;
let onChangeCallback: ((pattern: PathEndingPattern) => void) | null = null;

const propertyTitle = document.getElementById("property-line-start-title")!;
const property = document.getElementById("property-line-start")!;

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

    lineStart = button.dataset.value as PathEndingPattern;

    if (onChangeCallback) {
      onChangeCallback(lineStart);
    }

    // Remove focus once clicked.
    this.blur();
  });
}

export function show(
  options: {
    initial?: PathEndingPattern;
    onChange?: (pattern: PathEndingPattern) => void;
  } = {},
): void {
  propertyTitle.classList.remove("hidden");
  property.classList.remove("hidden");

  lineStart = options.initial ?? null;
  onChangeCallback = options.onChange ?? null;

  resetButtonStates();

  for (const button of buttons) {
    if (button.dataset.value === lineStart) {
      button.classList.add("selected");
    }
  }
}

export function hide(): void {
  propertyTitle.classList.add("hidden");
  property.classList.add("hidden");

  onChangeCallback = null;
}

export function value(): PathEndingPattern {
  return lineStart ?? "none";
}
