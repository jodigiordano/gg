import server from "./server.js";

const port = Number(process.env["PORT"] ?? "3000");

// Serve traffic.
server.listen(port);

console.log(`Server started on port ${port}`);
