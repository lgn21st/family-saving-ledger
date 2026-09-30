// Only the read and RPC surface used by the ledger; table writes go through RPCs.
type SupabaseResult<T> = {
  data: T | null;
  error: { message: string; code?: string } | null;
  status?: number;
  count?: number | null;
};

export type SupabaseFilterBuilder<T> = PromiseLike<SupabaseResult<T[]>> & {
  eq: (column: string, value: unknown) => SupabaseFilterBuilder<T>;
  gte: (column: string, value: string) => SupabaseFilterBuilder<T>;
  in: (column: string, values: unknown[]) => SupabaseFilterBuilder<T>;
  order: (column: string, options?: { ascending?: boolean }) => SupabaseFilterBuilder<T>;
  range: (from: number, to: number) => SupabaseFilterBuilder<T>;
  limit: (count: number) => SupabaseFilterBuilder<T>;
  maybeSingle: () => PromiseLike<SupabaseResult<T>>;
};

export type SupabaseFromClient = {
  from: (table: string) => {
    select: (columns?: string, options?: { count?: "exact" }) => SupabaseFilterBuilder<unknown>;
  };
};
export type SupabaseRpcClient = {
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<SupabaseResult<unknown>>;
};
export type SupabaseClient = SupabaseFromClient & SupabaseRpcClient;
