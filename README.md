# mando-mcp

Read-only [MCP](https://modelcontextprotocol.io) server for the [Mando API](https://developer.mando.fi/getting-started/introduction/),
running on Cloudflare Workers (stateless Streamable HTTP at `/mcp`). Built with `@modelcontextprotocol/sdk` and `zod`.

## Tools (read/aggregation only, GET requests only)
- `mando_get` – GET a resource or collection (`customers`, `customers/123`) with optional query filters.
- `mando_list` – paginated list (`page`, `pageSize`, `filters`).
- `mando_aggregate` – fetch up to `maxPages` pages and return `count`, optional `sum` of `sumField`, optional `groupBy` counts.

> Resource names are generic; adjust the base URL / auth in `wrangler.toml` and `src/client.ts` to match the Mando API docs.

## Setup
```
npm install
npx wrangler secret put MANDO_API_TOKEN
npx wrangler secret put MCP_AUTH_TOKEN   # optional, protects /mcp
npm run dev      # local
npm run deploy
npm test && npm run typecheck
```
Configure `MANDO_API_BASE_URL` in `wrangler.toml`.
