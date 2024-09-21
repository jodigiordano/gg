DROP TABLE IF EXISTS charts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users(
  id UUID NOT NULL,
  email VARCHAR(255) NOT NULL,
  stripe_customer_id VARCHAR(50),
  stripe_subscription_id VARCHAR(50),
  stripe_subscription_status VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY(id)
);

CREATE TABLE charts(
  id UUID NOT NULL,
  user_id UUID,
  data json NOT NULL,
  public boolean NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY(id),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
