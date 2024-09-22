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
// List charts.
//

const chartsIndex = document.getElementById("charts-index") as HTMLDivElement;

const chartTemplate = document.getElementById(
  "chart-template",
) as HTMLTemplateElement;

const cantLoadChartsTemplate = document.getElementById(
  "cant-load-charts-template",
) as HTMLTemplateElement;

const noChartsTemplate = document.getElementById(
  "no-charts-template",
) as HTMLTemplateElement;

fetch("/api/charts")
  .then(async response => {
    if (response.ok) {
      // Clear the current content.
      chartsIndex.innerHTML = "";

      // Parse the JSON response.
      const charts = await response.json();

      // Case: 0 charts.
      if (charts.total === 0) {
        displayNoCharts();
      }

      // Case: > 0 charts.
      for (const chart of charts.data) {
        // Generate a div for the chart.
        const chartDiv = chartTemplate.content.cloneNode(
          true,
        ) as HTMLDivElement;

        // Set the id.
        chartDiv.children[0].id = chart.id;

        // Set the name.
        const nameDiv = chartDiv.querySelector(".name") as HTMLDivElement;

        nameDiv.addEventListener("click", function () {
          window.location.href = `/#id=${chart.id}`;
        });

        nameDiv.innerHTML = sanitizeHtml(chart.title ?? "New chart");

        // Set the preview.
        const previewImg = chartDiv.querySelector(
          ".preview img",
        ) as HTMLImageElement;

        previewImg.src = `/api/charts/${chart.id}.png`;

        previewImg.addEventListener("click", function () {
          window.location.href = `/#id=${chart.id}`;
        });

        // Set the "delete" operation.
        chartDiv
          .querySelector(".operation-delete")
          ?.addEventListener("click", function () {
            deleteChartName.innerHTML = sanitizeHtml(chart.title);
            deleteChartConfirmButton.setAttribute("chart-id", chart.id);

            deleteChartDialog.inert = true;
            deleteChartDialog.showModal();
            deleteChartDialog.inert = false;
          });

        // Set the "properties" operation.
        chartDiv
          .querySelector(".operation-file-properties-open")
          ?.addEventListener("click", function () {
            window.location.href = `/chart.html#id=${chart.id}`;
          });

        // Append to the dom.
        chartsIndex.appendChild(chartDiv);
      }
    } else {
      chartsIndex.replaceChildren(
        cantLoadChartsTemplate.content.cloneNode(true),
      );
      chartsIndex.style.display = "block";
    }
  })
  .catch(() => {
    chartsIndex.replaceChildren(cantLoadChartsTemplate.content.cloneNode(true));
    chartsIndex.style.display = "block";
  });

function displayNoCharts(): void {
  const noCharts = noChartsTemplate.content.cloneNode(true);

  chartsIndex.style.display = "block";

  chartsIndex.replaceChildren(noCharts);

  chartsIndex
    .querySelector("#create-first-chart")
    ?.addEventListener("click", createChart);
}

//
// Create a chart
//

function createChart(): void {
  fetch("/api/charts", { method: "POST" })
    .then(async response => {
      if (response.ok) {
        const chart = await response.json();

        window.location.href = `/#id=${chart.id}`;
      } else {
        showOperationFailed("Could not create a chart.");
      }
    })
    .catch(() => {
      showOperationFailed("Could not create a chart.");
    });
}

document.getElementById("create-chart")?.addEventListener("click", createChart);

//
// Delete a chart.
//

const deleteChartDialog = document.getElementById(
  "delete-chart",
) as HTMLDialogElement;

const deleteChartConfirmButton = document.getElementById(
  "operation-delete-chart-apply",
) as HTMLButtonElement;

const deleteChartName = document.getElementById(
  "delete-chart-name",
) as HTMLParagraphElement;

deleteChartConfirmButton.addEventListener("click", function () {
  const id = deleteChartConfirmButton.getAttribute("chart-id")!;

  fetch(`/api/charts/${id}`, { method: "DELETE" })
    .then(async response => {
      if (response.ok) {
        document.getElementById(id)?.remove();

        if (!chartsIndex.querySelector(".chart")) {
          displayNoCharts();
        }
      } else {
        showOperationFailed("Could not delete the chart.");
      }
    })
    .catch(() => {
      showOperationFailed("Could not delete the chart.");
    });
});
