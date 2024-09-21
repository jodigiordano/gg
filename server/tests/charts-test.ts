import assert from "node:assert";
import sinon from "sinon";
import request from "supertest";
import puppeteer from "puppeteer";
import { randomUUID } from "node:crypto";
import server from "../src/server.js";
import { createUser, generateAuthenticationCookie } from "./helpers.js";
import {
  createChart,
  getChartById,
  Chart,
  setChartPublic,
  setUserStripeSubscription,
  User,
} from "../src/db.js";

describe("/api/charts", function () {
  let user: User;
  let chart: Chart;

  this.beforeEach(async function () {
    user = await createUser();
    chart = await createChart(user.id);

    await setUserStripeSubscription(user.id, "notused", "active");
  });

  this.afterEach(function () {
    sinon.restore();

    delete process.env["EXPORT_CHART_TO_PNG"];
  });

  describe("GET /", function () {
    it("200", async function () {
      const response = await request(server)
        .get("/api/charts")
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .expect(200);

      assert.deepEqual(response.body, {
        total: 1,
        data: [
          {
            id: chart.id,
            title: chart.title,
            public: false,
          },
        ],
      });
    });

    it("401", async function () {
      request(server).get("/api/charts").expect(401);
    });
  });

  describe("POST /", function () {
    it("200", async function () {
      await request(server)
        .post("/api/charts")
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .expect(200);
    });

    it("200 - data", async function () {
      const data = {
        specificationVersion: "1.0.0",
        title: "My chart",
      };

      await request(server)
        .post("/api/charts")
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .set("Content-Type", "application/json")
        .send({ data: JSON.stringify(data) })
        .expect(200);
    });

    it("400", async function () {
      await request(server)
        .post("/api/charts")
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .set("Content-Type", "application/json")
        .send({ data: "nope" })
        .expect(400);
    });

    it("402", async function () {
      await setUserStripeSubscription(user.id, "notused", "paused");

      await request(server)
        .post("/api/charts")
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .expect(402);
    });

    it("401", async function () {
      request(server).post("/api/charts").expect(401);
    });

    it("422", async function () {
      const data = {
        specificationVersion: "1.0.0",
        title: "My chart",
        extraProperty: "oops",
      };

      await request(server)
        .post("/api/charts")
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .set("Content-Type", "application/json")
        .send({ data: JSON.stringify(data) })
        .expect(422);
    });

    it("422 - max", async function () {
      for (let i = 0; i < 100; i++) {
        createChart(user.id);
      }

      await request(server)
        .post("/api/charts")
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .expect(422);
    });
  });

  describe("GET /:id", function () {
    it("200", async function () {
      const response = await request(server)
        .get(`/api/charts/${chart.id}`)
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .expect(200);

      delete response.body.createdAt;
      delete response.body.updatedAt;

      assert.deepEqual(response.body, {
        id: chart.id,
        title: chart.title,
        data: chart.data,
        userId: user.id,
        public: false,
      });
    });

    it("200 - public - anonymous", async function () {
      await setChartPublic(chart.id, true);

      const response = await request(server)
        .get(`/api/charts/${chart.id}`)
        .expect(200);

      assert.deepEqual(response.body, {
        id: chart.id,
        title: chart.title,
        data: chart.data,
      });
    });

    it("200 - public - authenticated owner", async function () {
      await setChartPublic(chart.id, true);

      const response = await request(server)
        .get(`/api/charts/${chart.id}`)
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .expect(200);

      delete response.body.createdAt;
      delete response.body.updatedAt;

      assert.deepEqual(response.body, {
        id: chart.id,
        title: chart.title,
        data: chart.data,
        userId: user.id,
        public: true,
      });
    });

    it("200 - public - authenticated other", async function () {
      const user2 = await createUser();

      await setChartPublic(chart.id, true);

      const response = await request(server)
        .get(`/api/charts/${chart.id}`)
        .set("Cookie", [generateAuthenticationCookie(user2.id)])
        .expect(200);

      assert.deepEqual(response.body, {
        id: chart.id,
        title: chart.title,
        data: chart.data,
      });
    });

    it("400", async function () {
      await request(server)
        .get("/api/charts/nope")
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .expect(400);
    });

    it("401", async function () {
      request(server).get(`/api/charts/${chart}`).expect(401);
    });

    it("403", async function () {
      const user2 = await createUser();
      const chart = await createChart(user.id);

      await setUserStripeSubscription(user2.id, "notused", "active");

      await request(server)
        .get(`/api/charts/${chart.id}`)
        .set("Cookie", [generateAuthenticationCookie(user2.id)])
        .expect(403);
    });

    it("404", async function () {
      await request(server)
        .get(`/api/charts/${randomUUID()}`)
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .expect(404);
    });
  });

  describe("GET /:id.png", function () {
    it("200", async function () {
      process.env["EXPORT_CHART_TO_PNG"] = [
        import.meta.dirname,
        "logo.png",
      ].join("/");

      const response = await request(server)
        .get(`/api/charts/${chart.id}.png`)
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .expect(200)
        .expect("Content-Type", "image/png")
        .expect("Cache-Control", "public, max-age=0");

      assert(response.headers["etag"]);
      assert(response.headers["content-length"]);
      assert(response.headers["last-modified"]);
    });

    it("200 - public", async function () {
      process.env["EXPORT_CHART_TO_PNG"] = [
        import.meta.dirname,
        "logo.png",
      ].join("/");

      await setChartPublic(chart.id, true);

      await request(server).get(`/api/charts/${chart.id}.png`).expect(200);
    });

    it("400", async function () {
      await request(server)
        .get("/api/charts/nope.png")
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .expect(400);
    });

    it("401", async function () {
      request(server).get(`/api/charts/${chart}.png`).expect(401);
    });

    it("403", async function () {
      const user2 = await createUser();
      const chart = await createChart(user.id);

      await setUserStripeSubscription(user2.id, "notused", "active");

      await request(server)
        .get(`/api/charts/${chart.id}.png`)
        .set("Cookie", [generateAuthenticationCookie(user2.id)])
        .expect(403);
    });

    it("404", async function () {
      await request(server)
        .get(`/api/charts/${randomUUID()}.png`)
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .expect(404);
    });

    it("503", async function () {
      sinon.stub(puppeteer, "launch").rejects();

      await request(server)
        .get(`/api/charts/${chart.id}.png`)
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .expect(503);
    });

    it("503 - public", async function () {
      sinon.stub(puppeteer, "launch").rejects();

      await setChartPublic(chart.id, true);

      await request(server).get(`/api/charts/${chart.id}.png`).expect(503);
    });
  });

  describe("PATCH /:id", function () {
    it("204 - data", async function () {
      await request(server)
        .patch(`/api/charts/${chart.id}`)
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .set("Content-Type", "application/json")
        .send({
          data: JSON.stringify({
            specificationVersion: "1.0.0",
            title: "My chart",
          }),
        })
        .expect(204);

      const updatedChart = await getChartById(chart.id);

      assert.deepEqual(updatedChart, {
        id: chart.id,
        title: "My chart",
        data: {
          specificationVersion: "1.0.0",
          title: "My chart",
        },
        userId: user.id,
        public: false,
        createdAt: updatedChart!.createdAt,
        updatedAt: updatedChart!.updatedAt,
      });
    });

    it("204 - public", async function () {
      await request(server)
        .patch(`/api/charts/${chart.id}`)
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .set("Content-Type", "application/json")
        .send({
          public: true,
        })
        .expect(204);

      const updatedChart = await getChartById(chart.id);

      assert(updatedChart!.public);
    });

    it("400 - chart id", async function () {
      await request(server)
        .patch("/api/charts/nope")
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .set("Content-Type", "application/json")
        .send({
          data: JSON.stringify({
            specificationVersion: "1.0.0",
            title: "My chart",
          }),
        })
        .expect(400);
    });

    it("400 - public", async function () {
      await request(server)
        .patch(`/api/charts/${chart.id}`)
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .set("Content-Type", "application/json")
        .send({
          public: "nope",
        })
        .expect(400);
    });

    it("400 - data", async function () {
      await request(server)
        .patch(`/api/charts/${chart.id}`)
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .set("Content-Type", "application/json")
        .send({
          data: "nope",
        })
        .expect(400);
    });

    it("400 - data not string", async function () {
      await request(server)
        .patch(`/api/charts/${chart.id}`)
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .set("Content-Type", "application/json")
        .send({
          data: 123,
        })
        .expect(400);
    });

    it("401", async function () {
      await request(server)
        .patch(`/api/charts/${chart.id}`)
        .set("Content-Type", "application/json")
        .send({
          data: JSON.stringify({
            specificationVersion: "1.0.0",
            title: "My chart",
          }),
        })
        .expect(401);
    });

    it("402", async function () {
      await setUserStripeSubscription(user.id, "notused", "paused");

      await request(server)
        .patch(`/api/charts/${chart.id}`)
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .set("Content-Type", "application/json")
        .send({
          data: JSON.stringify({
            specificationVersion: "1.0.0",
            title: "My chart",
          }),
        })
        .expect(402);
    });

    it("403", async function () {
      const user2 = await createUser();
      const chart = await createChart(user.id);

      await setUserStripeSubscription(user2.id, "notused", "active");

      await request(server)
        .patch(`/api/charts/${chart.id}`)
        .set("Cookie", [generateAuthenticationCookie(user2.id)])
        .set("Content-Type", "application/json")
        .send({
          data: JSON.stringify({
            specificationVersion: "1.0.0",
            title: "My chart",
          }),
        })
        .expect(403);
    });

    it("404", async function () {
      await request(server)
        .patch(`/api/charts/${randomUUID()}`)
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .set("Content-Type", "application/json")
        .send({
          data: JSON.stringify({
            specificationVersion: "1.0.0",
            title: "My chart",
          }),
        })
        .expect(404);
    });

    it("422 - invalid spec", async function () {
      await request(server)
        .patch(`/api/charts/${chart.id}`)
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .set("Content-Type", "application/json")
        .send({
          data: JSON.stringify({
            specificationVersion: "1.0.0",
            title: "My chart",
            extraProperty: "should not exist",
          }),
        })
        .expect(422);
    });
  });

  describe("DELETE /:id", function () {
    it("204", async function () {
      await request(server)
        .delete(`/api/charts/${chart.id}`)
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .expect(204);

      assert.equal(await getChartById(chart.id), null);
    });

    it("400", async function () {
      await request(server)
        .delete("/api/charts/nope")
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .expect(400);
    });

    it("401", async function () {
      request(server).delete(`/api/charts/${chart}`).expect(401);
    });

    it("402", async function () {
      await setUserStripeSubscription(user.id, "notused", "paused");

      await request(server)
        .delete(`/api/charts/${chart.id}`)
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .expect(402);
    });

    it("403", async function () {
      const user2 = await createUser();
      const chart = await createChart(user.id);

      await setUserStripeSubscription(user2.id, "notused", "active");

      await request(server)
        .delete(`/api/charts/${chart.id}`)
        .set("Cookie", [generateAuthenticationCookie(user2.id)])
        .expect(403);
    });

    it("404", async function () {
      await request(server)
        .delete(`/api/charts/${randomUUID()}`)
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .expect(404);
    });
  });
});
