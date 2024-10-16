import assert from "node:assert";
import request from "supertest";
import sinon from "sinon";
import server from "../src/server.js";
import { createUser, generateAuthenticationCookie } from "./helpers.js";
import {
  createChart,
  getChartById,
  getUserById,
  setUserStripeSubscription,
} from "../src/db.js";

describe("/api/profile", function () {
  this.afterEach(function () {
    sinon.restore();
  });

  describe("GET /", function () {
    it("200 - authenticated", async function () {
      const user = await createUser();

      await setUserStripeSubscription(user.id, "foo", "active");

      const response = await request(server)
        .get("/api/profile")
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .expect(200);

      assert.deepEqual(response.body, {
        id: user.id,
        email: user.email,
        readOnly: false,
      });
    });

    it("200 - anonymous", async function () {
      const response = await request(server).get("/api/profile").expect(200);

      assert.deepEqual(response.body, {
        id: null,
        email: null,
        readOnly: false,
      });
    });
  });

  describe("POST /close", function () {
    it("302", async function () {
      const user = await createUser();
      const chart = await createChart(user.id);

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
      assert.equal(await getChartById(chart.id), null);
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
      await request(server).post("/api/profile/close").expect(401);
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
