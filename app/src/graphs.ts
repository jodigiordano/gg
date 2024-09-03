import { sanitizeHtml } from "./helpers.js";

//
// Operation failed.
//

const operationFailedDialog = document.getElementById(
  "operation-failed",
) as HTMLDialogElement;

const operationFailedReason = document.getElementById(
  "operation-failed-reason",
) as HTMLParagraphElement;

function showOperationFailed(reason: string): void {
  operationFailedReason.innerHTML = reason;

  operationFailedDialog.inert = true;
  operationFailedDialog.showModal();
  operationFailedDialog.inert = false;
}

//
// List graphs.
//

const graphsIndex = document.getElementById("graphs-index") as HTMLDivElement;

const graphTemplate = document.getElementById(
  "graph-template",
) as HTMLTemplateElement;

const cantLoadGraphsTemplate = document.getElementById(
  "cant-load-graphs-template",
) as HTMLTemplateElement;

const noGraphsTemplate = document.getElementById(
  "no-graphs-template",
) as HTMLTemplateElement;

fetch("/api/graphs")
  .then(async response => {
    if (response.ok) {
      // Clear the current content.
      graphsIndex.innerHTML = "";

      // Parse the JSON response.
      const graphs = await response.json();

      // Case: 0 graphs.
      if (graphs.total === 0) {
        displayNoGraphs();
      }

      // Case: > 0 graphs.
      for (const graph of graphs.data) {
        // Generate a div for the graph.
        const graphDiv = graphTemplate.content.cloneNode(
          true,
        ) as HTMLDivElement;

        // Set the id.
        graphDiv.children[0].id = graph.id;

        // Set the name.
        const nameDiv = graphDiv.querySelector(".name") as HTMLDivElement;

        nameDiv.addEventListener("click", function () {
          window.location.href = `/#id=${graph.id}`;
        });

        nameDiv.innerHTML = sanitizeHtml(graph.title ?? "New graph");

        // Set the preview.
        const previewOverlayDiv = graphDiv.querySelector(
          ".preview-overlay",
        ) as HTMLDivElement;

        previewOverlayDiv.addEventListener("click", function () {
          window.location.href = `/#id=${graph.id}`;
        });

        const previewDiv = graphDiv.querySelector(
          ".preview",
        ) as HTMLIFrameElement;

        previewDiv.src = previewDiv.src.replace("GRAPH_ID", graph.id);

        // Set the "delete" operation.
        graphDiv
          .querySelector(".operation-delete")
          ?.addEventListener("click", function () {
            deleteGraphName.innerHTML = sanitizeHtml(graph.title);
            deleteGraphConfirmButton.setAttribute("graph-id", graph.id);

            deleteGraphDialog.inert = true;
            deleteGraphDialog.showModal();
            deleteGraphDialog.inert = false;
          });

        // Set the "properties" operation.
        graphDiv
          .querySelector(".operation-file-properties-open")
          ?.addEventListener("click", function () {
            fetch(`/api/graphs/${graph.id}`)
              .then(async response => {
                if (response.ok) {
                  const graph = await response.json();

                  graphTitle.value = graph.title;

                  graphPublic.checked = graph.public;

                  for (const option of additionalGraphPublicOptions) {
                    if (graphPublic.checked) {
                      option.classList.remove("hidden");
                    } else {
                      option.classList.add("hidden");
                    }
                  }

                  graphPublicHideFlowControls.checked = false;
                  graphPublicHideZoomControls.checked = false;
                  graphPublicHideEditorButton.checked = false;
                  graphPublicAutoplay.checked = false;

                  graphPublicPreview.src = `/viewer.html#id=${graph.id}`;

                  graphPublicUrl.value = [
                    import.meta.env.VITE_PUBLIC_URL,
                    `/viewer.html#id=${graph.id}`,
                  ].join("");

                  fileProperties.setAttribute("graph-id", graph.id);

                  fileProperties.inert = true;
                  fileProperties.showModal();
                  fileProperties.inert = false;
                } else {
                  // TODO.
                }
              })
              .catch(() => {
                // TODO.
              });
          });

        // Append to the dom.
        graphsIndex.appendChild(graphDiv);
      }
    } else {
      graphsIndex.replaceChildren(
        cantLoadGraphsTemplate.content.cloneNode(true),
      );
      graphsIndex.style.display = "block";
    }
  })
  .catch(() => {
    graphsIndex.replaceChildren(cantLoadGraphsTemplate.content.cloneNode(true));
    graphsIndex.style.display = "block";
  });

