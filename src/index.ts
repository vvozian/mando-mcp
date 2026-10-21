import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { MandoClient } from "./client";
import type { Env } from "./env";
import { createServer } from "./server";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/mcp") return new Response("Not found", { status: 404 });

    if (env.MCP_AUTH_TOKEN && request.headers.get("Authorization") !== `Bearer ${env.MCP_AUTH_TOKEN}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Stateless: a fresh server + transport per request.
    const server = createServer(new MandoClient(env));
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    await server.connect(transport);
    return transport.handleRequest(request);
  },
};
