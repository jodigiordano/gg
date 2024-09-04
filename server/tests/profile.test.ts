import assert from "node:assert";
import request from "supertest";
import sinon from "sinon";
import server from "../src/server.js";
import { createUser, generateAuthenticationCookie } from "./helpers.js";
import {
  createGraph,
  getGraphById,
  getUserById,
  setUserStripeSubscription,
} from "../src/db.js";

describe("/api/profile", function () {
  this.afterEach(function () {
    sinon.restore();
  });

  describe("GET /", function () {
    it("200", async function () {
      const user = await createUser();

      await request(server)
        .get("/api/profile")
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .expect(200);
    });

    it("401", async function () {
      request(server).get("/api/profile").expect(401);
    });
  });

  describe("POST /close", function () {
    it("302", async function () {
      const user = await createUser();
      const graph = await createGraph(user.id);

      await setUserStripeSubscription(user.id, "a", "b");

      sinon.stub(global, "fetch");

      assert.notEqual(await getUserById(user.id), null);

      await request(server)
        .post("/api/profile/close")
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .set("Content-Type", "application/json")
        .send({
          confirm: user.email,
        })
        .expect(302)
        .expect("Location", "/");

      assert.equal(await getUserById(user.id), null);
      assert.equal(await getGraphById(graph.id), null);
    });

    it("400", async function () {
      const user = await createUser();

      await request(server)
        .post("/api/profile/close")
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .set("Content-Type", "application/json")
        .send({})
        .expect(400);
    });

    it("401", async function () {
      request(server).post("/api/profile").expect(401);
    });

    it("422", async function () {
      const user = await createUser();

      await request(server)
        .post("/api/profile/close")
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .set("Content-Type", "application/json")
        .send({
          confirm: "nope",
        })
        .expect(422);
    });
  });
});
