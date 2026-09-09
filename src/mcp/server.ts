import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { Request, Response } from "express";
import { registerPostTools } from "./tools/posts.js";
import { registerLifecycleTools } from "./tools/lifecycle.js";

/**
 * 1. Initialize the Core MCP Server
 */
export const mcpServer = new McpServer({
  name: "quill-mcp-server",
  version: "1.0.0",
});

/**
 * 2. Register Tool Groups
 */
registerPostTools(mcpServer);
registerLifecycleTools(mcpServer);

/**
 * Active SSE Transport Session Store
 */
const transports = new Map<string, SSEServerTransport>();

/**
 * 3. HTTP SSE Handler for Express
 */
export const handleMcpSse = async (req: Request, res: Response): Promise<void> => {
  const apiKey = req.query.key as string;

  if (!apiKey) {
    res.status(401).json({ error: "Unauthorized: Missing API key in request query parameter." });
    return;
  }

  // TODO (Member 3 Integration): Validate apiKey against DB
  const contextUserId = "user_mock_123";

  const transport = new SSEServerTransport("/mcp/messages", res);
  transports.set(transport.sessionId, transport);

  transport.onclose = () => {
    transports.delete(transport.sessionId);
  };

  await mcpServer.connect(transport);
};

/**
 * 4. HTTP Post Message Handler for Express
 */
export const handleMcpMessage = async (req: Request, res: Response): Promise<void> => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.get(sessionId);

  if (!transport) {
    res.status(400).json({ error: "Invalid or expired SSE sessionId." });
    return;
  }

  // Pass req.body so the SDK uses the already-parsed Express JSON body
  await transport.handlePostMessage(req, res, req.body);
};