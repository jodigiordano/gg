import express from "express";
import { loadJSON } from "@gg/core";
import {
  authenticateUser,
  isReadOnlyMode,
  setAuthenticationCookie,
} from "./authentication.js";
import {
  createGraph,
  deleteGraph,
  getGraphById,
  getUserGraphs,
  getUserGraphsCount,
  Graph,
  setGraphData,
  User,
} from "./db.js";
import { HttpError } from "./errors.js";
import { isUUID } from "./helpers.js";

const router = express.Router();

router.get("/", async function (req: express.Request, res: express.Response) {
  const user = await authenticateUser(req);

  setAuthenticationCookie(user.id, res);

  const graphs = await getUserGraphs(user.id);

  res.status(200).json({
    total: graphs.length,
    data: graphs,
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

  const count = await getUserGraphsCount(user.id);

  if (count > 100) {
    throw new HttpError(422);
  }

  const graph = await createGraph(user.id, data);

  res.status(200).json(graph);
});

router.get(
  "/:id",
  async function (req: express.Request, res: express.Response) {
    if (typeof req.params["id"] !== "string" || !isUUID(req.params["id"])) {
      throw new HttpError(400);
    }

    const graph = await getGraphById(req.params["id"]);

    if (!graph) {
      throw new HttpError(404);
    }

    // Public graph.
    if (graph.public) {
      let user: User | null = null;
      let view: Graph | Record<string, unknown>;

      try {
        user = await authenticateUser(req);

        setAuthenticationCookie(user.id, res);
      } catch {
        /* NOOP */
      }

      if (user && graph.userId === user.id) {
        view = graph;
      } else {
        view = {
          id: graph.id,
          title: graph.title,
          data: graph.data,
        };
      }

      res.status(200).json(view);
      return;
    }

    // Private graph.
    const user = await authenticateUser(req);

    setAuthenticationCookie(user.id, res);

    if (graph.userId !== user.id) {
      throw new HttpError(403);
    }

    res.status(200).json(graph);
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

    if (
      !req.body ||
      typeof req.body !== "object" ||
      typeof req.body.data !== "string"
    ) {
      throw new HttpError(400);
    }

    let system: ReturnType<typeof loadJSON>;

    try {
      system = loadJSON(req.body.data);
    } catch {
      throw new HttpError(400);
    }

    if (system.errors.length) {
      throw new HttpError(422);
    }

    const graph = await getGraphById(req.params["id"]);

    if (!graph) {
      throw new HttpError(404);
    }

    if (graph.userId !== user.id) {
      throw new HttpError(403);
    }

    await setGraphData(graph.id, req.body.data);

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

    const graph = await getGraphById(req.params["id"]);

    if (!graph) {
      throw new HttpError(404);
    }

    if (graph.userId !== user.id) {
      throw new HttpError(403);
    }

    await deleteGraph(graph.id);

    res.sendStatus(204);
  },
);

export default router;
