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
        const previewImg = graphDiv.querySelector(
          ".preview img",
        ) as HTMLImageElement;

        previewImg.src = previewImg.src.replace("GRAPH_ID", graph.id);

        previewImg.addEventListener("click", function () {
          window.location.href = `/#id=${graph.id}`;
        });

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
            window.location.href = `/graph.html#id=${graph.id}`;
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
