import request from "supertest";
import sinon from "sinon";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import server from "../src/server.js";

describe("/api/sign-in/passwordless", function () {
  this.afterEach(function () {
    sinon.restore();
  });

  describe("GET /request", function () {
    it("204", async function () {
      sinon
        .stub(global, "fetch")
        .resolves(new Response(JSON.stringify({}), { status: 200 }));

      await request(server)
        .post("/api/sign-in/passwordless/request")
        .set("Content-Type", "application/json")
        .send({
          email: "a@b.com",
        })
        .expect(204);
    });

    it("400", async function () {
      await request(server)
        .post("/api/sign-in/passwordless/request")
        .set("Content-Type", "application/json")
        .send({})
        .expect(400);
    });

    it("422", async function () {
      sinon
        .stub(global, "fetch")
        .resolves(new Response(JSON.stringify({}), { status: 401 }));

      await request(server)
        .post("/api/sign-in/passwordless/request")
        .set("Content-Type", "application/json")
        .send({
          email: "a@b.com",
        })
        .expect(422);
    });
  });

  describe("GET /verify", function () {
    it("302 - no token", async function () {
      await request(server)
        .get("/api/sign-in/passwordless/verify")
        .expect(302)
        .expect("Location", "/sign-in.html?state=failure");
    });

    it("302 - invalid token", async function () {
      await request(server)
        .get("/api/sign-in/passwordless/verify?token=nope")
        .expect(302)
        .expect("Location", "/sign-in.html?state=failure");
    });

    it("302 - valid", async function () {
      const email = `${randomUUID()}@example.com`;

      const token = jwt.sign({ email }, process.env["SIGNING_PRIVATE_KEY"]!, {
        expiresIn: 60 * 60, // 1h
      });

      // createStripeResources
      sinon
        .stub(global, "fetch")
        .onCall(0)
        .resolves(new Response(JSON.stringify({ data: [] }), { status: 200 }))
        .onCall(1)
        .resolves(new Response(JSON.stringify({}), { status: 200 }))
        .onCall(2)
        .resolves(new Response(JSON.stringify({ data: [] }), { status: 200 }))
        .onCall(3)
        .resolves(new Response(JSON.stringify({}), { status: 200 }));

      await request(server)
        .get(`/api/sign-in/passwordless/verify?token=${token}`)
        .expect(302)
        .expect("Location", "/editor.html");
    });
  });
});
