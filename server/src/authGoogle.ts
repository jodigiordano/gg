import { randomUUID } from "node:crypto";
import express from "express";
import jwt from "jsonwebtoken";
import { onAuthenticationSuccessful } from "./authentication.js";

const router = express.Router();

router.get(
  "/authorizationUrl",
  function (req: express.Request, res: express.Response) {
    const originUrl = req.query["origin"] ?? "/editor.html";

    const session = jwt.sign({}, process.env["SIGNING_PRIVATE_KEY"]!, {
      expiresIn: 30 * 60, // 30 minutes
    });

    const state = {
      originUrl,
      session,
    };

    const params = new URLSearchParams();

    params.append("response_type", "code");
    params.append("client_id", process.env["OAUTH2_GOOGLE_CLIENT_ID"]!);
    params.append("scope", "openid email");
    params.append("nonce", randomUUID());

    params.append(
      "redirect_uri",
      `${process.env["PUBLIC_URL"]}/api/sign-in/google/callback`,
    );

    params.append(
      "state",
      Buffer.from(JSON.stringify(state)).toString("base64"),
    );

    const url = [
      "https://accounts.google.com/o/oauth2/v2/auth",
      params.toString(),
    ].join("?");

    res.status(200).json({ url });
  },
);

router.get(
  "/callback",
  async function (req: express.Request, res: express.Response) {
    const state = req.query["state"] as string;
    const code = req.query["code"] as string;
    const error = req.query["error"] as string;

    if (error) {
      res.redirect("/sign-in.html?state=failure");
      return;
    }

    let originUrl: string | null = null;

    try {
      const stateObject = JSON.parse(
        Buffer.from(state, "base64").toString("utf-8"),
      );

      jwt.verify(stateObject.session, process.env["SIGNING_PRIVATE_KEY"]!);

      originUrl = stateObject.originUrl;
    } catch (error) {
      res.redirect("/sign-in.html?state=failure");
      return;
    }

    const accessTokenPayload = new URLSearchParams({
      code,
      grant_type: "authorization_code",
      client_id: process.env["OAUTH2_GOOGLE_CLIENT_ID"]!,
      client_secret: process.env["OAUTH2_GOOGLE_CLIENT_SECRET"]!,
      redirect_uri: `${process.env["PUBLIC_URL"]}/api/sign-in/google/callback`,
    });

    try {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: accessTokenPayload,
      });

      if (!response.ok) {
        res.redirect("/sign-in.html?state=failure");
        return;
      }

      const data = await response.json();

      const identity = JSON.parse(
        Buffer.from(data.id_token.split(".").at(1), "base64").toString("utf-8"),
      );

      if (!identity.email_verified) {
        res.redirect("/sign-in.html?state=failure");
        return;
      }

      onAuthenticationSuccessful(res, identity.email, originUrl);
    } catch (error) {
      res.redirect("/sign-in.html?state=failure");
      return;
    }
  },
);

export default router;
