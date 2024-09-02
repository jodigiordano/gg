// @ts-ignore
import pako from "pako";

export async function load(): Promise<string> {
  const urlParams = getUrlParams();

  let value: string | null = null;

  if (urlParams.id) {
    const response = await fetch(`/api/graphs/${urlParams.id}`);

    if (!response.ok) {
      throw new Error(`GET /api/graphs/${urlParams.id} failed`);
    }

    const graph = await response.json();

    return JSON.stringify(graph.data, null, 2);
  } else if (urlParams.file) {
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

export async function save(value: string): Promise<void> {
  const urlParams = getUrlParams();

  // Cloud save.
  if (urlParams.id) {
    try {
      const response = await fetch(`/api/graphs/${urlParams.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: value,
        }),
      });

      if (response.status !== 204) {
        window.localStorage.setItem(urlParams.id, value);

        throw new Error(`PATCH /api/graphs/${urlParams.id} failed`);
      }
    } catch {
      window.localStorage.setItem(urlParams.id, value);

      throw new Error(`PATCH /api/graphs/${urlParams.id} failed`);
    }

    return;
  }

  // Local save.
  window.localStorage.setItem("file", value);

  const encodedValue = window.btoa(
    String.fromCodePoint(...pako.deflate(new TextEncoder().encode(value))),
  );

  urlParams.file = encodedValue;

  setUrlParams(urlParams);
}

export interface UrlParams {
  file?: string;
  id?: string;
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

export function resetUrlParams(): void {
  window.history.replaceState(null, "", document.location.pathname);
}
