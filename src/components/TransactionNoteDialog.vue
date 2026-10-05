<template>
  <ConfirmActionDialog
    title-id="note-dialog-title"
    description-id="note-dialog-description"
    kicker="交易备注"
    :title="readOnly ? '备注修改记录' : '修改备注'"
    :description="`${getTransactionContext?.(transaction) ?? '账户'} · ${formatSignedAmount(transaction)} · ${formatTimestamp(transaction.created_at)}`"
    :detail="!readOnly && transaction.related_account_id ? '转入和转出记录的备注会同步修改。' : ''"
    tone="primary"
    :confirm-label="latest ? '核对后保存' : '保存'"
    busy-label="保存中…"
    :cancel-label="readOnly ? '关闭' : '取消'"
    :hide-confirm="readOnly"
    :confirm-disabled="!changed"
    :focus-input="!readOnly"
    :loading="saving"
    :on-cancel="onClose"
    :on-confirm="save"
  >
    <template v-if="!readOnly">
      <p v-if="snapshot.note_prefix" class="mt-4 break-words text-sm text-slate-500">{{ snapshot.note_prefix }}</p>
      <label for="transaction-note" class="mt-4 block text-sm font-medium text-slate-700">备注</label>
      <textarea id="transaction-note" v-model="draft" class="app-input mt-2 min-h-28 resize-y" :disabled="saving" />
      <div v-if="latest" class="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
        <p>最新备注：{{ editableNote(latest) || '（无备注）' }}</p>
        <p class="mt-1">你的输入已保留，请核对后再保存。</p>
        <button type="button" class="button-quiet mt-2 min-h-11" :disabled="saving" @click="useLatest">使用最新备注</button>
      </div>
      <p v-if="error" class="mt-3 text-sm text-rose-700" role="alert">{{ error }}</p>
    </template>
    <div v-if="readOnly || (snapshot.note_revision ?? 0) > 0" class="mt-4 border-t border-slate-100 pt-4">
      <h3 v-if="!readOnly" class="text-sm font-semibold text-slate-700">修改记录</h3>
      <p v-if="historyLoading" class="text-sm text-slate-500" role="status">正在加载修改记录…</p>
      <div v-else-if="historyError">
        <p class="text-sm text-rose-700" role="alert">{{ historyError }}</p>
        <button type="button" class="button-secondary mt-2" @click="loadHistory">重试加载</button>
      </div>
      <ol v-else class="space-y-4">
        <li v-for="edit in edits" :key="edit.id" class="rounded-xl bg-slate-50 p-3 text-sm">
          <p class="text-xs text-slate-500">{{ edit.updated_by_name }} · {{ formatTimestamp(edit.updated_at) }}</p>
          <dl class="mt-2 space-y-2 break-words">
            <div><dt class="text-xs text-slate-500">修改前</dt><dd>{{ edit.old_note || '（无备注）' }}</dd></div>
            <div><dt class="text-xs text-slate-500">修改后</dt><dd>{{ edit.new_note || '（无备注）' }}</dd></div>
          </dl>
        </li>
      </ol>
      <p v-if="!historyLoading && !historyError && edits.length === 0" class="text-sm text-slate-500">暂无修改记录。</p>
    </div>
  </ConfirmActionDialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import ConfirmActionDialog from "./ConfirmActionDialog.vue";
import type { Transaction, TransactionNoteEdit, TransactionNoteResult, UpdateTransactionNoteInput, NoteHistoryResult } from "../types";

const props = defineProps<{
  transaction: Transaction;
  readOnly?: boolean;
  formatSignedAmount: (transaction: Transaction) => string;
  getTransactionContext?: (transaction: Transaction) => string;
  formatTimestamp: (value: string) => string;
  onUpdateNote?: (input: UpdateTransactionNoteInput) => Promise<TransactionNoteResult>;
  onLoadNoteHistory?: (transactionId: string) => Promise<NoteHistoryResult>;
  onClose: () => void;
}>();
// The migration/RPC provides the separated transfer note; never parse account names here.
const editableNote = (row: Transaction) => row.user_note ?? (row.related_account_id ? '' : row.note ?? '');
const snapshot = ref(props.transaction);
const draft = ref(editableNote(props.transaction));
const latest = ref<Transaction | null>(null);
const changed = computed(() => draft.value.trim() !== editableNote(snapshot.value).trim());
const saving = ref(false);
const error = ref('');
const edits = ref<TransactionNoteEdit[]>([]);
const historyLoading = ref(false);
const historyError = ref('');
let active = true;
onBeforeUnmount(() => { active = false; });
const loadHistory = async () => {
  if (!props.onLoadNoteHistory || historyLoading.value) return;
  historyLoading.value = true;
  historyError.value = '';
  try {
    const result = await props.onLoadNoteHistory(props.transaction.id);
    if (!active) return;
    if (result.ok) edits.value = result.edits;
    else historyError.value = result.message;
  } catch {
    if (active) historyError.value = '修改记录加载失败，请重试。';
  } finally {
    if (active) historyLoading.value = false;
  }
};
onMounted(() => {
  if (props.readOnly || (snapshot.value.note_revision ?? 0) > 0) void loadHistory();
});
const useLatest = () => {
  draft.value = editableNote(snapshot.value);
  latest.value = null;
  error.value = '';
};
const save = async () => {
  if (!changed.value || saving.value || !props.onUpdateNote) return;
  saving.value = true;
  error.value = '';
  try {
    const result = await props.onUpdateNote({
      transactionId: snapshot.value.id,
      note: draft.value.trim(),
      expectedRevision: snapshot.value.note_revision ?? 0,
    });
    if (!active) return;
    if (result.ok) props.onClose();
    else {
      error.value = result.message;
      if (result.latest) {
        snapshot.value = result.latest;
        latest.value = result.latest;
        void loadHistory();
      }
    }
  } catch {
    if (active) error.value = '保存失败，请重试。';
  } finally {
    if (active) saving.value = false;
  }
};
</script>
