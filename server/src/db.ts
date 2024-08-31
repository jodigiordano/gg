import pg from "pg";
import { randomUUID } from "node:crypto";
import { DatabaseError } from "./errors.js";

// Create the PostgreSQL connection pool.
const pool = new pg.Pool({
  host: process.env["DATABASE_HOST"],
  port: Number(process.env["DATABASE_PORT"]),
  database: process.env["DATABASE_NAME"],
  user: process.env["DATABASE_USERNAME"],
  password: process.env["DATABASE_PASSWORD"],
});

export interface User {
  id: string;
  email: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeSubscriptionStatus?: string;
}

export async function getUserById(id: string): Promise<User | null> {
  const data = await pool.query(
    "SELECT DISTINCT ON (id) * FROM users WHERE id = $1 LIMIT 1",
    [id],
  );

  if (!data.rows.length) {
    return null;
  }

  return {
    id: data.rows[0].id,
    email: data.rows[0].email,
    stripeCustomerId: data.rows[0].stripe_customer_id,
    stripeSubscriptionId: data.rows[0].stripe_subscription_id,
    stripeSubscriptionStatus: data.rows[0].stripe_subscription_status,
  };
}

export async function getUserByEmail(id: string): Promise<User | null> {
  const data = await pool.query(
    "SELECT DISTINCT ON (id) * FROM users WHERE email = $1 LIMIT 1",
    [id],
  );

  if (!data.rows.length) {
    return null;
  }

  return {
    id: data.rows[0].id,
    email: data.rows[0].email,
    stripeCustomerId: data.rows[0].stripe_customer_id,
    stripeSubscriptionId: data.rows[0].stripe_subscription_id,
    stripeSubscriptionStatus: data.rows[0].stripe_subscription_status,
  };
}

export async function createUser(email: string): Promise<User> {
  const id = randomUUID();

  await pool.query("INSERT INTO users(id, email) VALUES ($1, $2)", [id, email]);

  const createdUser = await getUserById(id);

  if (!createdUser) {
    throw new DatabaseError(`User ${email} not created in DB`);
  }

  return createdUser;
}

export async function deleteUser(id: string): Promise<void> {
  await pool.query("DELETE FROM users WHERE id = $1", [id]);
}

export async function setUserStripeCustomerId(
  id: string,
  stripeCustomerId: string,
): Promise<void> {
  await pool.query("UPDATE users SET stripe_customer_id = $2 WHERE id = $1", [
    id,
    stripeCustomerId,
  ]);
}

export async function setUserStripeSubscription(
  id: string,
  stripeSubscriptionId: string,
  stripeSubscriptionStatus: string,
): Promise<void> {
  await pool.query(
    [
      "UPDATE users SET",
      "stripe_subscription_id = $2,",
      "stripe_subscription_status = $3",
      "WHERE id = $1",
    ].join(" "),
    [id, stripeSubscriptionId, stripeSubscriptionStatus],
  );
}
