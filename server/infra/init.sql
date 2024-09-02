DROP TABLE IF EXISTS users, graphs;

CREATE TABLE users(
  id UUID NOT NULL,
  email VARCHAR(255) NOT NULL,
  stripe_customer_id VARCHAR(50),
  stripe_subscription_id VARCHAR(50),
  stripe_subscription_status VARCHAR(50),
  PRIMARY KEY(id)
);

CREATE TABLE graphs(
  id UUID NOT NULL,
  user_id UUID,
  data json NOT NULL,
  public boolean NOT NULL DEFAULT false,
  PRIMARY KEY(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);
