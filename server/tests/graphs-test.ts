import assert from "node:assert";
import { randomUUID } from "node:crypto";
import request from "supertest";
import server from "../src/server.js";
import { createUser, generateAuthenticationCookie } from "./helpers.js";
import {
  createGraph,
  getGraphById,
  Graph,
  setGraphPublic,
  setUserStripeSubscription,
  User,
} from "../src/db.js";

describe("/api/graphs", function () {
  let user: User;
  let graph: Graph;

  this.beforeEach(async function () {
    user = await createUser();
    graph = await createGraph(user.id);

    await setUserStripeSubscription(user.id, "notused", "active");
  });

  describe("GET /", function () {
    it("200", async function () {
      const response = await request(server)
        .get("/api/graphs")
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .expect(200);

      assert.deepEqual(response.body, {
        total: 1,
        data: [
          {
            id: graph.id,
            title: graph.title,
            public: false,
          },
        ],
      });
    });

    it("401", async function () {
      request(server).get("/api/graphs").expect(401);
    });
  });

  describe("POST /", function () {
    it("200", async function () {
      await request(server)
        .post("/api/graphs")
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .expect(200);
    });

    it("200 - data", async function () {
      const data = {
        specificationVersion: "1.0.0",
        title: "My graph",
      };

      await request(server)
        .post("/api/graphs")
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .set("Content-Type", "application/json")
        .send({ data: JSON.stringify(data) })
        .expect(200);
    });

    it("400", async function () {
      await request(server)
        .post("/api/graphs")
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .set("Content-Type", "application/json")
        .send({ data: "nope" })
        .expect(400);
    });

    it("402", async function () {
      await setUserStripeSubscription(user.id, "notused", "paused");

      await request(server)
        .post("/api/graphs")
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .expect(402);
    });

    it("401", async function () {
      request(server).post("/api/graphs").expect(401);
    });

    it("422", async function () {
      const data = {
        specificationVersion: "1.0.0",
        title: "My graph",
        extraProperty: "oops",
      };

      await request(server)
        .post("/api/graphs")
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .set("Content-Type", "application/json")
        .send({ data: JSON.stringify(data) })
        .expect(422);
    });

    it("422 - max", async function () {
      for (let i = 0; i < 100; i++) {
        createGraph(user.id);
      }

      await request(server)
        .post("/api/graphs")
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .expect(422);
    });
  });

  describe("GET /:id", function () {
    it("200", async function () {
      const response = await request(server)
        .get(`/api/graphs/${graph.id}`)
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .expect(200);

      assert.deepEqual(response.body, {
        id: graph.id,
        title: graph.title,
        data: graph.data,
        userId: user.id,
        public: false,
      });
    });

    it("200 - public - anonymous", async function () {
      await setGraphPublic(graph.id, true);

      const response = await request(server)
        .get(`/api/graphs/${graph.id}`)
        .expect(200);

      assert.deepEqual(response.body, {
        id: graph.id,
        title: graph.title,
        data: graph.data,
      });
    });

    it("200 - public - authenticated owner", async function () {
      await setGraphPublic(graph.id, true);

      const response = await request(server)
        .get(`/api/graphs/${graph.id}`)
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .expect(200);

      assert.deepEqual(response.body, {
        id: graph.id,
        title: graph.title,
        data: graph.data,
        userId: user.id,
        public: true,
      });
    });

    it("200 - public - authenticated other", async function () {
      const user2 = await createUser();

      await setGraphPublic(graph.id, true);

      const response = await request(server)
        .get(`/api/graphs/${graph.id}`)
        .set("Cookie", [generateAuthenticationCookie(user2.id)])
        .expect(200);

      assert.deepEqual(response.body, {
        id: graph.id,
        title: graph.title,
        data: graph.data,
      });
    });

    it("400", async function () {
      await request(server)
        .get("/api/graphs/nope")
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .expect(400);
    });

    it("401", async function () {
      request(server).get(`/api/graphs/${graph}`).expect(401);
    });

    it("403", async function () {
      const user2 = await createUser();
      const graph = await createGraph(user.id);

      await setUserStripeSubscription(user2.id, "notused", "active");

      await request(server)
        .get(`/api/graphs/${graph.id}`)
        .set("Cookie", [generateAuthenticationCookie(user2.id)])
        .expect(403);
    });

    it("404", async function () {
      await request(server)
        .get(`/api/graphs/${randomUUID()}`)
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .expect(404);
    });
  });

  describe("PATCH /:id", function () {
    it("204 - data", async function () {
      await request(server)
        .patch(`/api/graphs/${graph.id}`)
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .set("Content-Type", "application/json")
        .send({
          data: JSON.stringify({
            specificationVersion: "1.0.0",
            title: "My graph",
          }),
        })
        .expect(204);

      const updatedGraph = await getGraphById(graph.id);

      assert.deepEqual(updatedGraph, {
        id: graph.id,
        title: "My graph",
        data: {
          specificationVersion: "1.0.0",
          title: "My graph",
        },
        userId: user.id,
        public: false,
      });
    });

    it("204 - public", async function () {
      await request(server)
        .patch(`/api/graphs/${graph.id}`)
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .set("Content-Type", "application/json")
        .send({
          public: true,
        })
        .expect(204);

      const updatedGraph = await getGraphById(graph.id);

      assert(updatedGraph!.public);
    });

    it("400 - graph id", async function () {
      await request(server)
        .patch("/api/graphs/nope")
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .set("Content-Type", "application/json")
        .send({
          data: JSON.stringify({
            specificationVersion: "1.0.0",
            title: "My graph",
          }),
        })
        .expect(400);
    });

    it("400 - public", async function () {
      await request(server)
        .patch(`/api/graphs/${graph.id}`)
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .set("Content-Type", "application/json")
        .send({
          public: "nope",
        })
        .expect(400);
    });

    it("400 - data", async function () {
      await request(server)
        .patch(`/api/graphs/${graph.id}`)
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .set("Content-Type", "application/json")
        .send({
          data: "nope",
        })
        .expect(400);
    });

    it("400 - data not string", async function () {
      await request(server)
        .patch(`/api/graphs/${graph.id}`)
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .set("Content-Type", "application/json")
        .send({
          data: 123,
        })
        .expect(400);
    });

    it("401", async function () {
      await request(server)
        .patch(`/api/graphs/${graph.id}`)
        .set("Content-Type", "application/json")
        .send({
          data: JSON.stringify({
            specificationVersion: "1.0.0",
            title: "My graph",
          }),
        })
        .expect(401);
    });

    it("402", async function () {
      await setUserStripeSubscription(user.id, "notused", "paused");

      await request(server)
        .patch(`/api/graphs/${graph.id}`)
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .set("Content-Type", "application/json")
        .send({
          data: JSON.stringify({
            specificationVersion: "1.0.0",
            title: "My graph",
          }),
        })
        .expect(402);
    });

    it("403", async function () {
      const user2 = await createUser();
      const graph = await createGraph(user.id);

      await setUserStripeSubscription(user2.id, "notused", "active");

      await request(server)
        .patch(`/api/graphs/${graph.id}`)
        .set("Cookie", [generateAuthenticationCookie(user2.id)])
        .set("Content-Type", "application/json")
        .send({
          data: JSON.stringify({
            specificationVersion: "1.0.0",
            title: "My graph",
          }),
        })
        .expect(403);
    });

    it("404", async function () {
      await request(server)
        .patch(`/api/graphs/${randomUUID()}`)
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .set("Content-Type", "application/json")
        .send({
          data: JSON.stringify({
            specificationVersion: "1.0.0",
            title: "My graph",
          }),
        })
        .expect(404);
    });

    it("422 - invalid spec", async function () {
      await request(server)
        .patch(`/api/graphs/${graph.id}`)
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .set("Content-Type", "application/json")
        .send({
          data: JSON.stringify({
            specificationVersion: "1.0.0",
            title: "My graph",
            extraProperty: "should not exist",
          }),
        })
        .expect(422);
    });
  });

  describe("DELETE /:id", function () {
    it("204", async function () {
      await request(server)
        .delete(`/api/graphs/${graph.id}`)
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .expect(204);

      assert.equal(await getGraphById(graph.id), null);
    });

    it("400", async function () {
      await request(server)
        .delete("/api/graphs/nope")
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .expect(400);
    });

    it("401", async function () {
      request(server).delete(`/api/graphs/${graph}`).expect(401);
    });

    it("402", async function () {
      await setUserStripeSubscription(user.id, "notused", "paused");

      await request(server)
        .delete(`/api/graphs/${graph.id}`)
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .expect(402);
    });

    it("403", async function () {
      const user2 = await createUser();
      const graph = await createGraph(user.id);

      await setUserStripeSubscription(user2.id, "notused", "active");

      await request(server)
        .delete(`/api/graphs/${graph.id}`)
        .set("Cookie", [generateAuthenticationCookie(user2.id)])
        .expect(403);
    });

    it("404", async function () {
      await request(server)
        .delete(`/api/graphs/${randomUUID()}`)
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .expect(404);
    });
  });
});
