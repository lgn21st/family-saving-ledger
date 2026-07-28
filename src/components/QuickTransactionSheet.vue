<template>
  <Teleport to="body">
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
          <p class="mt-1 text-sm text-slate-500">{{ modeDescription }}</p>
        </div>
        <button type="button" class="button-quiet min-h-10" @click="onClose">关闭</button>
      </div>

      <div
        v-if="successDetails"
        class="mt-8 text-center"
        role="status"
        aria-live="polite"
      >
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700">
          ✓
        </div>
        <h3 class="mt-4 text-xl font-semibold text-slate-950">
          {{ successDetails.actionLabel }} {{ successDetails.formattedAmount }}
        </h3>
        <p class="mt-2 text-sm text-slate-500">{{ successDetails.accountLabel }}</p>
        <div class="mt-5 rounded-2xl bg-slate-950 px-4 py-4 text-white">
          <p class="text-xs font-medium text-slate-400">当前余额</p>
          <p class="numeric mt-1 text-lg font-semibold">{{ formattedBalance }}</p>
        </div>
        <div class="mt-6 grid grid-cols-2 gap-3">
          <button type="button" class="button-secondary min-h-12" @click="startAnotherEntry">
            再记一笔
          </button>
          <button
            ref="completeButton"
            type="button"
            class="button-primary min-h-12"
            @click="onClose"
          >
            完成
          </button>
        </div>
      </div>

      <template v-else>
      <div class="mt-5 grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1" aria-label="记账类型">
        <button
          v-for="option in modeOptions"
          :key="option.value"
          ref="modeControls"
          type="button"
          class="min-h-11 rounded-xl px-2 text-sm font-semibold transition"
          :class="mode === option.value ? option.activeClass : 'text-slate-500 hover:text-slate-900'"
          :aria-pressed="mode === option.value"
          :disabled="loading"
          @click="selectMode(option.value)"
        >
          {{ option.label }}
        </button>
      </div>

      <div class="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label for="quick-child" class="field-label">孩子</label>
          <select
            id="quick-child"
            class="app-input"
            :value="selectedChildId ?? ''"
            :disabled="loading"
            @change="handleChildChange"
          >
            <option value="" disabled>选择孩子</option>
            <option v-for="child in childUsers" :key="child.id" :value="child.id">
              {{ child.name }}
            </option>
          </select>
        </div>
        <div>
          <label for="quick-account" class="field-label">
            {{ mode === 'transfer' ? '转出账户' : '账户' }}
          </label>
          <select
            id="quick-account"
            class="app-input"
            :value="selectedAccountId ?? ''"
            :disabled="loading || !selectedChildId || selectedChildAccounts.length === 0"
            @change="handleAccountChange"
          >
            <option value="" disabled>选择账户</option>
            <option v-for="account in selectedChildAccounts" :key="account.id" :value="account.id">
              {{ account.name }} · {{ account.currency }}
            </option>
          </select>
        </div>
      </div>

      <div
        v-if="selectedAccountId"
        class="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-slate-950 px-4 py-3 text-white"
      >
        <span class="text-xs font-medium text-slate-400">
          {{ mode === 'transfer' ? '可转出余额' : '操作前余额' }}
        </span>
        <strong class="numeric text-sm">{{ formattedBalance }}</strong>
      </div>

      <div class="mt-4 space-y-4">
        <div>
          <label for="quick-amount" class="field-label">{{ amountLabel }}</label>
          <div class="relative">
            <input
              id="quick-amount"
              :value="activeAmount"
              name="quick-amount"
              type="number"
              min="0"
              step="0.01"
              inputmode="decimal"
              autocomplete="off"
              placeholder="0.00"
              class="app-input numeric h-14 pr-16 text-xl font-semibold"
              :disabled="loading"
              @input="onAmountInput"
            />
            <span class="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xs font-semibold text-slate-400">
              {{ selectedAccountCurrency }}
            </span>
          </div>
        </div>

        <div v-if="mode === 'transfer'">
          <label for="quick-transfer-target" class="field-label">转入账户</label>
          <select
            id="quick-transfer-target"
            :value="transferTargetId"
            class="app-input"
            :disabled="loading || !selectedAccountId || transferTargets.length === 0"
            @change="onTransferTargetChange"
          >
            <option value="">{{ transferTargetPlaceholder }}</option>
            <option v-for="account in transferTargets" :key="account.id" :value="account.id">
              {{ account.ownerName }} · {{ account.name }} · {{ account.currency }}
            </option>
          </select>
          <p class="mt-1.5 text-xs text-slate-400">仅显示与转出账户币种相同的其他账户。</p>
        </div>

        <div>
          <label for="quick-note" class="field-label">
            <template v-if="mode === 'transfer'">备注（可选）</template>
            <template v-else>用途或备注<span aria-hidden="true">（必填）</span></template>
          </label>
          <input
            id="quick-note"
            :value="activeNote"
            name="quick-note"
            type="text"
            autocomplete="off"
            :placeholder="notePlaceholder"
            class="app-input"
            :disabled="loading"
            @input="onNoteInput"
          />
        </div>
      </div>

      <button
        type="button"
        class="mt-6 min-h-12 w-full rounded-2xl px-5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
        :class="submitClass"
        :disabled="submitDisabled"
        @click="submit"
      >
        {{ loading ? '正在保存…' : submitLabel }}
      </button>
      <p v-if="submitDisabledReason && !loading" class="mt-2 text-center text-xs text-slate-500">
        {{ submitDisabledReason }}
      </p>
      <p
        v-if="submissionError"
        class="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800"
        role="alert"
      >
        {{ submissionError }}
      </p>
      </template>
    </section>
  </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";

