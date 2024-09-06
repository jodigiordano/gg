# Server

1. Follow [infra instructions](../infra/README.md).

2. Setup environment variables

```sh
cp .env.example .env
```

3. Install dependencies

```sh
npm ci
```

4. Create the database

```
npm run db:setup
```

5. Start the server

```
npm run dev
```
