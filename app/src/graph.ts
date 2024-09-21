import { getUrlParams } from "./persistence.js";

// Load the id from the URL.
const params = getUrlParams();

// Go back to editor.
document
  .getElementById("operation-goto-editor")
  ?.addEventListener("click", function () {
    window.location.href = `/${window.location.hash}`;
  });

// Preview the graph.

const previewImg = document.getElementById("preview") as HTMLImageElement;

//
// Load graph
//

let graph: {
  id: string;
  public: boolean;
  data: Record<string, unknown>;
  title: string;
} = {
  id: params.id!,
  public: false,
  data: {},
  title: "",
};

const loadingContainer = document.getElementById(
  "loading-container",
) as HTMLDivElement;

const mainContainer = document.getElementById(
  "main-container",
) as HTMLDivElement;

fetch(`/api/graphs/${params.id}`)
  .then(async response => {
    if (response.ok) {
      // Switch container.
      loadingContainer.classList.add("hidden");
      mainContainer.classList.remove("hidden");

      // Parse the JSON response.
      graph = await response.json();

      // Set the preview.
      previewImg.src = previewImg.src.replace("GRAPH_ID", graph.id);

      previewImg.addEventListener("click", function () {
        window.location.href = `/${window.location.hash}`;
      });

      // Set the title.
      graphTitle.value = graph.title;

      // Set the public options.
      graphPublic.checked = graph.public;

      for (const option of additionalGraphPublicOptions) {
        if (graphPublic.checked) {
          option.classList.remove("hidden");
        } else {
          option.classList.add("hidden");
        }
      }

      graphPublicHideZoomControls.checked = false;
      graphPublicHideEditorButton.checked = false;

      graphPublicPreview.src = `/viewer.html#id=${graph.id}`;

      graphPublicUrl.value = [
        import.meta.env.VITE_PUBLIC_URL,
        `/viewer.html#id=${graph.id}`,
      ].join("");

      graphPublicEmbedUrl.value = [
        "<iframe",
        '  width="100%"',
        '  height="100%"',
        `  src="${graphPublicUrl.value}"`,
        "</iframe>",
      ].join("\n");

      graphPublicImageUrl.value = [
        import.meta.env.VITE_PUBLIC_URL,
        `/api/graphs/${graph.id}.png`,
      ].join("");
    } else {
      loadingContainer.innerHTML = "Could not load the graph. Please retry.";
    }
  })
  .catch(() => {
    loadingContainer.innerHTML = "Could not load the graph. Please retry.";
  });

//
// Edit title.
//

const graphTitle = document.getElementById(
  "option-graph-title",
) as HTMLInputElement;

graphTitle.addEventListener("change", () => {
  graph.data.title = graphTitle.value;

  fetch(`/api/graphs/${params.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: JSON.stringify(graph.data, null, 2) }),
  }).catch(() => {
    // TODO
  });
});

//
// Edit public
//

const graphPublic = document.getElementById(
  "option-graph-public",
) as HTMLInputElement;

const graphPublicUrl = document.getElementById(
  "public-url",
) as HTMLInputElement;

const graphPublicUrlCopy = document.getElementById(
  "public-url-copy",
) as HTMLButtonElement;

const graphPublicImageUrl = document.getElementById(
  "public-image",
) as HTMLInputElement;

const graphPublicImageCopy = document.getElementById(
  "public-image-copy",
) as HTMLButtonElement;

const graphPublicEmbedUrl = document.getElementById(
  "public-embed",
) as HTMLTextAreaElement;

const graphPublicEmbedCopy = document.getElementById(
  "public-embed-copy",
) as HTMLButtonElement;

const graphPublicPreview = document.getElementById(
  "public-preview",
) as HTMLIFrameElement;

const additionalGraphPublicOptions = document.querySelectorAll(
  ".option-graph-public-enabled",
);

graphPublic.addEventListener("change", () => {
  fetch(`/api/graphs/${params.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ public: graphPublic.checked }),
  })
    .then(async response => {
      if (response.status === 204) {
        for (const option of additionalGraphPublicOptions) {
          if (graphPublic.checked) {
            option.classList.remove("hidden");
          } else {
            option.classList.add("hidden");
          }
        }
      } else {
        // TODO
      }
    })
    .catch(() => {
      // TODO
    });
});

const graphPublicHideZoomControls = document.getElementById(
  "option-hide-zoom-controls",
) as HTMLInputElement;

const graphPublicHideEditorButton = document.getElementById(
  "option-hide-editor-button",
) as HTMLInputElement;

graphPublicHideZoomControls.addEventListener("change", setGraphPublicUrlHash);
graphPublicHideEditorButton.addEventListener("change", setGraphPublicUrlHash);

function setGraphPublicUrlHash(): void {
  const url = graphPublicUrl.value;
  const urlParts = url.split("#");

  const urlParams = Object.fromEntries(
    urlParts
      .at(-1)!
      .split("&")
      .map(entry => entry.split("=")),
  );

  const newUrlParams: Record<string, unknown> = {
    id: urlParams.id,
  };

  if (graphPublicHideZoomControls.checked) {
    newUrlParams.zoomControls = false;
  }

  if (graphPublicHideEditorButton.checked) {
    newUrlParams.editorButton = false;
  }

  const hash = Object.entries(newUrlParams)
    .map(kvp => kvp.join("="))
    .join("&");

  graphPublicPreview.src = [
    "/viewer.html",
    `?rnd=${(Math.random() + 1).toString(36).substring(7)}`,
    `#${hash}`,
  ].join("");

  graphPublicUrl.value = [
    import.meta.env.VITE_PUBLIC_URL,
    `/viewer.html#${hash}`,
  ].join("");

  graphPublicEmbedUrl.value = [
    "<iframe",
    '  width="100%"',
    '  height="100%"',
    `  src="${graphPublicUrl.value}"`,
    "</iframe>",
  ].join("\n");
}

graphPublicUrlCopy.addEventListener("click", function () {
  navigator.clipboard.writeText(graphPublicUrl.value);
});

graphPublicImageCopy.addEventListener("click", function () {
  navigator.clipboard.writeText(graphPublicImageUrl.value);
});

graphPublicEmbedCopy.addEventListener("click", function () {
  navigator.clipboard.writeText(graphPublicEmbedUrl.value);
});
