import express from "express";
import { config } from "./config/env.js";
import { handleMcpSse, handleMcpMessage } from "./mcp/server.js";
import { publicRouter } from "./public-site/routes.js";

const app = express();
app.use(express.json());

// Public API Routes
app.use("/api", publicRouter);

// MCP Routes
app.get("/mcp/sse", handleMcpSse);
app.post("/mcp/messages", handleMcpMessage);

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
});