<template>
  <section class="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg backdrop-blur">
    <h4 class="text-sm font-semibold text-slate-700">交易记录</h4>
    <p v-if="transactions.length === 0" class="mt-3 text-sm text-slate-500">
      暂无交易。
    </p>
    <template v-else>
      <ul class="mt-4 space-y-3">
        <li
          v-for="transaction in transactions"
          :key="transaction.id"
          class="flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-slate-700"
        >
          <TransactionIcon :type="transaction.type" />
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <div>
                <span class="font-semibold">{{
                  transactionLabels[transaction.type]
                }}</span>
                <span class="ml-2 text-slate-500">{{
                  getTransactionNote(transaction)
                }}</span>
              </div>
              <span
                :class="[
                  'font-semibold flex-shrink-0 whitespace-nowrap text-right',
                  transactionTone(transaction),
                ]"
              >
                {{ formatSignedAmount(transaction) }}
              </span>
            </div>
            <div class="mt-2 text-xs text-slate-400">
              {{ formatTimestamp(transaction.created_at) }}
            </div>
          </div>
        </li>
      </ul>
      <button
        v-if="hasMore"
        class="mt-4 w-full rounded-2xl border border-brand-200 bg-white/80 px-4 py-2 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="loading"
        @click="onLoadMore"
      >
        {{ loading ? "加载中..." : "加载更多" }}
      </button>
    </template>
  </section>
</template>

<script setup lang="ts">
import { toRefs } from "vue";
import TransactionIcon from "./TransactionIcon.vue";

type Transaction = {
  id: string;
  account_id: string;
  type: "deposit" | "withdrawal" | "transfer_in" | "transfer_out" | "interest";
  amount: number;
  currency: string;
  note: string | null;
  related_account_id: string | null;
  created_by: string;
  created_at: string;
};

const props = defineProps<{
  transactions: Transaction[];
  hasMore: boolean;
  loading: boolean;
  transactionLabels: Record<Transaction["type"], string>;
  formatSignedAmount: (transaction: Transaction) => string;
  transactionTone: (transaction: Transaction) => string;
  getTransactionNote: (transaction: Transaction) => string;
  formatTimestamp: (value: string) => string;
  onLoadMore: () => void;
}>();

const {
  transactions,
  hasMore,
  loading,
  transactionLabels,
  formatSignedAmount,
  transactionTone,
  getTransactionNote,
  formatTimestamp,
  onLoadMore,
} = toRefs(props);
</script>
