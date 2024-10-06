import { PathPattern } from "@gg/core";

let lineMiddle: PathPattern | null = null;
let onChangeCallback: ((pattern: PathPattern) => void) | null = null;

const propertyTitle = document.getElementById("property-line-middle-title")!;
const property = document.getElementById("property-line-middle")!;

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

    lineMiddle = button.dataset.value as PathPattern;

    if (onChangeCallback) {
      onChangeCallback(lineMiddle);
    }

    // Remove focus once clicked.
    this.blur();
  });
}

export function show(
  options: {
    initial?: PathPattern;
    onChange?: (pattern: PathPattern) => void;
  } = {},
): void {
  propertyTitle.classList.remove("hidden");
  property.classList.remove("hidden");

  lineMiddle = options.initial ?? null;
  onChangeCallback = options.onChange ?? null;

  resetButtonStates();

  for (const button of buttons) {
    if (button.dataset.value === lineMiddle) {
      button.classList.add("selected");
    }
  }
}

export function hide(): void {
  propertyTitle.classList.add("hidden");
  property.classList.add("hidden");

  onChangeCallback = null;
}

export function value(): PathPattern {
  return lineMiddle ?? "solid-line";
}
