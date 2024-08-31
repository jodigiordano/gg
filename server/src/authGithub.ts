import express from "express";
import jwt from "jsonwebtoken";
import { onAuthenticationSuccessful } from "./authentication.js";

const router = express.Router();

router.get(
  "/authorizationUrl",
  function (req: express.Request, res: express.Response) {
    const originUrl = req.query["origin"] ?? "/";

    const session = jwt.sign({}, process.env["SIGNING_PRIVATE_KEY"]!, {
      expiresIn: 30 * 60, // 30 minutes
    });

    const state = {
      originUrl,
      session,
    };

    const params = new URLSearchParams();

    params.append("response_type", "code");
    params.append("client_id", process.env["OAUTH2_GITHUB_CLIENT_ID"]!);
    params.append("scope", "user:email");

    params.append(
      "redirect_uri",
      `${process.env["PUBLIC_URL"]}/api/sign-in/github/callback`,
    );

    params.append(
      "state",
      Buffer.from(JSON.stringify(state)).toString("base64"),
    );

    const url = [
      "https://github.com/login/oauth/authorize",
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
      client_id: process.env["OAUTH2_GITHUB_CLIENT_ID"]!,
      client_secret: process.env["OAUTH2_GITHUB_CLIENT_SECRET"]!,
      redirect_uri: `${process.env["PUBLIC_URL"]}/api/sign-in/github/callback`,
    });

    try {
      const accessTokenResponse = await fetch(
        "https://github.com/login/oauth/access_token",
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: accessTokenPayload,
        },
      );

      if (!accessTokenResponse.ok) {
        res.redirect("/sign-in.html?state=failure");
        return;
      }

      const accessTokenData = await accessTokenResponse.json();

      const emailsResponse = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${accessTokenData.access_token}`,
        },
      });

      if (!emailsResponse.ok) {
        res.redirect("/sign-in.html?state=failure");
        return;
      }

      const identities = (await emailsResponse.json()) as [
        { email: string; verified: boolean; primary: boolean },
      ];

      const identity = identities.find(
        identity => identity.primary && identity.verified,
      );

      if (!identity) {
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
