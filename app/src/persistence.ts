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

  setUrlParams(urlParams);
}

export interface UrlParams {
  file?: string;
  autoplay: boolean;
  speed: number;
}

export function setUrlParams(urlParams: UrlParams): void {
  const params: Record<string, unknown> = { ...urlParams };

  if (!params.autoplay) {
    delete params.autoplay;
  }

  if (params.speed === 1) {
    delete params.speed;
  }

  window.history.replaceState(
    null,
    "",
    `${document.location.pathname}#${Object.entries(params)
      .map(kvp => kvp.join("="))
      .join("&")}`,
  );
}

export function getUrlParams(): UrlParams {
  const urlParams = Object.fromEntries(
    window.location.hash
      .substring(1)
      .split("&")
      .map(entry => entry.split("=")),
  );

  urlParams.autoplay = urlParams.autoplay === "true";

  const speed = Number(urlParams.speed);

  urlParams.speed = !isNaN(speed) ? Math.max(0.1, Math.min(5, speed)) : 1;

  return urlParams;
}
