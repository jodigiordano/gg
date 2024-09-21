import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import googleAuthentication from "./authGoogle.js";
import githubAuthentication from "./authGithub.js";
import passwordlessAuthentication from "./authPasswordless.js";
import profile from "./profile.js";
import feedback from "./feedback.js";
import subscription from "./subscription.js";
import charts from "./charts.js";
import { unsetAuthenticationCookie } from "./authentication.js";
import { HttpError } from "./errors.js";

// Create the ExpressJS server.
const server = express();

server.disable("x-powered-by");
server.use(bodyParser.json({ limit: "1mb" }));
server.use(bodyParser.urlencoded({ limit: "1mb", extended: true }));
server.use(cors());
server.use(cookieParser(process.env["SIGNING_PRIVATE_KEY"]!));

// Log queries / responses.
if (process.env["NODE_ENV"] !== "test") {
  server.use(
    (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      const start = Date.now();

      res.on("finish", function () {
        const duration = Date.now() - start;

        console.log(
          `${req.method} ${req.originalUrl} ${res.statusCode} ${duration.toFixed(0)}ms`,
        );
      });

      next();
    },
  );
}

server.use("/api/sign-in/google", googleAuthentication);
server.use("/api/sign-in/github", githubAuthentication);
server.use("/api/sign-in/passwordless", passwordlessAuthentication);
server.use("/api/profile", profile);
server.use("/api/subscription", subscription);
server.use("/api/feedback", feedback);
server.use("/api/charts", charts);

//
// Sign out
//

server.post(
  "/api/sign-out",
  async function (_req: express.Request, res: express.Response) {
    unsetAuthenticationCookie(res);

    res.redirect("/");
  },
);

// Error handler.
server.use(
  (
    error: HttpError | Error,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    // Status.
    let status = 500;

    // Ex: body-parser tries to parse a non-JSON payload.
    if (error instanceof SyntaxError) {
      status = 400;
    } else if (error instanceof HttpError) {
      status = error.code;
    }

    // Stack.
    const stack = (error.stack ?? "").split("\n").at(1);

    if (process.env["NODE_ENV"] !== "test" || status >= 500) {
      console.log(error.stack);
      console.log(
        `${req.method} ${req.url} ${status} ${error.message} ${stack}`,
      );
    }

    // TODO: no message in production.
    res.status(status).json({
      message: error.message,
    });
  },
);

export default server;
