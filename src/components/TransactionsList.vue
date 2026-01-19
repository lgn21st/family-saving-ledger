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
          :class="[
            'flex items-start gap-3 rounded-2xl px-4 py-3 text-sm',
            transaction.is_void ? 'bg-slate-50 text-slate-400' : 'bg-amber-50 text-slate-700',
          ]"
          @pointerdown="startLongPress(transaction, $event)"
          @pointerup="cancelLongPress"
          @pointercancel="cancelLongPress"
          @pointerleave="cancelLongPress"
          @pointermove="handlePointerMove($event)"
        >
          <TransactionIcon :type="transaction.type" />
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <div>
                <span
                  :class="['font-semibold', transaction.is_void ? 'line-through' : '']"
                >
                  {{ transactionLabels[transaction.type] }}
                </span>
                <span
                  :class="[
                    'ml-2',
                    transaction.is_void ? 'line-through text-slate-400' : 'text-slate-500',
                  ]"
                >
                  {{ getTransactionNote(transaction) }}
                </span>
                <span
                  v-if="transaction.is_void"
                  class="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600"
                >
                  已作废
                </span>
              </div>
              <span
                :class="[
                  'font-semibold flex-shrink-0 whitespace-nowrap text-right',
                  transactionTone(transaction),
                  transaction.is_void ? 'line-through text-slate-400' : '',
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

    <div
      v-if="confirmingTransaction"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
    >
      <div class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <h5 class="text-base font-semibold text-slate-800">撤销交易</h5>
        <p class="mt-2 text-sm text-slate-600">
          确认撤销这笔交易？该操作会影响当前余额。
        </p>
        <div class="mt-4 flex justify-end gap-2">
          <button
            class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            @click="cancelConfirm"
          >
            取消
          </button>
          <button
            class="rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600"
            @click="confirmVoid"
          >
            确认撤销
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, toRefs } from "vue";
import TransactionIcon from "./TransactionIcon.vue";
import type { Transaction } from "../types";

const props = defineProps<{
  transactions: Transaction[];
  hasMore: boolean;
  loading: boolean;
  canVoid?: boolean;
  transactionLabels: Record<Transaction["type"], string>;
  formatSignedAmount: (transaction: Transaction) => string;
  transactionTone: (transaction: Transaction) => string;
  getTransactionNote: (transaction: Transaction) => string;
  formatTimestamp: (value: string) => string;
  onLoadMore: () => void;
  onVoidTransaction?: (transaction: Transaction) => void;
}>();

const {
  transactions,
  hasMore,
  loading,
  canVoid,
  transactionLabels,
  formatSignedAmount,
  transactionTone,
  getTransactionNote,
  formatTimestamp,
  onLoadMore,
  onVoidTransaction,
} = toRefs(props);

const LONG_PRESS_MS = 600;
const MOVE_THRESHOLD = 10;
const pressTimer = ref<number | null>(null);
const pressTargetId = ref<string | null>(null);
const startX = ref(0);
const startY = ref(0);
const confirmingTransaction = ref<Transaction | null>(null);

const clearPressTimer = () => {
  if (pressTimer.value === null) return;
  window.clearTimeout(pressTimer.value);
  pressTimer.value = null;
};

const startLongPress = (transaction: Transaction, event: PointerEvent) => {
  if (!canVoid?.value || transaction.is_void) return;

  pressTargetId.value = transaction.id;
  startX.value = event.clientX;
  startY.value = event.clientY;
  clearPressTimer();

  pressTimer.value = window.setTimeout(() => {
    pressTimer.value = null;
    if (pressTargetId.value !== transaction.id) return;
    confirmingTransaction.value = transaction;
  }, LONG_PRESS_MS);
};

const cancelLongPress = () => {
  clearPressTimer();
  pressTargetId.value = null;
};

const handlePointerMove = (event: PointerEvent) => {
  if (pressTimer.value === null) return;
  const deltaX = Math.abs(event.clientX - startX.value);
  const deltaY = Math.abs(event.clientY - startY.value);
  if (deltaX > MOVE_THRESHOLD || deltaY > MOVE_THRESHOLD) {
    cancelLongPress();
  }
};

const cancelConfirm = () => {
  confirmingTransaction.value = null;
};

const confirmVoid = () => {
  if (confirmingTransaction.value && onVoidTransaction?.value) {
    onVoidTransaction.value(confirmingTransaction.value);
  }
  confirmingTransaction.value = null;
};
</script>
