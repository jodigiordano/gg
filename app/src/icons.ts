import awsSpritesheetAtlas from "@gg/icons/dist/aws.json";
import awsSpritesheetUrl from "@gg/icons/dist/aws.png";
import gcpSpritesheetAtlas from "@gg/icons/dist/gcp.json";
import gcpSpritesheetUrl from "@gg/icons/dist/gcp.png";
import azureSpritesheetAtlas from "@gg/icons/dist/azure.json";
import azureSpritesheetUrl from "@gg/icons/dist/azure.png";
import k8sSpritesheetAtlas from "@gg/icons/dist/k8s.json";
import k8sSpritesheetUrl from "@gg/icons/dist/k8s.png";
import devSpritesheetAtlas from "@gg/icons/dist/dev.json";
import devSpritesheetUrl from "@gg/icons/dist/dev.png";
import networkSpritesheetAtlas from "@gg/icons/dist/network.json";
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
    title.innerHTML = "AWS icons pack";

    generatePage(awsSpritesheetAtlas, awsSpritesheetUrl);
  } else if (urlParams.pack === "gcp") {
    title.innerHTML = "GCP icons pack";

    generatePage(gcpSpritesheetAtlas, gcpSpritesheetUrl);
  } else if (urlParams.pack === "azure") {
    title.innerHTML = "Azure icons pack";

    generatePage(azureSpritesheetAtlas, azureSpritesheetUrl);
  } else if (urlParams.pack === "k8s") {
    title.innerHTML = "Kubernetes icons pack";

    generatePage(k8sSpritesheetAtlas, k8sSpritesheetUrl);
  } else if (urlParams.pack === "dev") {
    title.innerHTML = "Dev icons pack";

    generatePage(devSpritesheetAtlas, devSpritesheetUrl);
  } else if (urlParams.pack === "network") {
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
