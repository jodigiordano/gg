import { getForegroundColor } from "../helpers.js";

const button = document.getElementById(
  "property-actions-paint",
) as HTMLButtonElement;

const dialog = document.getElementById(
  "input-set-color-dialog",
) as HTMLDialogElement;

const availableColors = dialog.querySelectorAll(".colors button");

let color: string | undefined = undefined;
let onChangeCallback: ((color: string | undefined) => void) | null = null;

for (const availableColor of availableColors) {
  availableColor.addEventListener("click", function () {
    color = (availableColor as HTMLDivElement).dataset.color;

    if (color === "") {
      color = undefined;
    }

    setColor(color);

    if (onChangeCallback) {
      onChangeCallback(color);
    }

    dialog.close();
  });
}

export function choose(
  options: {
    onChange?: (color: string | undefined) => void;
  } = {},
): void {
  onChangeCallback = options.onChange ?? null;

  dialog.inert = true;
  dialog.showModal();
  dialog.inert = false;
}

export function setColor(color: string | undefined): void {
  if (color) {
    button.style.backgroundColor = color;
    button.style.color = getForegroundColor(color);
  } else {
    button.style.removeProperty("background-color");
    button.style.removeProperty("color");
  }
}

export function reset(): void {
  setColor(undefined);
  onChangeCallback = null;
}

export function value(): string | undefined {
  return color;
}
