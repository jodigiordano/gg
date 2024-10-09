let opacity: number | null = null;
let onChangeCallback: ((opacity: number) => void) | null = null;

const propertyTitle = document.getElementById("property-opacity-title")!;
const property = document.getElementById("property-opacity")!;

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

    opacity = Number(button.dataset.value);

    if (onChangeCallback) {
      onChangeCallback(opacity);
    }

    // Remove focus once clicked.
    this.blur();
  });
}

export function show(
  options: {
    initial?: number;
    onChange?: (opacity: number) => void;
  } = {},
): void {
  propertyTitle.classList.remove("hidden");
  property.classList.remove("hidden");

  opacity = options.initial ?? null;
  onChangeCallback = options.onChange ?? null;

  resetButtonStates();

  for (const button of buttons) {
    if (Number(button.dataset.value) === opacity) {
      button.classList.add("selected");
    }
  }
}

export function hide(): void {
  propertyTitle.classList.add("hidden");
  property.classList.add("hidden");

  onChangeCallback = null;
}

export function value(): number {
  return opacity ?? 1;
}
