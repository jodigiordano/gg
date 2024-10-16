import assert from "node:assert";
import request from "supertest";
import sinon from "sinon";
import server from "../src/server.js";
import { createUser, generateAuthenticationCookie } from "./helpers.js";
import {
  getUserById,
  setUserStripeCustomerId,
  setUserStripeSubscription,
} from "../src/db.js";
import { StripeSubscription } from "../src/stripe.js";

describe("/api/subscription", function () {
  this.afterEach(function () {
    sinon.restore();
  });

  describe("GET /", function () {
    it("200", async function () {
      const user = await createUser();

      await setUserStripeSubscription(user.id, "a", "b");

      const subscription: StripeSubscription = {
        id: "c",
        status: "d",
        trial_end: 0,
      };

      sinon
        .stub(global, "fetch")
        .resolves(new Response(JSON.stringify(subscription), { status: 200 }));

      const response = await request(server)
        .get("/api/subscription")
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .expect(200);

      assert.deepEqual(response.body, {
        status: "d",
        trialEnd: 0,
      });

      const updatedUser = await getUserById(user.id);

      assert.equal(updatedUser!.stripeSubscriptionId, "c");
      assert.equal(updatedUser!.stripeSubscriptionStatus, "d");
    });

    it("401", async function () {
      await request(server).get("/api/subscription").expect(401);
    });

    it("404 - no subscription in db", async function () {
      const user = await createUser();

      await request(server)
        .get("/api/subscription")
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .expect(404);
    });

    it("404 - no subscription in stripe", async function () {
      const user = await createUser();

      await setUserStripeSubscription(user.id, "a", "b");

      sinon
        .stub(global, "fetch")
        .resolves(new Response(JSON.stringify({}), { status: 404 }));

      await request(server)
        .get("/api/subscription")
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .expect(404);
    });
  });

  describe("POST /reactivate", function () {
    it("200", async function () {
      const user = await createUser();

      await setUserStripeCustomerId(user.id, "a");
      await setUserStripeSubscription(user.id, "b", "canceled");

      const currentSubscription: StripeSubscription = {
        id: "b",
        status: "canceled",
        trial_end: 0,
      };

      const newSubscription: StripeSubscription = {
        id: "c",
        status: "active",
        trial_end: 1,
      };

      sinon
        .stub(global, "fetch")
        .onCall(0)
        .resolves(
          new Response(JSON.stringify(currentSubscription), { status: 200 }),
        )
        .onCall(1)
        .resolves(
          new Response(JSON.stringify(newSubscription), { status: 200 }),
        );

      const response = await request(server)
        .post("/api/subscription/reactivate")
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .expect(200);

      assert.deepEqual(response.body, {
        status: "active",
        trialEnd: 1,
      });

      const updatedUser = await getUserById(user.id);

      assert.equal(updatedUser!.stripeSubscriptionId, "c");
      assert.equal(updatedUser!.stripeSubscriptionStatus, "active");
    });

    it("401", async function () {
      await request(server).post("/api/subscription/reactivate").expect(401);
    });

    it("422 - no current customer", async function () {
      const user = await createUser();

      await setUserStripeSubscription(user.id, "b", "canceled");

      await request(server)
        .post("/api/subscription/reactivate")
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .expect(422);
    });

    it("422 - no current subscription", async function () {
      const user = await createUser();

      await setUserStripeCustomerId(user.id, "a");

      await request(server)
        .post("/api/subscription/reactivate")
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .expect(422);
    });

    it("422 - current subscription is not canceled", async function () {
      const user = await createUser();

      await setUserStripeCustomerId(user.id, "a");
      await setUserStripeSubscription(user.id, "b", "active");

      const currentSubscription: StripeSubscription = {
        id: "b",
        status: "active",
        trial_end: 0,
      };

      sinon
        .stub(global, "fetch")
        .resolves(
          new Response(JSON.stringify(currentSubscription), { status: 200 }),
        );

      await request(server)
        .post("/api/subscription/reactivate")
        .set("Cookie", [generateAuthenticationCookie(user.id)])
        .expect(422);
    });
  });
});
