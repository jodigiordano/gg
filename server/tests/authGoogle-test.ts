import request from "supertest";
import sinon from "sinon";
import jwt from "jsonwebtoken";
import server from "../src/server.js";

describe("/api/sign-in/google", function () {
  this.afterEach(function () {
    sinon.restore();
  });

  describe("GET /authorizationUrl", function () {
    it("200", async function () {
      await request(server)
        .get("/api/sign-in/google/authorizationUrl")
        .expect(200);
    });
  });

  describe("GET /callback", function () {
    it("302 - success", async function () {
      const session = jwt.sign({}, process.env["SIGNING_PRIVATE_KEY"]!, {
        expiresIn: 30 * 60, // 30 minutes
      });

      const state = Buffer.from(JSON.stringify({ session })).toString("base64");

      const accessToken = Buffer.from(
        JSON.stringify({ email: "a@b.com", email_verified: true }),
      ).toString("base64");

      sinon
        .stub(global, "fetch")
        .onCall(0)
        .resolves(
          new Response(JSON.stringify({ id_token: `unused.${accessToken}` }), {
            status: 200,
          }),
        )
        .onCall(1) // createStripeResources
        .resolves(new Response(JSON.stringify({ data: [] }), { status: 200 }))
        .onCall(2)
        .resolves(new Response(JSON.stringify({}), { status: 200 }))
        .onCall(3)
        .resolves(new Response(JSON.stringify({ data: [] }), { status: 200 }))
        .onCall(4)
        .resolves(new Response(JSON.stringify({}), { status: 200 }));

      await request(server)
        .get(`/api/sign-in/google/callback?state=${state}`)
        .expect(302)
        .expect("Location", "/editor.html");
    });

    it("302 - provider error", async function () {
      await request(server)
        .get("/api/sign-in/google/callback?error=boom")
        .expect(302)
        .expect("Location", "/sign-in.html?state=failure");
    });

    it("302 - invalid state", async function () {
      await request(server)
        .get("/api/sign-in/google/callback?state=nope")
        .expect(302)
        .expect("Location", "/sign-in.html?state=failure");
    });

    it("302 - access token call failed", async function () {
      const session = jwt.sign({}, process.env["SIGNING_PRIVATE_KEY"]!, {
        expiresIn: 30 * 60, // 30 minutes
      });

      const state = Buffer.from(JSON.stringify({ session })).toString("base64");

      sinon
        .stub(global, "fetch")
        .onCall(0)
        .resolves(
          new Response(JSON.stringify({}), {
            status: 401,
          }),
        )
        .onCall(1)
        .rejects();

      await request(server)
        .get(`/api/sign-in/google/callback?state=${state}`)
        .expect(302)
        .expect("Location", "/sign-in.html?state=failure");

      await request(server)
        .get(`/api/sign-in/google/callback?state=${state}`)
        .expect(302)
        .expect("Location", "/sign-in.html?state=failure");
    });

    it("302 - email not verified", async function () {
      const session = jwt.sign({}, process.env["SIGNING_PRIVATE_KEY"]!, {
        expiresIn: 30 * 60, // 30 minutes
      });

      const state = Buffer.from(JSON.stringify({ session })).toString("base64");

      const accessToken = Buffer.from(
        JSON.stringify({ email: "a@b.com", email_verified: false }),
      ).toString("base64");

      sinon.stub(global, "fetch").resolves(
        new Response(JSON.stringify({ id_token: `unused.${accessToken}` }), {
          status: 200,
        }),
      );

      await request(server)
        .get(`/api/sign-in/google/callback?state=${state}`)
        .expect(302)
        .expect("Location", "/sign-in.html?state=failure");
    });
  });
});
