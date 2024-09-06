import puppeteer, { CDPSession, Browser } from "puppeteer";
import fs from "node:fs";

export async function exportGraphToPNG(
  graphId: string,
  cookie: any | null | undefined,
): Promise<string | null> {
  if (
    process.env["NODE_ENV"] === "test" &&
    process.env["EXPORT_GRAPH_TO_PNG"]
  ) {
    return process.env["EXPORT_GRAPH_TO_PNG"];
  }

  let browser: Browser | null = null;

  try {
    // Launch the browser.
    browser = await puppeteer.launch();

    // Open a new tab.
    const page = await browser.newPage();

    if (cookie) {
      await page.setCookie({
        name: "auth",
        value: cookie,
        domain: new URL(process.env["PUBLIC_URL"]!).hostname,
        path: "/",
        httpOnly: true,
        secure: true,
      });
    }

    // Open a CDP session.
    const session = await page.createCDPSession();

    await session.send("Browser.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: process.env["DOWNLOADS_PATH"]!,
      eventsEnabled: true,
    });

    // Navigate to the page.
    await page.goto(`${process.env["PUBLIC_URL"]}/export.html#id=${graphId}`);

    // Download the image.
    await waitUntilDownload(session);

    // Validate the presence of the file on disk.
    const localImagePath = [
      process.env["DOWNLOADS_PATH"],
      `gg.${graphId}.png`,
    ].join("/");

    // Return the path to the file on disk.
    if (fs.existsSync(localImagePath)) {
      return localImagePath;
    }

    // Fallback: no image produced.
    return null;
  } catch (error) {
    console.error(error);
    return null;
  } finally {
    // Close the browser.
    await browser?.close();
  }
}

async function waitUntilDownload(session: CDPSession): Promise<void> {
  return new Promise((resolve, reject) => {
    session.on("Browser.downloadProgress", function (event) {
      if (event.state === "completed") {
        resolve();
      } else if (event.state === "canceled") {
        reject();
      }
    });
  });
}
