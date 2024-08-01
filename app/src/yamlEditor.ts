// HTML selectors.
const yamlEditorDialog = document.getElementById(
  "yaml-editor",
) as HTMLDialogElement;

const yamlEditor = yamlEditorDialog?.querySelector(
  "textarea",
) as HTMLTextAreaElement;

export function setYamlEditorValue(value: string): void {
  yamlEditor.value = value;
}

export function getYamlEditorValue(): string {
  return yamlEditor.value;
}

export function openYamlEditor(): void {
  // Disable autofocus on the first input when opening the modal.
  yamlEditorDialog.inert = true;
  yamlEditorDialog.showModal();
  yamlEditorDialog.inert = false;
}

export function isYamlEditorOpen(): boolean {
  return yamlEditorDialog.open;
}
