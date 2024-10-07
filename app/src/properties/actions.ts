export type SelectAction = "delete" | "duplicate" | "paint";

let onChangeCallback: ((action: SelectAction) => void) | null = null;

const propertyTitle = document.getElementById("property-actions-title")!;
const property = document.getElementById("property-actions")!;

const buttons = property.querySelectorAll(
  "button",
) as unknown as HTMLButtonElement[];

for (const button of buttons) {
  button.addEventListener("click", function () {
    if (onChangeCallback) {
      onChangeCallback(button.dataset.value as SelectAction);
    }

    // Remove focus once clicked.
    this.blur();
  });
}

export function show(
  options: {
    actions?: SelectAction[];
    onChange?: (action: SelectAction) => void;
  } = {},
): void {
  propertyTitle.classList.remove("hidden");
  property.classList.remove("hidden");

  onChangeCallback = options.onChange ?? null;

  for (const button of buttons) {
    if (
      !options.actions ||
      options.actions.includes(button.dataset.value as SelectAction)
    ) {
      button.classList.remove("hidden");
    } else {
      button.classList.add("hidden");
    }
  }
}

export function hide(): void {
  propertyTitle.classList.add("hidden");
  property.classList.add("hidden");

  onChangeCallback = null;
}
