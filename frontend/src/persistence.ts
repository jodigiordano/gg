// @ts-ignore
import pako from "pako";

export function load(): string | null {
  let value: string | null = null;

  if (window.location.hash.startsWith("#file=")) {
    try {
      const valueFromUrl = window.location.hash.substring("#file=".length);
      value = new TextDecoder().decode(
        pako.inflate(
          Uint8Array.from(window.atob(valueFromUrl), c => c.codePointAt(0)!),
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

  window.location.hash = `file=${encodedValue}`;
}
