// HTML selectors.
const jsonEditorDialog = document.getElementById(
  "json-editor",
) as HTMLDialogElement;

const jsonEditor = jsonEditorDialog?.querySelector(
  "textarea",
) as HTMLTextAreaElement;

export function setJsonEditorValue(value: string): void {
  jsonEditor.value = value;
}

export function getJsonEditorValue(): string {
  return jsonEditor.value;
}

export function openJsonEditor(): void {
  // Disable autofocus on the first input when opening the modal.
  jsonEditorDialog.inert = true;
  jsonEditorDialog.showModal();
  jsonEditorDialog.inert = false;
}

export function isJsonEditorOpen(): boolean {
  return jsonEditorDialog.open;
}
