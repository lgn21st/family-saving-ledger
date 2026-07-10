<template>
  <div
    class="fixed inset-0 z-[80] flex items-end bg-slate-950/55 backdrop-blur-sm sm:items-center sm:justify-center sm:px-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="quick-transaction-title"
    @click.self="onClose"
    @keydown="handleKeydown"
  >
    <section
      ref="panelElement"
      class="max-h-[92vh] w-full overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-[2rem] sm:p-6"
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="section-kicker">快捷记账</p>
          <h2 id="quick-transaction-title" class="mt-1 text-xl font-semibold text-slate-950">
            记一笔
          </h2>
          <p class="mt-1 text-sm text-slate-500">选择账户，输入金额和用途即可完成。</p>
        </div>
        <button type="button" class="button-quiet min-h-10" @click="onClose">关闭</button>
      </div>

      <div class="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label for="quick-child" class="field-label">孩子</label>
          <select
            id="quick-child"
            ref="firstControl"
            class="app-input"
            :value="selectedChildId ?? ''"
            @change="handleChildChange"
          >
            <option value="" disabled>选择孩子</option>
            <option v-for="child in childUsers" :key="child.id" :value="child.id">
              {{ child.name }}
            </option>
          </select>
        </div>
        <div>
          <label for="quick-account" class="field-label">账户</label>
          <select
            id="quick-account"
            class="app-input"
            :value="selectedAccountId ?? ''"
            :disabled="!selectedChildId || selectedChildAccounts.length === 0"
            @change="handleAccountChange"
          >
            <option value="" disabled>选择账户</option>
            <option
              v-for="account in selectedChildAccounts"
              :key="account.id"
              :value="account.id"
            >
              {{ account.name }} · {{ account.currency }}
            </option>
          </select>
        </div>
      </div>

      <div
        v-if="selectedAccountId"
        class="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-slate-950 px-4 py-3 text-white"
      >
        <span class="text-xs font-medium text-slate-400">操作前余额</span>
        <strong class="numeric text-sm">{{ formattedBalance }}</strong>
      </div>

      <div class="mt-4 space-y-4">
        <div>
          <label for="quick-amount" class="field-label">金额</label>
          <input
            id="quick-amount"
            :value="amountInput"
            name="quick-amount"
            type="number"
            min="0"
            step="0.01"
            inputmode="decimal"
            autocomplete="off"
            placeholder="0.00"
            class="app-input numeric h-14 text-xl font-semibold"
            @input="onAmountInput"
          />
        </div>
        <div>
          <label for="quick-note" class="field-label">用途或备注</label>
          <input
            id="quick-note"
            :value="noteInput"
            name="quick-note"
            type="text"
            autocomplete="off"
            placeholder="例如：零花钱、奖励、购买文具"
            class="app-input"
            @input="onNoteInput"
          />
        </div>
      </div>

      <div class="mt-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          class="button-primary bg-emerald-600 hover:bg-emerald-700"
          :disabled="loading || !selectedAccountId"
          @click="onAddTransaction('deposit')"
        >
          增加余额
        </button>
        <button
          type="button"
          class="button-danger min-h-11 bg-rose-50 hover:bg-rose-100"
          :disabled="loading || !selectedAccountId"
          @click="onAddTransaction('withdrawal')"
        >
          扣减余额
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";

import type { Account, AppUser } from "../types";

const props = defineProps<{
  childUsers: AppUser[];
  selectedChildId: string | null;
  selectedChildAccounts: Account[];
  selectedAccountId: string | null;
  amountInput: string;
  noteInput: string;
  formattedBalance: string;
  loading: boolean;
  onSelectChild: (id: string) => void;
  onSelectAccount: (id: string) => void;
  onAddTransaction: (type: "deposit" | "withdrawal") => void;
  onClose: () => void;
}>();

const emit = defineEmits<{
  (event: "update:amountInput", value: string): void;
  (event: "update:noteInput", value: string): void;
}>();

const panelElement = ref<HTMLElement | null>(null);
const firstControl = ref<HTMLSelectElement | null>(null);
let previousBodyOverflow = "";

onMounted(async () => {
  previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  await nextTick();
  firstControl.value?.focus();
});

onBeforeUnmount(() => {
  document.body.style.overflow = previousBodyOverflow;
});

const handleChildChange = (event: Event) => {
  const value = (event.target as HTMLSelectElement | null)?.value;
  if (value) props.onSelectChild(value);
};

const handleAccountChange = (event: Event) => {
  const value = (event.target as HTMLSelectElement | null)?.value;
  if (value) props.onSelectAccount(value);
};

const onAmountInput = (event: Event) => {
  emit("update:amountInput", (event.target as HTMLInputElement | null)?.value ?? "");
};

const onNoteInput = (event: Event) => {
  emit("update:noteInput", (event.target as HTMLInputElement | null)?.value ?? "");
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    event.preventDefault();
    props.onClose();
    return;
  }
  if (event.key !== "Tab" || !panelElement.value) return;

  const controls = Array.from(
    panelElement.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
  const first = controls[0];
  const last = controls[controls.length - 1];
  if (!first || !last) return;

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
};
</script>