import type { Account, AppUser, LedgerActionResult, TransferTarget } from "../types";

type EntryMode = "deposit" | "withdrawal" | "transfer";

const props = defineProps<{
  childUsers: AppUser[];
  selectedChildId: string | null;
  selectedChildAccounts: Account[];
  selectedAccountId: string | null;
  amountInput: string;
  noteInput: string;
  transferAmount: string;
  transferTargetId: string;
  transferNote: string;
  transferTargets: TransferTarget[];
  formattedBalance: string;
  loading: boolean;
  onSelectChild: (id: string) => void;
  onSelectAccount: (id: string) => void;
  onAddTransaction: (type: "deposit" | "withdrawal") => Promise<LedgerActionResult>;
  onTransfer: () => Promise<LedgerActionResult>;
  onClose: () => void;
}>();

const emit = defineEmits<{
  (event: "update:amountInput", value: string): void;
  (event: "update:noteInput", value: string): void;
  (event: "update:transferAmount", value: string): void;
  (event: "update:transferTargetId", value: string): void;
  (event: "update:transferNote", value: string): void;
}>();

const mode = ref<EntryMode>("deposit");
const panelElement = ref<HTMLElement | null>(null);
const modeControls = ref<HTMLButtonElement[]>([]);
const completeButton = ref<HTMLButtonElement | null>(null);
const submissionError = ref<string | null>(null);
const successDetails = ref<{
  actionLabel: string;
  formattedAmount: string;
  accountLabel: string;
} | null>(null);
let previousBodyOverflow = "";
let appRoot: HTMLElement | null = null;
let appWasInert = false;
let previousAppAriaHidden: string | null = null;

const modeOptions: Array<{ value: EntryMode; label: string; activeClass: string }> = [
  { value: "deposit", label: "存入", activeClass: "bg-emerald-600 text-white shadow-sm" },
  { value: "withdrawal", label: "取出", activeClass: "bg-rose-600 text-white shadow-sm" },
  { value: "transfer", label: "转账", activeClass: "bg-sky-600 text-white shadow-sm" },
];
const selectedAccount = computed(() =>
  props.selectedChildAccounts.find((account) => account.id === props.selectedAccountId),
);
const selectedAccountCurrency = computed(() => selectedAccount.value?.currency ?? "");
const activeAmount = computed(() =>
  mode.value === "transfer" ? props.transferAmount : props.amountInput,
);
const activeNote = computed(() =>
  mode.value === "transfer" ? props.transferNote : props.noteInput,
);
const modeDescription = computed(() => successDetails.value
  ? "交易已保存，并已更新账户余额。"
  : ({
      deposit: "为当前账户增加一笔收入。",
      withdrawal: "记录一笔支出，并检查余额是否充足。",
      transfer: "从当前账户转到另一个同币种账户。",
    })[mode.value]);
