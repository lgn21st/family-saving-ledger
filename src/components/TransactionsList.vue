<template>
  <section class="surface-card p-5 sm:p-6" aria-labelledby="transactions-title">
    <div
      :inert="Boolean(confirmingTransaction || noteTransaction) || undefined"
      :aria-hidden="confirmingTransaction || noteTransaction ? 'true' : undefined"
    >
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="section-kicker">账户明细</p>
        <h3 id="transactions-title" class="mt-1 section-title">交易记录</h3>
      </div>
      <span class="numeric rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
        {{ transactions.length }} 笔已加载
      </span>
    </div>

    <div v-if="transactions.length > 0" class="mt-5 grid gap-2 sm:grid-cols-[1fr_160px]">
      <label class="sr-only" for="transaction-search">搜索交易</label>
      <input
        id="transaction-search"
        ref="searchInput"
        v-model="searchTerm"
        type="search"
        name="transaction-search"
        autocomplete="off"
        placeholder="搜索备注、金额或类型"
        aria-describedby="transaction-search-scope"
        class="app-input"
      />
      <label class="sr-only" for="transaction-type-filter">交易类型</label>
      <select
        id="transaction-type-filter"
        v-model="typeFilter"
        name="transaction-type-filter"
        class="app-input"
      >
        <option value="all">全部类型</option>
        <option v-for="(label, type) in transactionLabels" :key="type" :value="type">
          {{ label }}
        </option>
      </select>
    </div>

    <div v-if="transactions.length > 0" class="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <p id="transaction-search-scope" class="text-xs leading-5 text-slate-500" role="status">
        <template v-if="hasFilters">找到 {{ filteredTransactions.length }} 笔 · </template>
        {{ hasMore ? '仅搜索已加载记录，可加载更多历史交易。' : '已加载全部交易记录。' }}
      </p>
      <button
        v-if="hasFilters && hasMore && onLoadAll"
        type="button"
        class="button-secondary min-h-11 text-xs"
        :disabled="loading"
        @click="searchAllHistory"
      >
        {{ loading ? '正在加载历史…' : '搜索全部历史' }}
      </button>
      <button v-if="hasFilters" type="button" class="button-quiet min-h-11 text-xs" @click="clearFilters">
        清除筛选
      </button>
    </div>

    <div v-if="transactions.length === 0 && loading" class="mt-5 rounded-2xl bg-slate-50 px-5 py-10 text-center" role="status">
      <p class="text-sm font-medium text-slate-600">正在加载交易记录…</p>
    </div>
    <div v-else-if="transactions.length === 0" class="mt-5 rounded-2xl bg-slate-50 px-5 py-10 text-center">
      <p class="text-sm font-medium text-slate-600">暂无交易</p>
      <p class="mt-1 text-xs text-slate-400">记录第一笔收支后会显示在这里。</p>
    </div>
    <template v-else>
      <div
        v-if="filteredTransactions.length === 0"
        class="mt-5 rounded-2xl bg-slate-50 px-5 py-10 text-center"
      >
        <p class="text-sm font-medium text-slate-600">{{ hasMore ? '已加载记录中没有匹配的交易' : '没有匹配的交易' }}</p>
        <p v-if="hasMore" class="mt-2 text-xs text-slate-500">试试加载更早的记录，或调整搜索条件。</p>
      </div>
      <ul v-else class="mt-5">
        <template v-for="(transaction, index) in filteredTransactions" :key="transaction.id">
          <li
            v-if="shouldShowMonth(transaction, index)"
            class="sticky top-0 z-10 border-y border-slate-100 bg-white/95 py-2 text-xs font-semibold text-slate-500 backdrop-blur"
          >
            {{ formatMonth(transaction.created_at) }}
          </li>
          <li
          :class="[
            'group flex items-start gap-3 border-b border-slate-100 py-4 sm:gap-4',
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
                <button
                  v-if="(transaction.note_revision ?? 0) > 0"
                  type="button"
                  class="button-quiet min-h-11 text-xs"
                  :aria-label="`查看备注修改记录：${getTransactionNote(transaction)}`"
                  @pointerdown.stop
                  @click="openNote(transaction, true)"
                >已修改</button>
                <time
                  class="mt-1.5 block text-xs text-slate-500"
                  :datetime="transaction.created_at"
                  :aria-label="formatTimestamp(transaction.created_at)"
                >
                  <span class="sm:hidden">{{ formatCompactTimestamp(transaction.created_at) }}</span>
                  <span class="hidden sm:inline">{{ formatTimestamp(transaction.created_at) }}</span>
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
                <div v-if="canVoid && !transaction.is_void" class="relative mt-1" data-transaction-actions>
                  <button
                    type="button"
                    class="button-quiet min-h-11 min-w-11 text-lg"
                    :aria-label="actionsLabel(transaction)"
                    :aria-expanded="menuTransactionId === transaction.id"
                    :aria-controls="`transaction-actions-${transaction.id}`"
                    :disabled="loading"
                    @pointerdown.stop
                    @click="openActions(transaction)"
                    @keydown.esc.stop.prevent="closeActions"
                  >⋯</button>
                  <div
                    v-if="menuTransactionId === transaction.id"
                    :id="`transaction-actions-${transaction.id}`"
                    role="group"
                    aria-label="交易操作"
                    class="absolute right-0 top-full z-20 w-44 rounded-xl border border-slate-200 bg-white p-1 text-left shadow-lg"
                    @pointerdown.stop
                    @keydown.esc.stop.prevent="closeActions"
                  >
                    <button
                      v-if="transaction.type !== 'interest'"
                      type="button"
                      class="button-quiet min-h-11 w-full justify-start rounded-lg text-left font-medium"
                      :disabled="!canEditNote(transaction)"
                      @click="openNote(transaction, false)"
                    >修改备注</button>
                    <p v-if="transaction.related_account_id && !canEditNote(transaction)" class="px-3 py-2 text-xs text-slate-500">旧备注无法自动分离</p>
                    <button
                      type="button"
                      class="button-quiet min-h-11 w-full justify-start rounded-lg text-left font-medium text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                      @click="requestVoid(transaction)"
                    >撤销交易</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </li>
        </template>
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
    </div>

    <TransactionNoteDialog
      v-if="noteTransaction"
      :transaction="noteTransaction"
      :read-only="noteReadOnly"
      :format-signed-amount="formatSignedAmount"
      :get-transaction-context="getTransactionContext"
      :format-timestamp="formatTimestamp"
      :on-update-note="onUpdateNote"
      :on-load-note-history="onLoadNoteHistory"
      :on-close="closeNote"
    />
    <ConfirmActionDialog
      v-if="confirmingTransaction"
      title-id="void-dialog-title"
      description-id="void-dialog-description"
      kicker="不可直接删除"
      title="撤销这笔交易？"
      description="交易会标记为已作废，并影响当前余额。"
      :detail="confirmingTransaction.related_account_id ? '本次会同时撤销转出和转入两笔记录。' : ''"
      confirm-label="确认撤销"
      :loading="loading"
      :on-cancel="cancelConfirm"
      :on-confirm="confirmVoid"
    >
      <dl class="mt-4 space-y-3 rounded-2xl bg-slate-50 p-4 text-sm">
        <div>
          <dt class="text-xs text-slate-500">{{ confirmingTransaction.related_account_id ? '转出 → 转入' : '账户' }}</dt>
          <dd class="mt-1 break-words font-medium text-slate-900">{{ getTransactionContext?.(confirmingTransaction) ?? '账户信息不可用' }}</dd>
        </div>
        <div>
          <dt class="text-xs text-slate-500">{{ transactionLabels[confirmingTransaction.type] }}</dt>
          <dd class="numeric mt-1 font-semibold text-slate-950">{{ formatSignedAmount(confirmingTransaction) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-slate-500">备注</dt>
          <dd class="mt-1 break-words text-slate-700">{{ getTransactionNote(confirmingTransaction) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-slate-500">交易时间</dt>
          <dd class="mt-1 text-slate-700"><time :datetime="confirmingTransaction.created_at">{{ formatTimestamp(confirmingTransaction.created_at) }}</time></dd>
        </div>
      </dl>
    </ConfirmActionDialog>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, toRefs } from "vue";
import ConfirmActionDialog from "./ConfirmActionDialog.vue";
import TransactionNoteDialog from "./TransactionNoteDialog.vue";
import TransactionIcon from "./TransactionIcon.vue";
import type { Transaction, UpdateTransactionNoteInput, TransactionNoteResult, NoteHistoryResult } from "../types";

const props = defineProps<{
  transactions: Transaction[];
  hasMore: boolean;
  loading: boolean;
  canVoid?: boolean;
  transactionLabels: Record<Transaction["type"], string>;
  formatSignedAmount: (transaction: Transaction) => string;
  transactionTone: (transaction: Transaction) => string;
  getTransactionNote: (transaction: Transaction) => string;
  getTransactionContext?: (transaction: Transaction) => string;
  formatTimestamp: (value: string) => string;
  onLoadMore: () => void;
  onLoadAll?: () => void | Promise<void>;
  onUpdateNote?: (input: UpdateTransactionNoteInput) => Promise<TransactionNoteResult>;
  onLoadNoteHistory?: (transactionId: string) => Promise<NoteHistoryResult>;
  onVoidTransaction?: (transaction: Transaction) => void | Promise<void>;
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
const noteTransaction = ref<Transaction | null>(null);
const noteReadOnly = ref(false);
const menuTransactionId = ref<string | null>(null);
const canEditNote = (transaction: Transaction) => Boolean(props.onUpdateNote) &&
  !transaction.is_void && transaction.type !== 'interest' &&
  (!transaction.related_account_id || transaction.note_prefix != null);
const actionsLabel = (transaction: Transaction) =>
  `更多操作：${props.getTransactionNote(transaction)}，${props.formatSignedAmount(transaction)}，${formatCompactTimestamp(transaction.created_at)}`;
const restoreFocus = async () => {
  await nextTick();
  if (returnFocusElement.value?.isConnected) returnFocusElement.value.focus({ preventScroll: true });
  else searchInput.value?.focus({ preventScroll: true });
  returnFocusElement.value = null;
};
const openActions = async (transaction: Transaction) => {
  if (!canVoid?.value || props.loading || transaction.is_void) return;
  if (menuTransactionId.value === transaction.id) { closeActions(); return; }
  menuTransactionId.value = transaction.id;
  await nextTick();
  const menu = document.getElementById(`transaction-actions-${transaction.id}`);
  returnFocusElement.value = menu?.previousElementSibling as HTMLElement | null;
  menu?.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus({ preventScroll: true });
};
const closeActions = () => {
  menuTransactionId.value = null;
  void restoreFocus();
};
const dismissActions = (event: PointerEvent) => {
  if (menuTransactionId.value && event.target instanceof Element &&
    !event.target.closest('[data-transaction-actions]')) menuTransactionId.value = null;
};
onMounted(() => document.addEventListener('pointerdown', dismissActions));
onBeforeUnmount(() => document.removeEventListener('pointerdown', dismissActions));
const openNote = (transaction: Transaction, readOnly: boolean) => {
  if (!readOnly && (!canVoid?.value || !canEditNote(transaction))) return;
  if (menuTransactionId.value === null) returnFocusElement.value = document.activeElement as HTMLElement | null;
  menuTransactionId.value = null;
  noteReadOnly.value = readOnly;
  noteTransaction.value = transaction;
};
const closeNote = () => {
  noteTransaction.value = null;
  void restoreFocus();
};
const searchInput = ref<HTMLInputElement | null>(null);
const searchTerm = ref("");
const searchAllHistory = async () => {
  try {
    await props.onLoadAll?.();
  } finally {
    await nextTick();
    searchInput.value?.focus({ preventScroll: true });
  }
};
const typeFilter = ref<"all" | Transaction["type"]>("all");
const hasFilters = computed(() => Boolean(searchTerm.value.trim()) || typeFilter.value !== "all");
const returnFocusElement = ref<HTMLElement | null>(null);
const monthFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
});

const formatMonth = (value: string) => monthFormatter.format(new Date(value));
const compactTimestampFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const formatCompactTimestamp = (value: string) => compactTimestampFormatter.format(new Date(value));

const filteredTransactions = computed(() => {
  const query = searchTerm.value.trim().toLocaleLowerCase("zh-CN");
  return props.transactions.filter((transaction) => {
    if (typeFilter.value !== "all" && transaction.type !== typeFilter.value) return false;
    if (!query) return true;
    const searchable = [
      props.transactionLabels[transaction.type],
      props.getTransactionNote(transaction),
      props.formatSignedAmount(transaction),
      props.formatTimestamp(transaction.created_at),
    ]
      .join(" ")
      .toLocaleLowerCase("zh-CN");
    return searchable.includes(query);
  });
});

const shouldShowMonth = (transaction: Transaction, index: number) => {
  if (index === 0) return true;
  const previous = filteredTransactions.value[index - 1];
  return !previous || formatMonth(previous.created_at) !== formatMonth(transaction.created_at);
};

const clearFilters = () => {
  searchTerm.value = "";
  typeFilter.value = "all";
};

const clearPressTimer = () => {
  if (pressTimer.value === null) return;
  window.clearTimeout(pressTimer.value);
  pressTimer.value = null;
};

const requestVoid = (transaction: Transaction) => {
  if (!canVoid?.value || transaction.is_void) return;
  if (menuTransactionId.value === null) returnFocusElement.value = document.activeElement as HTMLElement | null;
  menuTransactionId.value = null;
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
    if (pressTargetId.value === transaction.id) void openActions(transaction);
  }, LONG_PRESS_MS);
};

const cancelLongPress = () => {
  clearPressTimer();
  pressTargetId.value = null;
};

onBeforeUnmount(cancelLongPress);

const handlePointerMove = (event: PointerEvent) => {
  if (pressTimer.value === null) return;
  const deltaX = Math.abs(event.clientX - startX.value);
  const deltaY = Math.abs(event.clientY - startY.value);
  if (deltaX > MOVE_THRESHOLD || deltaY > MOVE_THRESHOLD) cancelLongPress();
};

const cancelConfirm = async () => {
  confirmingTransaction.value = null;
  await restoreFocus();
};

const confirmVoid = async () => {
  if (confirmingTransaction.value && onVoidTransaction?.value) {
    await onVoidTransaction.value(confirmingTransaction.value);
  }
  confirmingTransaction.value = null;
  await restoreFocus();
};
</script>
