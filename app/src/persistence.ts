// @ts-ignore
import pako from "pako";

export async function load(): Promise<string> {
  const urlParams = getUrlParams();

  let value: string | null = null;

  if (urlParams.file) {
    value = new TextDecoder().decode(
      pako.inflate(
        Uint8Array.from(window.atob(urlParams.file), c => c.codePointAt(0)!),
      ),
    );
  } else {
    value = window.localStorage.getItem("file");
  }

  if (!value) {
    value = JSON.stringify(
      {
        specificationVersion: "1.0.0",
        title: "Untitled chart",
      },
      null,
      2,
    );
  }

  return value;
}

export async function save(value: string): Promise<void> {
  const urlParams = getUrlParams();

  window.localStorage.setItem("file", value);

  const encodedValue = window.btoa(
    String.fromCodePoint(...pako.deflate(new TextEncoder().encode(value))),
  );

  urlParams.file = encodedValue;

  setUrlParams(urlParams);
}

export function isNewUser(): boolean {
  const hasLocalStorageSave = window.localStorage.getItem("file");
  const hasLocalSave = !!getUrlParams().file;
  const hasCloudSave = !!getUrlParams().id;

  const hasSeenWelcomeMessage =
    window.localStorage.getItem("welcomed") === "true";

  const isNewUser =
    !hasLocalStorageSave &&
    !hasLocalSave &&
    !hasCloudSave &&
    !hasSeenWelcomeMessage;

  if (isNewUser) {
    window.localStorage.setItem("welcomed", "true");
  }

  return isNewUser;
}

export interface UrlParams {
  file?: string;
  id?: string;
  zoomControls: boolean;
  editorButton: boolean;
}

export function setUrlParams(urlParams: UrlParams): void {
  const params: Record<string, unknown> = { ...urlParams };

  if (params.zoomControls) {
    delete params.zoomControls;
  }

  if (params.editorButton) {
    delete params.editorButton;
  }

  const hash = Object.entries(params)
    .filter(([key, value]) => key !== "" && value !== "")
    .map(kvp => kvp.join("="))
    .join("&");

  window.history.replaceState(
    null,
    "",
    `${document.location.pathname}#${hash}`,
  );
}

export function getUrlParams(): UrlParams {
  const urlParams = Object.fromEntries(
    window.location.hash
      .substring(1)
      .split("&")
      .map(entry => entry.split("=")),
  );

  urlParams.zoomControls = urlParams.zoomControls === "false" ? false : true;
  urlParams.editorButton = urlParams.editorButton === "false" ? false : true;

  return urlParams;
}

export function resetUrlParams(): void {
  window.history.replaceState(null, "", document.location.pathname);
}
