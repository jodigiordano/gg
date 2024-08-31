import { StripeError } from "./errors.js";

const authenticationHeader = {
  Authorization: `Bearer ${process.env["STRIPE_SECRET_KEY"]}`,
};

export interface StripeCustomer {
  id: string;
  email: string;
}

export interface StripeSubscription {
  id: string;
  status: string;
  trial_end: number;
}

export async function findCustomer(
  email: string,
): Promise<StripeCustomer | null> {
  try {
    const response = await fetch(
      `https://api.stripe.com/v1/customers/search?query=email:'${email}'`,
      {
        headers: {
          ...authenticationHeader,
        },
      },
    );

    const payload = await response.json();

    if (!response.ok) {
      throw new StripeError(payload.message);
    }

    const customer = payload.data[0];

    if (!customer) {
      return null;
    }

    return {
      id: customer.id,
      email,
    };
  } catch (error) {
    throw new StripeError((error as Error).message);
  }
}

export async function createCustomer(email: string): Promise<StripeCustomer> {
  try {
    const response = await fetch("https://api.stripe.com/v1/customers", {
      method: "POST",
      headers: {
        ...authenticationHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        email,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new StripeError(payload.message);
    }

    return {
      id: payload.id,
      email,
    };
  } catch (error) {
    throw new StripeError((error as Error).message);
  }
}

export async function findSubscription(
  customerId: string,
): Promise<StripeSubscription | null> {
  try {
    const response = await fetch(
      `https://api.stripe.com/v1/subscriptions?customer=${customerId}&limit=1`,
      {
        headers: {
          ...authenticationHeader,
        },
      },
    );

    const payload = await response.json();

    if (!response.ok) {
      throw new StripeError(payload.message);
    }

    const subscription = payload.data[0];

    if (!subscription) {
      return null;
    }

    return {
      id: subscription.id,
      status: subscription.status,
      trial_end: subscription.trial_end,
    };
  } catch (error) {
    throw new StripeError((error as Error).message);
  }
}

export async function createSubscription(
  customerId: string,
  trialPeriodDays: number = 14,
): Promise<StripeSubscription> {
  try {
    const response = await fetch("https://api.stripe.com/v1/subscriptions", {
      method: "POST",
      headers: {
        ...authenticationHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        customer: customerId,
        "items[0][price]": process.env["STRIPE_PRICE_ID"]!,
        trial_period_days: trialPeriodDays.toString(),
        collection_method: "charge_automatically",
        cancel_at_period_end: "false",
        "trial_settings[end_behavior][missing_payment_method]": "pause",
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new StripeError(payload.message);
    }

    return {
      id: payload.id,
      status: payload.status,
      trial_end: payload.trial_end,
    };
  } catch (error) {
    throw new StripeError((error as Error).message);
  }
}

export async function getSubscription(
  subscriptionId: string,
): Promise<StripeSubscription | null> {
  try {
    const response = await fetch(
      `https://api.stripe.com/v1/subscriptions/${subscriptionId}`,
      {
        headers: {
          ...authenticationHeader,
        },
      },
    );

    const payload = await response.json();

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }

      throw new StripeError(payload.message);
    }

    return {
      id: payload.id,
      status: payload.status,
      trial_end: payload.trial_end,
    };
  } catch (error) {
    throw new StripeError((error as Error).message);
  }
}

export async function cancelSubscription(
  subscriptionId: string,
): Promise<void> {
  try {
    const response = await fetch(
      `https://api.stripe.com/v1/subscriptions/${subscriptionId}`,
      {
        method: "DELETE",
        headers: {
          ...authenticationHeader,
        },
      },
    );

    const payload = await response.json();

    if (!response.ok) {
      throw new StripeError(payload.message);
    }
  } catch (error) {
    throw new StripeError((error as Error).message);
  }
}
