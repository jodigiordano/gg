import express from "express";
import { HttpError } from "./errors.js";

const router = express.Router();

router.post("/", async function (req: express.Request, res: express.Response) {
  if (
    !req.body ||
    typeof req.body !== "object" ||
    typeof req.body.message !== "string"
  ) {
    throw new HttpError(400);
  }

  const from = req.body.email;
  const message = req.body.message;
  const graph = req.body.graph;

  const mailgunAuth = Buffer.from(
    `api:${process.env["MAILGUN_API_KEY"]}`,
  ).toString("base64");

  const email = new FormData();

  email.append("from", "gg-charts <no-reply@gg-charts.com>");
  email.append("to", "feedback@gg-charts.com");
  email.append("subject", `Feedback from ${from}`);
  email.append("text", [message, "---", graph].join("\n"));

  const response = await fetch(
    [process.env["MAILGUN_API_ENDPOINT"], "messages"].join("/"),
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${mailgunAuth}`,
      },
      body: email,
    },
  );

  if (!response.ok) {
    throw new HttpError(422);
  }

  res.sendStatus(204);
});

export default router;
