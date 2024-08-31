# Server

1. [Install PostgreSQL](https://www.postgresql.org/download/linux/debian/).
2. Replace `peer` to `trust` in `/etc/postgresql/xx/main/pg_hba.conf`.
3. Execute:

```sh
psql -U postgres

CREATE ROLE gg WITH LOGIN PASSWORD 'gg';
ALTER ROLE gg CREATEDB;
CREATE DATABASE gg;
GRANT ALL PRIVILEGES ON DATABASE gg TO gg;
\c gg
GRANT ALL ON SCHEMA public TO gg;

CREATE DATABASE gg_test;
GRANT ALL PRIVILEGES ON DATABASE gg_test TO gg;
\c gg_test
GRANT ALL ON SCHEMA public TO gg;
```

4. Setup environment variables

```sh
cp .env.example .env
```

5. Install dependencies

```sh
npm ci
```

6. Create & seed the database

```
npm run db:setup
```

7. Start the server

```
npm run dev
```
