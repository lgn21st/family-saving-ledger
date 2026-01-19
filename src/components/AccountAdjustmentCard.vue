<template>
  <section
    v-if="canEdit"
    class="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg backdrop-blur"
  >
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h4 class="text-sm font-semibold text-slate-700">新增/扣减</h4>
      <span v-if="selectedChildName" class="text-xs font-semibold text-slate-400">
        当前：{{ selectedChildName }} · {{ selectedAccountName ?? "未选择账户" }}
      </span>
    </div>

    <div class="mt-4 flex flex-col gap-3 lg:flex-row">
      <input
        :value="amountInput"
        type="number"
        min="0"
        step="0.01"
        placeholder="金额"
        class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        @input="onAmountInput"
      />
      <input
        :value="noteInput"
        type="text"
        placeholder="备注（必填）"
        class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        @input="onNoteInput"
      />
    </div>
    <div class="mt-3 flex flex-wrap gap-3">
      <button
        class="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="loading"
        @click="onAddTransaction('deposit')"
      >
        增加
      </button>
      <button
        class="rounded-2xl bg-rose-400 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
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
