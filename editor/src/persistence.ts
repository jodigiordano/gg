// @ts-ignore
import pako from "pako";

export function load(): string | null {
  let value: string | null = null;

  const urlParams = getUrlParams();

  if (urlParams.file) {
    try {
      value = new TextDecoder().decode(
        pako.inflate(
          Uint8Array.from(window.atob(urlParams.file), c => c.codePointAt(0)!),
        ),
      );
    } catch (err) {
      console.warn(
        "Could not load data from URL because:",
        (err as Error).message ?? err,
      );
    }
  } else {
    value = window.localStorage.getItem("file");
  }

  return value;
}

export function save(value: string): void {
  window.localStorage.setItem("file", value);

  const encodedValue = window.btoa(
    String.fromCodePoint(...pako.deflate(new TextEncoder().encode(value))),
  );

  const urlParams = getUrlParams();

  urlParams.file = encodedValue;

  window.history.replaceState(
    null,
    "",
    `${document.location.pathname}#${Object.entries(urlParams)
      .map(kvp => kvp.join("="))
      .join("&")}`,
  );
}

export function getUrlParams(): Record<string, string> {
  return Object.fromEntries(
    window.location.hash
      .substring(1)
      .split("&")
      .map(entry => entry.split("=")),
  );
}
