<template>
  <section
    v-if="canEdit"
    class="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg backdrop-blur"
    data-testid="transfer-card"
  >
    <h4 class="text-sm font-semibold text-slate-700">同币种转账</h4>
    <div class="mt-4 flex flex-col gap-3 lg:flex-row">
      <input
        :value="transferAmount"
        type="number"
        min="0"
        step="0.01"
        placeholder="转账金额"
        class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        @input="onTransferAmountInput"
      />
      <select
        :value="transferTargetId"
        class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        @change="onTransferTargetChange"
      >
        <option value="">选择转入账户</option>
        <option
          v-for="account in transferTargets"
          :key="account.id"
          :value="account.id"
        >
          {{ account.ownerName }} - {{ account.name }}
        </option>
      </select>
    </div>
    <div class="mt-3">
      <input
        :value="transferNote"
        type="text"
        placeholder="备注（可选）"
        class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        @input="onTransferNoteInput"
      />
    </div>
    <p class="mt-3 text-xs text-slate-500">
      可转账余额：{{ formattedBalance }}
    </p>
    <button
      class="mt-3 rounded-2xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
      :disabled="loading"
      @click="onTransfer"
    >
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
