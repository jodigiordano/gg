import { getUrlParams } from "./persistence.js";

// Load the id from the URL.
const params = getUrlParams();

// Go back to editor.
document
  .getElementById("operation-goto-editor")
  ?.addEventListener("click", function () {
    window.location.href = `/${window.location.hash}`;
  });

// Preview the chart.

const previewImg = document.getElementById("preview") as HTMLImageElement;

//
// Load chart
//

let chart: {
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

fetch(`/api/charts/${params.id}`)
  .then(async response => {
    if (response.ok) {
      // Switch container.
      loadingContainer.classList.add("hidden");
      mainContainer.classList.remove("hidden");

      // Parse the JSON response.
      chart = await response.json();

      // Set the preview.
      previewImg.src = previewImg.src.replace("CHART_ID", chart.id);

      previewImg.addEventListener("click", function () {
        window.location.href = `/${window.location.hash}`;
      });

      // Set the title.
      chartTitle.value = chart.title;

      // Set the public options.
      chartPublic.checked = chart.public;

      for (const option of additionalChartPublicOptions) {
        if (chartPublic.checked) {
          option.classList.remove("hidden");
        } else {
          option.classList.add("hidden");
        }
      }

      chartPublicHideZoomControls.checked = false;
      chartPublicHideEditorButton.checked = false;

      chartPublicPreview.src = `/viewer.html#id=${chart.id}`;

      chartPublicUrl.value = [
        import.meta.env.VITE_PUBLIC_URL,
        `/viewer.html#id=${chart.id}`,
      ].join("");

      chartPublicEmbedUrl.value = [
        "<iframe",
        '  width="100%"',
        '  height="100%"',
        `  src="${chartPublicUrl.value}"`,
        "</iframe>",
      ].join("\n");

      chartPublicImageUrl.value = [
        import.meta.env.VITE_PUBLIC_URL,
        `/api/charts/${chart.id}.png`,
      ].join("");
    } else {
      loadingContainer.innerHTML = "Could not load the chart. Please retry.";
    }
  })
  .catch(() => {
    loadingContainer.innerHTML = "Could not load the chart. Please retry.";
  });

//
// Edit title.
//

const chartTitle = document.getElementById(
  "option-chart-title",
) as HTMLInputElement;

chartTitle.addEventListener("change", () => {
  chart.data.title = chartTitle.value;

  fetch(`/api/charts/${params.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: JSON.stringify(chart.data, null, 2) }),
  }).catch(() => {
    // TODO
  });
});

//
// Edit public
//

const chartPublic = document.getElementById(
  "option-chart-public",
) as HTMLInputElement;

const chartPublicUrl = document.getElementById(
  "public-url",
) as HTMLInputElement;

const chartPublicUrlCopy = document.getElementById(
  "public-url-copy",
) as HTMLButtonElement;

const chartPublicImageUrl = document.getElementById(
  "public-image",
) as HTMLInputElement;

const chartPublicImageCopy = document.getElementById(
  "public-image-copy",
) as HTMLButtonElement;

const chartPublicEmbedUrl = document.getElementById(
  "public-embed",
) as HTMLTextAreaElement;

const chartPublicEmbedCopy = document.getElementById(
  "public-embed-copy",
) as HTMLButtonElement;

const chartPublicPreview = document.getElementById(
  "public-preview",
) as HTMLIFrameElement;

const additionalChartPublicOptions = document.querySelectorAll(
  ".option-chart-public-enabled",
);

chartPublic.addEventListener("change", () => {
  fetch(`/api/charts/${params.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ public: chartPublic.checked }),
  })
    .then(async response => {
      if (response.status === 204) {
        for (const option of additionalChartPublicOptions) {
          if (chartPublic.checked) {
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

const chartPublicHideZoomControls = document.getElementById(
  "option-hide-zoom-controls",
) as HTMLInputElement;

const chartPublicHideEditorButton = document.getElementById(
  "option-hide-editor-button",
) as HTMLInputElement;

chartPublicHideZoomControls.addEventListener("change", setChartPublicUrlHash);
chartPublicHideEditorButton.addEventListener("change", setChartPublicUrlHash);

function setChartPublicUrlHash(): void {
  const url = chartPublicUrl.value;
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

  if (chartPublicHideZoomControls.checked) {
    newUrlParams.zoomControls = false;
  }

  if (chartPublicHideEditorButton.checked) {
    newUrlParams.editorButton = false;
  }

  const hash = Object.entries(newUrlParams)
    .map(kvp => kvp.join("="))
    .join("&");

  chartPublicPreview.src = [
    "/viewer.html",
    `?rnd=${(Math.random() + 1).toString(36).substring(7)}`,
    `#${hash}`,
  ].join("");

  chartPublicUrl.value = [
    import.meta.env.VITE_PUBLIC_URL,
    `/viewer.html#${hash}`,
  ].join("");

  chartPublicEmbedUrl.value = [
    "<iframe",
    '  width="100%"',
    '  height="100%"',
    `  src="${chartPublicUrl.value}"`,
    "</iframe>",
  ].join("\n");
}

chartPublicUrlCopy.addEventListener("click", function () {
  navigator.clipboard.writeText(chartPublicUrl.value);
});

chartPublicImageCopy.addEventListener("click", function () {
  navigator.clipboard.writeText(chartPublicImageUrl.value);
});

chartPublicEmbedCopy.addEventListener("click", function () {
  navigator.clipboard.writeText(chartPublicEmbedUrl.value);
});
