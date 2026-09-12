import express from "express";
import { handleMcpSse, handleMcpMessage } from "./mcp/server.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// SSE Endpoint: Agents initiate streams here
app.get("/mcp/sse", handleMcpSse);

// Message Endpoint: Post tool calls here
app.post("/mcp/messages", handleMcpMessage);

app.listen(PORT, () => {
  console.log(`MCP Server testing instance running on http://localhost:${PORT}`);
});