function displayNoGraphs(): void {
  const noGraphs = noGraphsTemplate.content.cloneNode(true);

  graphsIndex.style.display = "block";

  graphsIndex.replaceChildren(noGraphs);

  graphsIndex
    .querySelector("#create-first-graph")
    ?.addEventListener("click", createGraph);
}

//
// Create a graph
//

function createGraph(): void {
  fetch("/api/graphs", { method: "POST" })
    .then(async response => {
      if (response.ok) {
        const graph = await response.json();

        window.location.href = `/#id=${graph.id}`;
      } else {
        showOperationFailed("Could not create a graph.");
      }
    })
    .catch(() => {
      showOperationFailed("Could not create a graph.");
    });
}

document.getElementById("create-graph")?.addEventListener("click", createGraph);

//
// Delete a graph.
//

const deleteGraphDialog = document.getElementById(
  "delete-graph",
) as HTMLDialogElement;

const deleteGraphConfirmButton = document.getElementById(
  "operation-delete-graph-apply",
) as HTMLButtonElement;

const deleteGraphName = document.getElementById(
  "delete-graph-name",
) as HTMLParagraphElement;

deleteGraphConfirmButton.addEventListener("click", function () {
  const id = deleteGraphConfirmButton.getAttribute("graph-id")!;

  fetch(`/api/graphs/${id}`, { method: "DELETE" })
    .then(async response => {
      if (response.ok) {
        document.getElementById(id)?.remove();

        if (!graphsIndex.querySelector(".graph")) {
          displayNoGraphs();
        }
      } else {
        showOperationFailed("Could not delete the graph.");
      }
    })
    .catch(() => {
      showOperationFailed("Could not delete the graph.");
    });
});

//
// Graph properties
//

const fileProperties = document.getElementById(
  "file-properties",
) as HTMLDialogElement;

const graphTitle = document.getElementById(
  "option-graph-title",
) as HTMLInputElement;

const graphPublic = document.getElementById(
  "option-graph-public",
) as HTMLInputElement;

const graphPublicUrl = document.getElementById(
  "public-url",
) as HTMLInputElement;

const graphPublicUrlCopy = document.getElementById(
  "public-url-copy",
) as HTMLButtonElement;

const graphPublicPreview = document.getElementById(
  "public-preview",
) as HTMLIFrameElement;

const additionalGraphPublicOptions = fileProperties.querySelectorAll(
  ".option-graph-public-enabled",
);

graphTitle.addEventListener("change", () => {
  const id = fileProperties.getAttribute("graph-id")!;

  fetch(`/api/graphs/${id}`)
    .then(async response => {
      if (response.ok) {
        const graph = await response.json();

        const { data } = graph;

        data.title = graphTitle.value;

        fetch(`/api/graphs/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: JSON.stringify(data, null, 2) }),
        })
          .then(async response => {
            if (response.status === 204) {
              document.getElementById(id)!.querySelector(".name")!.innerHTML =
                sanitizeHtml(graphTitle.value);
            } else {
              // TODO
            }
          })
          .catch(() => {
            // TODO
          });
      } else {
        // TODO
      }
    })
    .catch(() => {
      // TODO
    });
});

graphPublic.addEventListener("change", () => {
  const id = fileProperties.getAttribute("graph-id")!;

  fetch(`/api/graphs/${id}`, {
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

const graphPublicHideFlowControls = document.getElementById(
  "option-hide-flow-controls",
) as HTMLInputElement;

const graphPublicHideZoomControls = document.getElementById(
  "option-hide-zoom-controls",
) as HTMLInputElement;

const graphPublicHideEditorButton = document.getElementById(
  "option-hide-editor-button",
) as HTMLInputElement;

const graphPublicAutoplay = document.getElementById(
  "option-autoplay",
) as HTMLInputElement;

graphPublicHideFlowControls.addEventListener("change", setGraphPublicUrlHash);
graphPublicHideZoomControls.addEventListener("change", setGraphPublicUrlHash);
graphPublicHideEditorButton.addEventListener("change", setGraphPublicUrlHash);
graphPublicAutoplay.addEventListener("change", setGraphPublicUrlHash);

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

  if (graphPublicHideFlowControls.checked) {
    newUrlParams.flowControls = false;
  }

  if (graphPublicHideZoomControls.checked) {
    newUrlParams.zoomControls = false;
  }

  if (graphPublicHideEditorButton.checked) {
    newUrlParams.editorButton = false;
  }

  if (graphPublicAutoplay.checked) {
    newUrlParams.autoplay = true;
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
}

graphPublicUrlCopy.addEventListener("click", function () {
  navigator.clipboard.writeText(graphPublicUrl.value);
});
