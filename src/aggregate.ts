export type Row = Record<string, unknown>;

/** Extract the array of records from common list response envelopes. */
export function extractItems(body: unknown): Row[] {
  if (Array.isArray(body)) return body as Row[];
  if (body && typeof body === "object") {
    for (const key of ["items", "data", "results", "value"]) {
      const v = (body as Row)[key];
      if (Array.isArray(v)) return v as Row[];
    }
  }
  return [];
}

export interface AggregateOptions {
  groupBy?: string;
  sumField?: string;
}

export interface AggregateResult {
  count: number;
  sum?: number;
  groups?: Record<string, { count: number; sum?: number }>;
}

export function aggregate(rows: Row[], opts: AggregateOptions): AggregateResult {
  const num = (r: Row) => {
    const n = Number(r[opts.sumField as string]);
    return Number.isFinite(n) ? n : 0;
  };
  const result: AggregateResult = { count: rows.length };
  if (opts.sumField) result.sum = rows.reduce((s, r) => s + num(r), 0);
  if (opts.groupBy) {
    const groups: NonNullable<AggregateResult["groups"]> = {};
    for (const r of rows) {
      const key = String(r[opts.groupBy] ?? "null");
      const g = (groups[key] ??= { count: 0, ...(opts.sumField ? { sum: 0 } : {}) });
      g.count++;
      if (opts.sumField) g.sum = (g.sum ?? 0) + num(r);
    }
    result.groups = groups;
  }
  return result;
}
