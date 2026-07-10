<template>
  <section
    v-if="canEdit"
    class="surface-card h-full p-5 sm:p-6"
    data-testid="transfer-card"
    aria-labelledby="transfer-title"
  >
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="section-kicker">账户之间</p>
        <h3 id="transfer-title" class="mt-1 section-title">同币种转账</h3>
      </div>
      <span class="numeric rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700">
        可用 {{ formattedBalance }}
      </span>
    </div>

    <div class="mt-5 space-y-3">
      <div>
        <label for="transfer-amount" class="field-label">转账金额</label>
        <input
          id="transfer-amount"
          :value="transferAmount"
          name="transfer-amount"
          type="number"
          min="0"
          step="0.01"
          inputmode="decimal"
          autocomplete="off"
          placeholder="转账金额"
          class="app-input numeric"
          @input="onTransferAmountInput"
        />
      </div>
      <div>
        <label for="transfer-target" class="field-label">转入账户</label>
        <select
          id="transfer-target"
          :value="transferTargetId"
          name="transfer-target"
          class="app-input"
          @change="onTransferTargetChange"
        >
          <option value="">选择转入账户</option>
          <option v-for="account in transferTargets" :key="account.id" :value="account.id">
            {{ account.ownerName }} - {{ account.name }}
          </option>
        </select>
      </div>
      <div>
        <label for="transfer-note" class="field-label">备注（可选）</label>
        <input
          id="transfer-note"
          :value="transferNote"
          name="transfer-note"
          type="text"
          autocomplete="off"
          placeholder="备注（可选）"
          class="app-input"
          @input="onTransferNoteInput"
        />
      </div>
    </div>
    <button type="button" class="button-primary mt-4 w-full" :disabled="loading" @click="onTransfer">
      确认转账
    </button>
  </section>
</template>

<script setup lang="ts">
import type { TransferTarget } from "../types";

defineProps<{
  canEdit: boolean;
  transferAmount: string;
  transferTargetId: string;
  transferNote: string;
  transferTargets: TransferTarget[];
  formattedBalance: string;
  loading: boolean;
  onTransfer: () => void;
}>();

const emit = defineEmits<{
  (event: "update:transferAmount", value: string): void;
  (event: "update:transferTargetId", value: string): void;
  (event: "update:transferNote", value: string): void;
}>();

const onTransferAmountInput = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  emit("update:transferAmount", target?.value ?? "");
};

const onTransferTargetChange = (event: Event) => {
  const target = event.target as HTMLSelectElement | null;
  emit("update:transferTargetId", target?.value ?? "");
};

const onTransferNoteInput = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  emit("update:transferNote", target?.value ?? "");
};
</script>
