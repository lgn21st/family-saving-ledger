<template>
  <section v-if="canEdit" class="surface-card h-full p-5 sm:p-6" aria-labelledby="adjustment-title">
    <p class="section-kicker">快捷操作</p>
    <h3 id="adjustment-title" class="mt-1 section-title">新增/扣减</h3>
    <p class="mt-1 truncate text-sm text-slate-500">
      {{ selectedChildName }} · {{ selectedAccountName ?? "未选择账户" }}
    </p>

    <div class="mt-5 space-y-3">
      <div>
        <label for="transaction-amount" class="field-label">金额</label>
        <input
          id="transaction-amount"
          :value="amountInput"
          name="transaction-amount"
          type="number"
          min="0"
          step="0.01"
          inputmode="decimal"
          autocomplete="off"
          placeholder="金额"
          class="app-input numeric"
          @input="onAmountInput"
        />
      </div>
      <div>
        <label for="transaction-note" class="field-label">备注</label>
        <input
          id="transaction-note"
          :value="noteInput"
          name="transaction-note"
          type="text"
          autocomplete="off"
          placeholder="备注（必填）"
          class="app-input"
          @input="onNoteInput"
        />
      </div>
    </div>
    <div class="mt-4 grid grid-cols-2 gap-2.5">
      <button
        type="button"
        class="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-[background-color,transform] hover:bg-emerald-700 focus-visible:ring-3 focus-visible:ring-emerald-100 focus-visible:outline-none active:translate-y-px disabled:opacity-55"
        :disabled="loading"
        @click="onAddTransaction('deposit')"
      >
        增加
      </button>
      <button
        type="button"
        class="inline-flex min-h-11 items-center justify-center rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition-[background-color,transform] hover:bg-rose-100 focus-visible:ring-3 focus-visible:ring-rose-100 focus-visible:outline-none active:translate-y-px disabled:opacity-55"
        :disabled="loading"
        @click="onAddTransaction('withdrawal')"
      >
        减少
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  canEdit: boolean;
  selectedChildName: string | null;
  selectedAccountName: string | null;
  amountInput: string;
  noteInput: string;
  loading: boolean;
  onAddTransaction: (type: "deposit" | "withdrawal") => void;
}>();

const emit = defineEmits<{
  (event: "update:amountInput", value: string): void;
  (event: "update:noteInput", value: string): void;
}>();

const onAmountInput = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  emit("update:amountInput", target?.value ?? "");
};

const onNoteInput = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  emit("update:noteInput", target?.value ?? "");
};
</script>
