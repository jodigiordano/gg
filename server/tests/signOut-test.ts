import request from "supertest";
import server from "../src/server.js";

describe("/api/sign-out", function () {
  describe("POST /", function () {
    it("302", async function () {
      await request(server)
        .post("/api/sign-out")
        .expect(302)
        .expect("Location", "/");
    });
  });
});
