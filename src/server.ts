import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { aggregate, extractItems } from "./aggregate";
import type { MandoClient } from "./client";

/** Resource path: segments of safe characters, no traversal, no query/fragment. */
const resourcePath = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z0-9_-]+(\/[A-Za-z0-9_.-]+)*$/, "Invalid resource path")
  .refine((p) => !p.split("/").some((s) => s === "." || s === ".."), "Invalid resource path");

const filters = z
  .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
  .optional()
  .describe("Query-string filters passed to the API");

const fieldName = z.string().regex(/^[A-Za-z0-9_.-]+$/).max(100);

const json = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
});

const fail = (e: unknown) => ({
  isError: true,
  content: [{ type: "text" as const, text: e instanceof Error ? e.message : String(e) }],
});

export function createServer(client: MandoClient): McpServer {
  const server = new McpServer({ name: "mando-mcp", version: "0.1.0" });

  server.registerTool(
    "mando_get",
    {
      description: "Read-only GET of a single Mando API resource or collection, e.g. 'customers' or 'customers/123'.",
      inputSchema: { path: resourcePath, query: filters },
    },
    async ({ path, query }) => {
      try {
        return json(await client.get(path, query));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "mando_list",
    {
      description: "Read-only list of a Mando API collection with pagination.",
      inputSchema: {
        resource: resourcePath,
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(200).default(50),
        filters,
      },
    },
    async ({ resource, page, pageSize, filters }) => {
      try {
        return json(await client.get(resource, { ...filters, page, pageSize }));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "mando_aggregate",
    {
      description:
        "Read-only aggregation over a Mando collection: fetches up to maxPages pages and returns count, optional sum of a numeric field and optional group-by counts.",
      inputSchema: {
        resource: resourcePath,
        filters,
        groupBy: fieldName.optional(),
        sumField: fieldName.optional(),
        pageSize: z.number().int().min(1).max(200).default(100),
        maxPages: z.number().int().min(1).max(20).default(5),
      },
    },
    async ({ resource, filters, groupBy, sumField, pageSize, maxPages }) => {
      try {
        const rows = [];
        let truncated = false;
        for (let page = 1; page <= maxPages; page++) {
          const items = extractItems(await client.get(resource, { ...filters, page, pageSize }));
          rows.push(...items);
          if (items.length < pageSize) break;
          if (page === maxPages) truncated = true;
        }
        return json({ ...aggregate(rows, { groupBy, sumField }), truncated });
      } catch (e) {
        return fail(e);
      }
    },
  );

  return server;
}