const amountLabel = computed(() => ({ deposit: "存入金额", withdrawal: "取出金额", transfer: "转账金额" })[mode.value]);
const notePlaceholder = computed(() => mode.value === "transfer" ? "例如：转入教育金" : "例如：零花钱、奖励、购买文具");
const transferTargetPlaceholder = computed(() =>
  props.transferTargets.length > 0 ? "选择转入账户" : "没有可用的同币种账户",
);
const submitLabel = computed(() => ({ deposit: "确认存入", withdrawal: "确认取出", transfer: "确认转账" })[mode.value]);
const submitClass = computed(() => ({
  deposit: "bg-emerald-600 hover:bg-emerald-700",
  withdrawal: "bg-rose-600 hover:bg-rose-700",
  transfer: "bg-sky-600 hover:bg-sky-700",
})[mode.value]);
const submitDisabled = computed(() =>
  props.loading || !props.selectedChildId || !props.selectedAccountId ||
  !activeAmount.value || Number(activeAmount.value) <= 0 ||
  (mode.value !== "transfer" && !activeNote.value.trim()) ||
  (mode.value === "transfer" && !props.transferTargetId),
);
const submitDisabledReason = computed(() => {
  if (!props.selectedChildId) return "请先选择孩子。";
  if (!props.selectedAccountId) return "请先选择账户。";
  if (!activeAmount.value || Number(activeAmount.value) <= 0) return "请输入大于 0 的金额。";
  if (mode.value !== "transfer" && !activeNote.value.trim()) return "请填写用途或备注。";
  if (mode.value === "transfer" && !props.transferTargetId) return "请选择转入账户。";
  return null;
});

onMounted(async () => {
  previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  appRoot = document.getElementById("app");
  if (appRoot) {
    appWasInert = appRoot.hasAttribute("inert");
    previousAppAriaHidden = appRoot.getAttribute("aria-hidden");
    appRoot.setAttribute("inert", "");
    appRoot.setAttribute("aria-hidden", "true");
  }
  await nextTick();
  modeControls.value[0]?.focus();
});

onBeforeUnmount(() => {
  document.body.style.overflow = previousBodyOverflow;
  if (!appRoot) return;
  if (!appWasInert) appRoot.removeAttribute("inert");
  if (previousAppAriaHidden === null) appRoot.removeAttribute("aria-hidden");
  else appRoot.setAttribute("aria-hidden", previousAppAriaHidden);
});

const handleChildChange = (event: Event) => {
  submissionError.value = null;
  const value = (event.target as HTMLSelectElement | null)?.value;
  if (value) props.onSelectChild(value);
};
const handleAccountChange = (event: Event) => {
  submissionError.value = null;
  const value = (event.target as HTMLSelectElement | null)?.value;
  if (value) props.onSelectAccount(value);
};
const onAmountInput = (event: Event) => {
  submissionError.value = null;
  const value = (event.target as HTMLInputElement | null)?.value ?? "";
  if (mode.value === "transfer") emit("update:transferAmount", value);
  else emit("update:amountInput", value);
};
const onNoteInput = (event: Event) => {
  submissionError.value = null;
  const value = (event.target as HTMLInputElement | null)?.value ?? "";
  if (mode.value === "transfer") emit("update:transferNote", value);
  else emit("update:noteInput", value);
};
const onTransferTargetChange = (event: Event) => {
  submissionError.value = null;
  emit("update:transferTargetId", (event.target as HTMLSelectElement | null)?.value ?? "");
};
const selectMode = (nextMode: EntryMode) => {
  submissionError.value = null;
  mode.value = nextMode;
};
const submit = async () => {
  submissionError.value = null;
  const submittedMode = mode.value;
  const amount = Number.parseFloat(activeAmount.value);
  const sourceAccount = selectedAccount.value;
  const childName = props.childUsers.find(
    (child) => child.id === props.selectedChildId,
  )?.name;
  const transferTarget = props.transferTargets.find(
    (account) => account.id === props.transferTargetId,
  );
  const result = submittedMode === "transfer"
    ? await props.onTransfer()
    : await props.onAddTransaction(submittedMode);

  if (!result.ok) {
    submissionError.value = result.message;
    return;
  }

  const sourceLabel = [childName, sourceAccount?.name].filter(Boolean).join(" · ");
  const targetLabel = transferTarget
    ? `${transferTarget.ownerName} · ${transferTarget.name}`
    : "";
  successDetails.value = {
    actionLabel: ({ deposit: "已存入", withdrawal: "已取出", transfer: "已转账" })[
      submittedMode
    ],
    formattedAmount: `${amount.toFixed(2)} ${sourceAccount?.currency ?? ""}`.trim(),
    accountLabel: submittedMode === "transfer"
      ? `${sourceLabel} → ${targetLabel}`
      : sourceLabel,
  };
  await nextTick();
  completeButton.value?.focus();
};
const startAnotherEntry = async () => {
  successDetails.value = null;
  submissionError.value = null;
  await nextTick();
  panelElement.value?.querySelector<HTMLInputElement>("#quick-amount")?.focus();
};
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    event.preventDefault();
    props.onClose();
    return;
  }
  if (event.key !== "Tab" || !panelElement.value) return;
  const controls = Array.from(panelElement.value.querySelectorAll<HTMLElement>(
    'button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
  ));
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
