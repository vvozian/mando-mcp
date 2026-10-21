import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { aggregate } from "../src/aggregate";
import { MandoClient } from "../src/client";
import { createServer } from "../src/server";

const calls: string[] = [];
const fakeFetch = (async (url: URL, init: RequestInit) => {
  calls.push(`${init.method} ${url}`);
  const page = Number(url.searchParams.get("page") ?? 1);
  const items = page === 1 ? [{ t: "a", v: 1 }, { t: "b", v: 2 }] : [{ t: "a", v: 3 }];
  return new Response(JSON.stringify({ items }), { status: 200 });
}) as unknown as typeof fetch;

async function connect() {
  const client = new Client({ name: "t", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  const mando = new MandoClient({ MANDO_API_BASE_URL: "https://x.test/", MANDO_API_TOKEN: "k" }, fakeFetch);
  await Promise.all([createServer(mando).connect(a), client.connect(b)]);
  return client;
}

describe("aggregate", () => {
  it("counts, sums and groups", () => {
    const r = aggregate([{ t: "a", v: 1 }, { t: "a", v: 2 }, { t: "b", v: 5 }], { groupBy: "t", sumField: "v" });
    expect(r).toEqual({ count: 3, sum: 8, groups: { a: { count: 2, sum: 3 }, b: { count: 1, sum: 5 } } });
  });
});

describe("mcp server", () => {
  it("lists only read tools", async () => {
    const { tools } = await (await connect()).listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["mando_aggregate", "mando_get", "mando_list"]);
  });

  it("aggregates across pages", async () => {
    const res: any = await (await connect()).callTool({
      name: "mando_aggregate",
      arguments: { resource: "orders", groupBy: "t", sumField: "v", pageSize: 2 },
    });
    expect(JSON.parse(res.content[0].text).count).toBe(3);
    expect(calls.every((c) => c.startsWith("GET "))).toBe(true);
  });

  it("rejects path traversal", async () => {
    const res: any = await (await connect()).callTool({ name: "mando_get", arguments: { path: "../admin" } });
    expect(res.isError).toBe(true);
  });
});
