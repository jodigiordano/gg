import express from "express";
import { HttpError } from "./errors.js";
import { authenticateUser, setAuthenticationCookie } from "./authentication.js";
import { createSubscription, getSubscription } from "./stripe.js";
import { setUserStripeSubscription } from "./db.js";

const router = express.Router();

router.get("/", async function (req: express.Request, res: express.Response) {
  const user = await authenticateUser(req);

  setAuthenticationCookie(user.id, res);

  if (!user.stripeSubscriptionId) {
    throw new HttpError(404);
  }

  const subscription = await getSubscription(user.stripeSubscriptionId);

  if (!subscription) {
    throw new HttpError(404);
  }

  // Synchronize in DB.
  await setUserStripeSubscription(
    user.id,
    subscription.id,
    subscription.status,
  );

  res.status(200).json({
    status: subscription.status,
    trialEnd: subscription.trial_end,
  });
});

router.post(
  "/reactivate",
  async function (req: express.Request, res: express.Response) {
    const user = await authenticateUser(req);

    setAuthenticationCookie(user.id, res);

    if (!user.stripeCustomerId || !user.stripeSubscriptionId) {
      throw new HttpError(422);
    }

    // Even if we have the status of the subscription in DB,
    // we fetch the latest value from Stripe, just in case it changed.
    const currentSubscription = await getSubscription(
      user.stripeSubscriptionId,
    );

    if (!currentSubscription || currentSubscription.status !== "canceled") {
      throw new HttpError(422);
    }

    const newSubscription = await createSubscription(user.stripeCustomerId, 0);

    await setUserStripeSubscription(
      user.id,
      newSubscription.id,
      newSubscription.status,
    );

    res.status(200).json({
      status: newSubscription.status,
      trialEnd: newSubscription.trial_end,
    });
  },
);

export default router;
