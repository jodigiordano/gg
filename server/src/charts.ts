import express from "express";
import { loadJSON } from "@gg/core";
import {
  authenticateUser,
  isReadOnlyMode,
  setAuthenticationCookie,
} from "./authentication.js";
import {
  createChart,
  deleteChart,
  getChartById,
  getUserCharts,
  getUserChartsCount,
  Chart,
  setChartData,
  setChartPublic,
  User,
} from "./db.js";
import { HttpError } from "./errors.js";
import { isUUID } from "./helpers.js";
import { exportChartToPNG } from "./images.js";

const router = express.Router();

router.get("/", async function (req: express.Request, res: express.Response) {
  const user = await authenticateUser(req);

  setAuthenticationCookie(user.id, res);

  const charts = await getUserCharts(user.id);

  res.status(200).json({
    total: charts.length,
    data: charts,
  });
});

router.post("/", async function (req: express.Request, res: express.Response) {
  const user = await authenticateUser(req);

  setAuthenticationCookie(user.id, res);

  if (isReadOnlyMode(user)) {
    throw new HttpError(402);
  }

  let data: string | undefined = undefined;

  if (
    req.body &&
    typeof req.body === "object" &&
    typeof req.body.data === "string"
  ) {
    let system: ReturnType<typeof loadJSON>;

    try {
      system = loadJSON(req.body.data);
    } catch {
      throw new HttpError(400);
    }

    if (system.errors.length) {
      throw new HttpError(422);
    }

    data = req.body.data;
  }

  const count = await getUserChartsCount(user.id);

  if (count > 100) {
    throw new HttpError(422);
  }

  const chart = await createChart(user.id, data);

  res.status(200).json(chart);
});

router.get(
  "/:id.png",
  async function (req: express.Request, res: express.Response) {
    if (typeof req.params["id"] !== "string" || !isUUID(req.params["id"])) {
      throw new HttpError(400);
    }

    const chart = await getChartById(req.params["id"]);

    if (!chart) {
      throw new HttpError(404);
    }

    const cookie = req
      .header("Cookie")
      ?.split("; ")
      ?.find(c => c.startsWith("auth="))
      ?.replace("auth=", "");

    // Public chart.
    if (chart.public) {
      const filename = await exportChartToPNG(chart, cookie);

      if (!filename) {
        throw new HttpError(503);
      }

      res.setHeader("Content-Type", "image/png");
      res.sendFile(filename);
      return;
    }

    // Private chart.
    const user = await authenticateUser(req);

    setAuthenticationCookie(user.id, res);

    if (chart.userId !== user.id) {
      throw new HttpError(403);
    }

    const filename = await exportChartToPNG(chart, cookie);

    if (!filename) {
      throw new HttpError(503);
    }

    res.setHeader("Content-Type", "image/png");
    res.sendFile(filename);
  },
);

router.get(
  "/:id",
  async function (req: express.Request, res: express.Response) {
    if (typeof req.params["id"] !== "string" || !isUUID(req.params["id"])) {
      throw new HttpError(400);
    }

    const chart = await getChartById(req.params["id"]);

    if (!chart) {
      throw new HttpError(404);
    }

    // Public chart.
    if (chart.public) {
      let user: User | null = null;
      let view: Chart | Record<string, unknown>;

      try {
        user = await authenticateUser(req);

        setAuthenticationCookie(user.id, res);
      } catch {
        /* NOOP */
      }

      if (user && chart.userId === user.id) {
        view = chart;
      } else {
        view = {
          id: chart.id,
          title: chart.title,
          data: chart.data,
        };
      }

      res.status(200).json(view);
      return;
    }

    // Private chart.
    const user = await authenticateUser(req);

    setAuthenticationCookie(user.id, res);

    if (chart.userId !== user.id) {
      throw new HttpError(403);
    }

    res.status(200).json(chart);
  },
);

router.patch(
  "/:id",
  async function (req: express.Request, res: express.Response) {
    const user = await authenticateUser(req);

    setAuthenticationCookie(user.id, res);

    if (isReadOnlyMode(user)) {
      throw new HttpError(402);
    }

    if (typeof req.params["id"] !== "string" || !isUUID(req.params["id"])) {
      throw new HttpError(400);
    }

    if (!req.body || typeof req.body !== "object") {
      throw new HttpError(400);
    }

    if ("data" in req.body && typeof req.body.data !== "string") {
      throw new HttpError(400);
    }

    if ("public" in req.body && typeof req.body.public !== "boolean") {
      throw new HttpError(400);
    }

    if (req.body.data) {
      let system: ReturnType<typeof loadJSON>;

      try {
        system = loadJSON(req.body.data);
      } catch {
        throw new HttpError(400);
      }

      if (system.errors.length) {
        throw new HttpError(422);
      }
    }

    const chart = await getChartById(req.params["id"]);

    if (!chart) {
      throw new HttpError(404);
    }

    if (chart.userId !== user.id) {
      throw new HttpError(403);
    }

    if (req.body.data) {
      await setChartData(chart.id, req.body.data);
    }

    if ("public" in req.body) {
      await setChartPublic(chart.id, req.body.public);
    }

    res.sendStatus(204);
  },
);

router.delete(
  "/:id",
  async function (req: express.Request, res: express.Response) {
    const user = await authenticateUser(req);

    setAuthenticationCookie(user.id, res);

    if (isReadOnlyMode(user)) {
      throw new HttpError(402);
    }

    if (typeof req.params["id"] !== "string" || !isUUID(req.params["id"])) {
      throw new HttpError(400);
    }

    const chart = await getChartById(req.params["id"]);

    if (!chart) {
      throw new HttpError(404);
    }

    if (chart.userId !== user.id) {
      throw new HttpError(403);
    }

    await deleteChart(chart.id);

    res.sendStatus(204);
  },
);

export default router;
