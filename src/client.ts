import type { Env } from "./env";

export type QueryValue = string | number | boolean;
export type Query = Record<string, QueryValue | undefined>;

/** Read-only client: only GET requests are ever issued. */
export class MandoClient {
  constructor(
    private readonly env: Pick<Env, "MANDO_API_BASE_URL" | "MANDO_API_TOKEN">,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  buildUrl(path: string, query: Query = {}): URL {
    const base = this.env.MANDO_API_BASE_URL.replace(/\/+$/, "");
    const url = new URL(`${base}/${path.replace(/^\/+/, "")}`);
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
    return url;
  }

  async get(path: string, query: Query = {}): Promise<unknown> {
    const res = await this.fetchFn(this.buildUrl(path, query), {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${this.env.MANDO_API_TOKEN}`,
      },
    });
    if (!res.ok) {
      throw new Error(`Mando API responded ${res.status} ${res.statusText}`);
    }
    return res.json();
  }
}
