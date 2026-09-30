import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import type { Account, Transaction, SupabaseFilterBuilder } from '../types';

type QueryResult = Awaited<SupabaseFilterBuilder<unknown>>;
export const queryMock = (read: () => QueryResult | PromiseLike<QueryResult>) => {
  const then: SupabaseFilterBuilder<unknown>['then'] = (resolve, reject) =>
    Promise.resolve().then(read).then(resolve, reject);
  const query = {
    eq: vi.fn<SupabaseFilterBuilder<unknown>['eq']>((): SupabaseFilterBuilder<unknown> => query),
    gte: vi.fn<SupabaseFilterBuilder<unknown>['gte']>((): SupabaseFilterBuilder<unknown> => query),
    in: vi.fn<SupabaseFilterBuilder<unknown>['in']>((): SupabaseFilterBuilder<unknown> => query),
    order: vi.fn<SupabaseFilterBuilder<unknown>['order']>((): SupabaseFilterBuilder<unknown> => query),
    range: vi.fn<SupabaseFilterBuilder<unknown>['range']>((): SupabaseFilterBuilder<unknown> => query),
    limit: vi.fn<SupabaseFilterBuilder<unknown>['limit']>((): SupabaseFilterBuilder<unknown> => query),
    maybeSingle: vi.fn(async () => { const result = await read(); return { ...result, data: result.data?.[0] ?? null }; }),
    then,
  } satisfies SupabaseFilterBuilder<unknown>;
  return query;
};
export const accountFixture = (values: Partial<Account> = {}): Account => ({
  id: 'acc-1', name: '日常', currency: 'CNY', owner_child_id: 'child-1',
  created_by: 'parent', is_active: true, ...values,
});
export const transactionFixture = (values: Partial<Transaction> = {}): Transaction => ({
  id: 'txn-1', account_id: 'acc-1', type: 'deposit', amount: 1, currency: 'CNY',
  note: null, related_account_id: null, created_by: 'parent', created_at: new Date().toISOString(), ...values,
});
