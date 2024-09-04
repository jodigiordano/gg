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
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Graph {
  id: string;
  public?: boolean;
  userId?: string;
  data?: Record<string, unknown>;
  title?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export async function getUserById(id: string): Promise<User | null> {
  const data = await pool.query(
    "SELECT DISTINCT ON (id) * FROM users WHERE id = $1 LIMIT 1",
    [id],
  );

  const row = data.rows[0];

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    stripeSubscriptionStatus: row.stripe_subscription_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getUserByEmail(id: string): Promise<User | null> {
  const data = await pool.query(
    "SELECT DISTINCT ON (id) * FROM users WHERE email = $1 LIMIT 1",
    [id],
  );

  const row = data.rows[0];

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    stripeSubscriptionStatus: row.stripe_subscription_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createUser(email: string): Promise<User> {
  const id = randomUUID();

  await pool.query(
    "INSERT INTO users(id, email, created_at, updated_at) VALUES ($1, $2, now(), now())",
    [id, email],
  );

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
  await pool.query(
    "UPDATE users SET stripe_customer_id = $2, updated_at = now() WHERE id = $1",
    [id, stripeCustomerId],
  );
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
      "stripe_subscription_status = $3,",
      "updated_at = now()",
      "WHERE id = $1",
    ].join(" "),
    [id, stripeSubscriptionId, stripeSubscriptionStatus],
  );
}

export async function getUserGraphsCount(userId: string): Promise<number> {
  const data = await pool.query(
    "SELECT COUNT(*) FROM graphs WHERE user_id = $1",
    [userId],
  );

  return Number(data.rows[0].count);
}

export async function getUserGraphs(userId: string): Promise<Graph[]> {
  const data = await pool.query(
    "SELECT DISTINCT ON (id) id, public, data->>'title' as title FROM graphs WHERE user_id = $1",
    [userId],
  );

  return data.rows.map(
    row =>
      <Graph>{
        id: row.id,
        public: row.public,
        title: row.title,
      },
  );
}

export async function createGraph(
  userId: string,
  data?: string,
): Promise<Graph> {
  const id = randomUUID();

  await pool.query(
    "INSERT INTO graphs(id, user_id, data, created_at, updated_at) VALUES ($1, $2, $3, now(), now())",
    [
      id,
      userId,
      data ??
        JSON.stringify({
          specificationVersion: "1.0.0",
          title: "Untitled graph",
        }),
    ],
  );

  const createdGraph = await getGraphById(id);

  if (!createdGraph) {
    throw new DatabaseError(`Graph ${id} not created in DB for user ${userId}`);
  }

  return createdGraph;
}

export async function getGraphById(id: string): Promise<Graph | null> {
  const data = await pool.query(
    "SELECT DISTINCT ON (id) *, data->>'title' as title FROM graphs WHERE id = $1 LIMIT 1",
    [id],
  );

  const row = data.rows[0];

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    public: row.public,
    data: row.data,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function setGraphData(id: string, data: string): Promise<void> {
  await pool.query(
    "UPDATE graphs SET data = $2, updated_at = now() WHERE id = $1",
    [id, data],
  );
}

export async function setGraphPublic(
  id: string,
  isPublic: boolean,
): Promise<void> {
  await pool.query(
    "UPDATE graphs SET public = $2, updated_at = now() WHERE id = $1",
    [id, isPublic],
  );
}

export async function deleteGraph(id: string): Promise<void> {
  await pool.query("DELETE FROM graphs WHERE id = $1", [id]);
}
