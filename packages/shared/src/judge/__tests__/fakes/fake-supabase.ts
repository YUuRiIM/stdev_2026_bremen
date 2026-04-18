// Minimal in-memory Supabase JS client fake. Only supports the query shapes
// used by applyVerdict (update/select/upsert + eq/is/in/maybeSingle/single).
// Intentionally narrow — breaks if production code grows new query shapes,
// which is the signal to extend this fake rather than hide coverage gaps.

type Row = Record<string, unknown>;

interface Tables {
  lecture_sessions: Row[];
  affection_state: Row[];
  understood_concepts: Row[];
  conversation_threads: Row[];
  audit_log: Row[];
  session_memory: Row[];
}

type Op =
  | { kind: 'select'; columns: string }
  | { kind: 'update'; patch: Row }
  | { kind: 'insert'; rows: Row[] }
  | { kind: 'upsert'; rows: Row[]; onConflict?: string };

type Filter =
  | { op: 'eq'; col: string; val: unknown }
  | { op: 'is'; col: string; val: unknown }
  | { op: 'in'; col: string; vals: unknown[] };

function matchesRow(row: Row, filters: Filter[]): boolean {
  return filters.every((f) => {
    if (f.op === 'eq') return row[f.col] === f.val;
    if (f.op === 'is') return row[f.col] === f.val;
    if (f.op === 'in') return f.vals.includes(row[f.col]);
    return false;
  });
}

function projectRow(row: Row, columns: string): Row {
  if (columns === '*') return row;
  const cols = columns.split(',').map((c) => c.trim());
  const out: Row = {};
  for (const col of cols) out[col] = row[col];
  return out;
}

function primaryKey(table: keyof Tables): string[] {
  switch (table) {
    case 'lecture_sessions':
    case 'conversation_threads':
    case 'audit_log':
    case 'session_memory':
      return ['id'];
    case 'affection_state':
      return ['user_id', 'character_id'];
    case 'understood_concepts':
      return ['user_id', 'character_id', 'concept'];
    default:
      return ['id'];
  }
}

function matchPK(a: Row, b: Row, keys: string[]): boolean {
  return keys.every((k) => a[k] === b[k]);
}

class QueryBuilder implements PromiseLike<{ data: any; error: any }> {
  private filters: Filter[] = [];
  private op: Op | null = null;
  private terminal: 'all' | 'maybeSingle' | 'single' = 'all';
  private _order: { col: string; ascending: boolean } | null = null;
  private _limit: number | null = null;

  constructor(
    private readonly store: Tables,
    private readonly table: keyof Tables,
  ) {}

  select(columns = '*') {
    if (this.op === null) this.op = { kind: 'select', columns };
    return this;
  }
  insert(rows: Row | Row[]) {
    this.op = { kind: 'insert', rows: Array.isArray(rows) ? rows : [rows] };
    return this;
  }
  update(patch: Row) {
    this.op = { kind: 'update', patch };
    return this;
  }
  upsert(rows: Row | Row[], options?: { onConflict?: string }) {
    this.op = {
      kind: 'upsert',
      rows: Array.isArray(rows) ? rows : [rows],
      onConflict: options?.onConflict,
    };
    return this;
  }
  eq(col: string, val: unknown) {
    this.filters.push({ op: 'eq', col, val });
    return this;
  }
  is(col: string, val: unknown) {
    this.filters.push({ op: 'is', col, val });
    return this;
  }
  in(col: string, vals: unknown[]) {
    this.filters.push({ op: 'in', col, vals });
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this._order = { col, ascending: opts?.ascending !== false };
    return this;
  }
  limit(n: number) {
    this._limit = n;
    return this;
  }
  maybeSingle() {
    this.terminal = 'maybeSingle';
    return this;
  }
  single() {
    this.terminal = 'single';
    return this;
  }

  private execute(): { data: any; error: any } {
    const rows = this.store[this.table];
    const matched = rows.filter((r) => matchesRow(r, this.filters));

    if (this.op?.kind === 'insert') {
      const toInsert = this.op.rows.map((r) => ({ ...r, id: r.id ?? genId() }));
      rows.push(...toInsert);
      return this.shape(toInsert);
    }

    if (this.op?.kind === 'update') {
      for (const r of matched) Object.assign(r, this.op.patch);
      return this.shape(matched);
    }

    if (this.op?.kind === 'upsert') {
      const keys = primaryKey(this.table);
      for (const incoming of this.op.rows) {
        const existing = rows.find((r) => matchPK(r, incoming, keys));
        if (existing) {
          Object.assign(existing, incoming);
        } else {
          rows.push({ ...incoming, id: incoming.id ?? genId() });
        }
      }
      return this.shape(this.op.rows);
    }

    // select
    let result = matched;
    if (this._order) {
      const { col, ascending } = this._order;
      result = [...result].sort((a, b) => {
        const av = a[col] as any;
        const bv = b[col] as any;
        if (av === bv) return 0;
        return (av < bv ? -1 : 1) * (ascending ? 1 : -1);
      });
    }
    if (this._limit != null) result = result.slice(0, this._limit);
    const columns = this.op?.kind === 'select' ? this.op.columns : '*';
    const projected = result.map((r) => projectRow(r, columns));
    return this.shape(projected);
  }

  private shape(rows: Row[]): { data: any; error: any } {
    if (this.terminal === 'maybeSingle') {
      return { data: rows[0] ?? null, error: null };
    }
    if (this.terminal === 'single') {
      if (rows.length === 0) {
        return { data: null, error: { message: 'no rows' } };
      }
      return { data: rows[0], error: null };
    }
    return { data: rows, error: null };
  }

  then<R1, R2>(
    onFulfilled?: ((v: { data: any; error: any }) => R1 | PromiseLike<R1>) | null,
    onRejected?: ((reason: any) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    try {
      const r = this.execute();
      return Promise.resolve(r).then(onFulfilled, onRejected);
    } catch (e) {
      return Promise.reject(e).then(onFulfilled, onRejected);
    }
  }
}

function genId(): string {
  return `gen-${Math.random().toString(36).slice(2, 10)}`;
}

export interface FakeSupabase {
  client: { from: (table: keyof Tables) => QueryBuilder };
  tables: Tables;
  seedLectureSession(row: Row): void;
  seedAffection(row: Row): void;
  seedConcept(row: Row): void;
  seedConversationThread(row: Row): void;
  findAffection(userId: string, charId: string): Row | undefined;
  findConcepts(userId: string, charId: string): Array<{ concept: string; confidence: number }>;
}

export function createFakeSupabase(): FakeSupabase {
  const tables: Tables = {
    lecture_sessions: [],
    affection_state: [],
    understood_concepts: [],
    conversation_threads: [],
    audit_log: [],
    session_memory: [],
  };

  return {
    tables,
    client: {
      from: (table) => new QueryBuilder(tables, table),
    },
    seedLectureSession(row) {
      tables.lecture_sessions.push({ verdict: null, affection_delta: null, ...row });
    },
    seedAffection(row) {
      tables.affection_state.push(row);
    },
    seedConcept(row) {
      tables.understood_concepts.push(row);
    },
    seedConversationThread(row) {
      tables.conversation_threads.push(row);
    },
    findAffection(userId, charId) {
      return tables.affection_state.find(
        (r) => r.user_id === userId && r.character_id === charId,
      );
    },
    findConcepts(userId, charId) {
      return tables.understood_concepts
        .filter((r) => r.user_id === userId && r.character_id === charId)
        .map((r) => ({
          concept: r.concept as string,
          confidence: Number(r.confidence),
        }));
    },
  };
}
