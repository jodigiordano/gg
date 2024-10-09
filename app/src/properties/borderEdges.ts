import { BorderEdge } from "@gg/core";

let borderEdges: BorderEdge | null = null;
let onChangeCallback: ((pattern: BorderEdge) => void) | null = null;

const propertyTitle = document.getElementById("property-border-edges-title")!;
const property = document.getElementById("property-border-edges")!;

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

    borderEdges = button.dataset.value as BorderEdge;

    if (onChangeCallback) {
      onChangeCallback(borderEdges);
    }

    // Remove focus once clicked.
    this.blur();
  });
}

export function show(
  options: {
    initial?: BorderEdge;
    onChange?: (pattern: BorderEdge) => void;
  } = {},
): void {
  // TODO: to activate when the feature is completed.
  //propertyTitle.classList.remove("hidden");
  //property.classList.remove("hidden");

  borderEdges = options.initial ?? null;
  onChangeCallback = options.onChange ?? null;

  resetButtonStates();

  for (const button of buttons) {
    if (button.dataset.value === borderEdges) {
      button.classList.add("selected");
    }
  }
}

export function hide(): void {
  propertyTitle.classList.add("hidden");
  property.classList.add("hidden");

  onChangeCallback = null;
}

export function value(): BorderEdge {
  return borderEdges ?? "straight";
}
