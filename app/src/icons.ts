import awsSpritesheetAtlas from "@gg/icons/dist/aws.json" with { type: "json" };
import awsSpritesheetUrl from "@gg/icons/dist/aws.png";
import gcpSpritesheetAtlas from "@gg/icons/dist/gcp.json" with { type: "json" };
import gcpSpritesheetUrl from "@gg/icons/dist/gcp.png";
import azureSpritesheetAtlas from "@gg/icons/dist/azure.json" with { type: "json" };
import azureSpritesheetUrl from "@gg/icons/dist/azure.png";
import k8sSpritesheetAtlas from "@gg/icons/dist/k8s.json" with { type: "json" };
import k8sSpritesheetUrl from "@gg/icons/dist/k8s.png";
import networkSpritesheetAtlas from "@gg/icons/dist/network.json" with { type: "json" };
import networkSpritesheetUrl from "@gg/icons/dist/network.png";

const mainContainer = document.getElementById(
  "main-container",
) as HTMLDivElement;
const title = document.getElementById("pack-title") as HTMLDivElement;

const iconTemplate = document.getElementById(
  "icon-template",
) as HTMLTemplateElement;

interface Icon {
  x: number;
  y: number;
  width: number;
  height: number;
}

function loadPage(): void {
  mainContainer.innerHTML = "";

  const urlParams = Object.fromEntries(
    window.location.hash
      .substring(1)
      .split("&")
      .map(entry => entry.split("=")),
  );

  if (urlParams.pack === "aws") {
    document.title = "Icons - AWS";
    title.innerHTML = "AWS icons pack";

    generatePage(awsSpritesheetAtlas, awsSpritesheetUrl);
  } else if (urlParams.pack === "gcp") {
    document.title = "Icons - GCP";
    title.innerHTML = "GCP icons pack";

    generatePage(gcpSpritesheetAtlas, gcpSpritesheetUrl);
  } else if (urlParams.pack === "azure") {
    document.title = "Icons - Azure";
    title.innerHTML = "Azure icons pack";

    generatePage(azureSpritesheetAtlas, azureSpritesheetUrl);
  } else if (urlParams.pack === "k8s") {
    document.title = "Icons - Kubernetes";
    title.innerHTML = "Kubernetes icons pack";

    generatePage(k8sSpritesheetAtlas, k8sSpritesheetUrl);
  } else if (urlParams.pack === "network") {
    document.title = "Icons - Network";
    title.innerHTML = "Network icons pack";

    generatePage(networkSpritesheetAtlas, networkSpritesheetUrl);
  }
}

function generatePage(
  icons: Record<string, Icon>,
  spritesheetUrl: string,
): void {
  for (const [key, icon] of Object.entries(icons)) {
    const iconDiv = iconTemplate.content.cloneNode(true) as HTMLDivElement;

    const image = iconDiv.querySelector(".icon-image") as HTMLImageElement;

    image.width = icon.width;
    image.height = icon.height;
    image.style.background = `url(${spritesheetUrl}) -${icon.x}px -${icon.y}px`;
    image.alt = key;

    const tag = iconDiv.querySelector(".icon-tag") as HTMLDivElement;

    tag.innerHTML = key;

    const copy = iconDiv.querySelector(".icon-copy") as HTMLButtonElement;

    copy.addEventListener("click", function () {
      navigator.clipboard.writeText(`<${key}></${key}>`);
    });

    mainContainer.appendChild(iconDiv);
  }
}

// The user modifies the URL manually.
window.addEventListener("hashchange", () => {
  loadPage();
});

loadPage();
