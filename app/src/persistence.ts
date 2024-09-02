// @ts-ignore
import pako from "pako";

export function load(): string {
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
        title: "Untitled graph",
      },
      null,
      2,
    );
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

  urlParams.autoplay = urlParams.autoplay === "true";

  const speed = Number(urlParams.speed);

  urlParams.speed = !isNaN(speed) ? Math.max(0.1, Math.min(5, speed)) : 1;

  return urlParams;
}
