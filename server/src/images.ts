import puppeteer, { CDPSession, Browser, Page } from "puppeteer";
import { hash } from "node:crypto";
import fs from "node:fs";
import { Chart } from "./db";

export async function exportChartToPNG(
  chart: Chart,
  cookie: any | null | undefined,
): Promise<string | null> {
  // Serve the image from the cache.
  const fingerprint = hash("md5", JSON.stringify(chart.data ?? ""), "hex");
  const filename = ["gg", chart.id, fingerprint, "png"].join(".");

  const cachePath = [process.env["CACHE_PATH"], filename].join("/");

  if (fs.existsSync(cachePath)) {
    return cachePath;
  }

  // In tests, we skip using puppeteer.
  if (
    process.env["NODE_ENV"] === "test" &&
    process.env["EXPORT_CHART_TO_PNG"]
  ) {
    return process.env["EXPORT_CHART_TO_PNG"];
  }

  let browser: Browser | null = null;

  try {
    // Launch the browser.
    browser = await puppeteer.launch();

    // Open a new tab.
    const page = await browser.newPage();

    // Open a CDP session.
    const session = await page.createCDPSession();

    await session.send("Browser.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: process.env["DOWNLOADS_PATH"]!,
      eventsEnabled: true,
    });

    // Set cookies.
    if (cookie) {
      await page.setCookie({
        name: "auth",
        value: cookie,
        domain: new URL(process.env["PUBLIC_URL"]!).hostname,
        path: "/",
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
      });
    }

    // Navigate to the page.
    await page.goto(`${process.env["PUBLIC_URL"]}/export.html#id=${chart.id}`);

    // Download the image.
    await waitUntilDownload(page, session);

    // Validate the presence of the file on disk.
    const downloadPath = [
      process.env["DOWNLOADS_PATH"],
      `gg.${chart.id}.png`,
    ].join("/");

    // Return the path to the file on disk.
    if (fs.existsSync(downloadPath)) {
      fs.copyFileSync(downloadPath, cachePath);

      return cachePath;
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

async function waitUntilDownload(
  page: Page,
  session: CDPSession,
): Promise<void> {
  return new Promise((resolve, reject) => {
    page.on("pageerror", function (error) {
      reject(error);
    });

    session.on("Browser.downloadProgress", function (event) {
      if (event.state === "completed") {
        resolve();
      } else if (event.state === "canceled") {
        reject();
      }
    });
  });
}
