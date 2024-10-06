import { PathPattern } from "@gg/core";

//
// Line pattern
//

let linePattern: PathPattern = "solid-line";

const propertyTitle = document.getElementById("property-line-pattern-title")!;
const property = document.getElementById("property-line-pattern")!;

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

    linePattern = button.dataset.value as PathPattern;

    // Remove focus once clicked.
    this.blur();
  });
}

export function showLinePattern(initial: PathPattern = "solid-line"): void {
  propertyTitle.classList.remove("hidden");
  property.classList.remove("hidden");

  linePattern = initial;

  resetButtonStates();

  for (const button of buttons) {
    if (button.dataset.value === linePattern) {
      button.classList.add("selected");
    }
  }
}

export function hideLinePattern(): void {
  propertyTitle.classList.add("hidden");
  property.classList.add("hidden");
}

export function getLinePattern(): PathPattern {
  return linePattern;
}
