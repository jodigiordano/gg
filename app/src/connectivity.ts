import { getJsonEditorValue } from "./jsonEditor.js";
import { save } from "./persistence.js";

export const connectivityStatus = document.getElementById(
  "connectivity-status-dialog",
) as HTMLDialogElement;

const connectivityStatusDetails = document.getElementById(
  "connectivity-status-details",
) as HTMLDivElement;

const connectivityStatusOk = document.getElementById(
  "connectivity-status-ok",
) as HTMLTemplateElement;

const connectivityStatusReadOnly = document.getElementById(
  "connectivity-status-read-only",
) as HTMLTemplateElement;

const connectivityStatusLocalFile = document.getElementById(
  "connectivity-status-local-file",
) as HTMLTemplateElement;

const connectivityStatusSaveFailed = document.getElementById(
  "connectivity-status-save-failed",
) as HTMLTemplateElement;

const connectivityStatusButton = document.getElementById(
  "operation-connectivity-status-open",
) as HTMLButtonElement;

connectivityStatusButton?.addEventListener("click", function () {
  connectivityStatus.inert = true;
  connectivityStatus.showModal();
  connectivityStatus.inert = false;
});

export function setConnectivity(
  state: "read-only" | "save-failed" | "local-file" | "ok",
): void {
  let details: HTMLElement;

  connectivityStatusButton.classList.remove("warning");
  connectivityStatusButton.classList.remove("alert");

  if (state === "read-only") {
    details = connectivityStatusReadOnly.content.cloneNode(true) as HTMLElement;
    connectivityStatusButton.classList.add("alert");
  } else if (state === "save-failed") {
    details = connectivityStatusSaveFailed.content.cloneNode(
      true,
    ) as HTMLElement;

    connectivityStatusButton.classList.add("alert");

    details
      .querySelector(".save-to-disk")!
      .addEventListener("click", function () {
        const json = getJsonEditorValue();

        // Create a download link.
        const link = document.createElement("a");

        link.setAttribute("href", `data:application/json;base64,${btoa(json)}`);

        link.setAttribute(
          "download",
          `gg.${new Date().toJSON().replaceAll(":", ".")}.json`,
        );

        // Click on the download link.
        link.click();
      });

    details
      .querySelector(".save-to-cloud")!
      .addEventListener("click", function () {
        save(getJsonEditorValue())
          .then(() => setConnectivity("ok"))
          .catch(() => setConnectivity("save-failed"));
      });
  } else if (state === "local-file") {
    details = connectivityStatusLocalFile.content.cloneNode(
      true,
    ) as HTMLElement;

    details
      .querySelector(".convert-to-cloud")!
      .addEventListener("click", function () {
        fetch("/api/charts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: getJsonEditorValue(),
          }),
        })
          .then(async response => {
            if (response.ok) {
              const chart = await response.json();

              window.location.href = `/#id=${chart.id}`;

              connectivityStatus.close();
            } else {
              // TODO.
            }
          })
          .catch(() => {
            // TODO.
          });
      });

    connectivityStatusButton.classList.add("warning");
  } /* ok */ else {
    details = connectivityStatusOk.content.cloneNode(true) as HTMLElement;
  }

  connectivityStatusDetails.replaceChildren(details);
}
