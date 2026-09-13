import dotenv from "dotenv";
import express from "express";
import { config } from "./config/env.js";
import { handleMcpSse, handleMcpMessage } from "./mcp/server.js";
import { publicRouter } from "./public-site/routes.js";
import { auditMiddleware } from "./middleware/audit.js";
import { dashboardRouter } from "./dashboard/routes.js";

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    name: "Quill MCP Blogging Platform",
    status: "running",
    message: "The backend is up. Add the rest of the MCP and dashboard features as needed.",
  });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, port });
});

app.get("/mcp", (_req, res) => {
  res.status(501).json({
    error: "MCP transport is not fully wired in this workspace yet.",
  });
});

// Dashboard
app.use("/dashboard", dashboardRouter);

// Audit MCP requests
app.use("/mcp", auditMiddleware);
// MCP Routes
app.get("/mcp/sse", handleMcpSse);
app.post("/mcp/messages", handleMcpMessage);

app.listen(port, () => {
  console.log(`Quill server listening on http://localhost:${port}`);
});
