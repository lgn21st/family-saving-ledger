<template>
  <ConfirmActionDialog
    title-id="note-dialog-title"
    description-id="note-dialog-description"
    kicker="交易备注"
    title="修改备注"
    :description="`${getTransactionContext?.(transaction) ?? '账户'} · ${formatSignedAmount(transaction)} · ${formatTimestamp(transaction.created_at)}`"
    :detail="transaction.related_account_id ? '转入和转出记录的备注会同步修改。' : ''"
    tone="primary"
    :confirm-label="latest ? '核对后保存' : '保存'"
    busy-label="保存中…"
    :confirm-disabled="!changed"
    :focus-input="true"
    :loading="saving"
    :on-cancel="onClose"
    :on-confirm="save"
  >
    <p v-if="snapshot.note_prefix" class="mt-4 break-words text-sm text-slate-500">{{ snapshot.note_prefix }}</p>
    <label for="transaction-note" class="mt-4 block text-sm font-medium text-slate-700">备注</label>
    <textarea id="transaction-note" v-model="draft" class="app-input mt-2 min-h-28 resize-y" :disabled="saving" />
    <div v-if="latest" class="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
      <p>最新备注：{{ editableNote(latest) || '（无备注）' }}</p>
      <p class="mt-1">你的输入已保留，请核对后再保存。</p>
      <button type="button" class="button-quiet mt-2 min-h-11" :disabled="saving" @click="useLatest">使用最新备注</button>
    </div>
    <p v-if="error" class="mt-3 text-sm text-rose-700" role="alert">{{ error }}</p>
  </ConfirmActionDialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import ConfirmActionDialog from "./ConfirmActionDialog.vue";
import type { Transaction, TransactionNoteResult, UpdateTransactionNoteInput } from "../types";

const props = defineProps<{
  transaction: Transaction;
  formatSignedAmount: (transaction: Transaction) => string;
  getTransactionContext?: (transaction: Transaction) => string;
  formatTimestamp: (value: string) => string;
  onUpdateNote: (input: UpdateTransactionNoteInput) => Promise<TransactionNoteResult>;
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
let active = true;
onBeforeUnmount(() => { active = false; });
const useLatest = () => {
  draft.value = editableNote(snapshot.value);
  latest.value = null;
  error.value = '';
};
const save = async () => {
  if (!changed.value || saving.value) return;
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
      }
    }
  } catch {
    if (active) error.value = '保存失败，请重试。';
  } finally {
    if (active) saving.value = false;
  }
};
</script>
