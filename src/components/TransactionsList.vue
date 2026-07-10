<template>
  <section class="surface-card p-5 sm:p-6" aria-labelledby="transactions-title">
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="section-kicker">账户明细</p>
        <h3 id="transactions-title" class="mt-1 section-title">交易记录</h3>
      </div>
      <span class="numeric rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
        {{ transactions.length }} 笔已加载
      </span>
    </div>

    <div v-if="transactions.length === 0" class="mt-5 rounded-2xl bg-slate-50 px-5 py-10 text-center">
      <p class="text-sm font-medium text-slate-600">暂无交易</p>
      <p class="mt-1 text-xs text-slate-400">记录第一笔收支后会显示在这里。</p>
    </div>
    <template v-else>
      <ul class="mt-5 divide-y divide-slate-100">
        <li
          v-for="transaction in transactions"
          :key="transaction.id"
          :class="[
            'group flex items-start gap-3 py-4 sm:gap-4',
            transaction.is_void ? 'opacity-55' : '',
          ]"
          @pointerdown="startLongPress(transaction, $event)"
          @pointerup="cancelLongPress"
          @pointercancel="cancelLongPress"
          @pointerleave="cancelLongPress"
          @pointermove="handlePointerMove($event)"
        >
          <TransactionIcon :type="transaction.type" />
          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span
                    :class="[
                      'text-sm font-semibold text-slate-900',
                      transaction.is_void ? 'line-through' : '',
                    ]"
                  >
                    {{ transactionLabels[transaction.type] }}
                  </span>
                  <span
                    v-if="transaction.is_void"
                    class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600"
                  >
                    已作废
                  </span>
                </div>
                <p
                  :class="[
                    'mt-1 break-words text-sm leading-6 text-slate-500',
                    transaction.is_void ? 'line-through' : '',
                  ]"
                >
                  {{ getTransactionNote(transaction) }}
                </p>
                <time class="mt-1.5 block text-xs text-slate-400" :datetime="transaction.created_at">
                  {{ formatTimestamp(transaction.created_at) }}
                </time>
              </div>
              <div class="shrink-0 text-right">
                <span
                  :class="[
                    'numeric block whitespace-nowrap text-sm font-semibold',
                    transactionTone(transaction),
                    transaction.is_void ? 'line-through text-slate-400' : '',
                  ]"
                >
                  {{ formatSignedAmount(transaction) }}
                </span>
                <button
                  v-if="canVoid && !transaction.is_void"
                  type="button"
                  class="mt-2 rounded-lg px-2 py-1 text-xs font-medium text-slate-400 opacity-100 transition-[background-color,color,opacity] hover:bg-rose-50 hover:text-rose-700 focus-visible:ring-3 focus-visible:ring-rose-100 focus-visible:outline-none sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                  @pointerdown.stop
                  @click="requestVoid(transaction)"
                >
                  撤销交易
                </button>
              </div>
            </div>
          </div>
        </li>
      </ul>
      <button
        v-if="hasMore"
        type="button"
        class="button-secondary mt-4 w-full"
        :disabled="loading"
        @click="onLoadMore"
      >
        {{ loading ? "加载中…" : "加载更多" }}
      </button>
    </template>

    <div
      v-if="confirmingTransaction"
      class="fixed inset-0 z-[80] flex items-center justify-center overscroll-contain bg-slate-950/55 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="void-dialog-title"
      aria-describedby="void-dialog-description"
      @keydown.esc="cancelConfirm"
    >
      <div class="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <p class="section-kicker text-rose-600">不可直接删除</p>
        <h4 id="void-dialog-title" class="mt-2 text-xl font-semibold text-slate-950">
          撤销这笔交易？
        </h4>
        <p id="void-dialog-description" class="mt-2 text-sm leading-6 text-slate-600">
          确认撤销这笔交易？该操作会影响当前余额。
        </p>
        <p class="mt-2 text-sm leading-6 text-slate-500">
          交易会标记为已作废；如果是转账，对应的另一笔记录也会同时撤销。
        </p>
        <div class="mt-6 grid grid-cols-2 gap-3">
          <button type="button" class="button-secondary" @click="cancelConfirm">取消</button>
          <button type="button" class="button-danger bg-rose-600 text-white hover:bg-rose-700" @click="confirmVoid">
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
  canVoid,
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

const requestVoid = (transaction: Transaction) => {
  if (!canVoid?.value || transaction.is_void) return;
  confirmingTransaction.value = transaction;
};

const startLongPress = (transaction: Transaction, event: PointerEvent) => {
  if (!canVoid?.value || transaction.is_void) return;
  pressTargetId.value = transaction.id;
  startX.value = event.clientX;
  startY.value = event.clientY;
  clearPressTimer();
  pressTimer.value = window.setTimeout(() => {
    pressTimer.value = null;
    if (pressTargetId.value === transaction.id) requestVoid(transaction);
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
  if (deltaX > MOVE_THRESHOLD || deltaY > MOVE_THRESHOLD) cancelLongPress();
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
