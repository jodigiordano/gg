import request from "supertest";
import sinon from "sinon";
import server from "../src/server.js";

describe("/api/feedback", function () {
  this.afterEach(function () {
    sinon.restore();
  });

  describe("POST /", function () {
    it("204 - minimal", async function () {
      sinon
        .stub(global, "fetch")
        .resolves(new Response(JSON.stringify({}), { status: 200 }));

      await request(server)
        .post("/api/feedback")
        .set("Content-Type", "application/json")
        .send({
          message: "a",
        })
        .expect(204);
    });

    it("204 - email", async function () {
      sinon
        .stub(global, "fetch")
        .resolves(new Response(JSON.stringify({}), { status: 200 }));

      await request(server)
        .post("/api/feedback")
        .set("Content-Type", "application/json")
        .send({
          email: "a@b.com",
          message: "a",
        })
        .expect(204);
    });

    it("204 - chart", async function () {
      sinon
        .stub(global, "fetch")
        .resolves(new Response(JSON.stringify({}), { status: 200 }));

      await request(server)
        .post("/api/feedback")
        .set("Content-Type", "application/json")
        .send({
          message: "a",
          chart: "b",
        })
        .expect(204);
    });

    it("400", async function () {
      await request(server)
        .post("/api/feedback")
        .set("Content-Type", "application/json")
        .send("nope")
        .expect(400);
    });

    it("400 - missing message", async function () {
      await request(server)
        .post("/api/feedback")
        .set("Content-Type", "application/json")
        .send({})
        .expect(400);
    });

    it("422", async function () {
      sinon
        .stub(global, "fetch")
        .resolves(new Response(JSON.stringify({}), { status: 422 }));

      await request(server)
        .post("/api/feedback")
        .set("Content-Type", "application/json")
        .send({
          email: "a@b.com",
          message: "a",
          chart: "b",
        })
        .expect(422);
    });
  });
});
