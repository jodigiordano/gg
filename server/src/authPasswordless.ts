import express from "express";
import jwt from "jsonwebtoken";
import { HttpError } from "./errors.js";
import { onAuthenticationSuccessful } from "./authentication.js";

const router = express.Router();

router.post(
  "/request",
  async function (req: express.Request, res: express.Response) {
    if (
      !req.body ||
      typeof req.body !== "object" ||
      typeof req.body.email !== "string"
    ) {
      throw new HttpError(400);
    }

    const to = req.body.email;
    const originUrl = req.body.originUrl;

    const token = jwt.sign(
      { email: to, originUrl },
      process.env["SIGNING_PRIVATE_KEY"]!,
      {
        expiresIn: 60 * 60, // 1h
      },
    );

    const mailgunAuth = Buffer.from(
      `api:${process.env["MAILGUN_API_KEY"]}`,
    ).toString("base64");

    const email = new FormData();

    email.append("from", "gg-charts <no-reply@gg-charts.com>");
    email.append("to", to);
    email.append("subject", "Sign-in to gg-charts.com");
    email.append(
      "text",
      [
        [
          "Click here to sign-in:",
          `${process.env["PUBLIC_URL"]}/sign-in.html#passwordless-token=${token}`,
        ].join(" "),
        "",
        "---",
        [
          "You are receiving this email because",
          "you requested a passwordless sign-in link from",
          process.env["PUBLIC_URL"],
          "If you did not requested this link, please ignore this message.",
        ].join(" "),
      ].join("\n"),
    );

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
  },
);

router.get(
  "/verify",
  async function (req: express.Request, res: express.Response) {
    const token = req.query["token"] as string;

    if (!token) {
      res.redirect("/sign-in.html?state=failure");
      return;
    }

    try {
      const payload = jwt.verify(
        token,
        process.env["SIGNING_PRIVATE_KEY"]!,
      ) as unknown as { email: string; originUrl: string | null };

      onAuthenticationSuccessful(res, payload.email, payload.originUrl);
    } catch (error) {
      res.redirect("/sign-in.html?state=failure");
      return;
    }
  },
);

export default router;
