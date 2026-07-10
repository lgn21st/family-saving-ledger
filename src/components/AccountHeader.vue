<template>
  <div class="mt-4 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
    <div class="min-w-0">
      <template v-if="isEditing">
        <label for="account-edit-name" class="mb-2 block text-sm font-medium text-slate-300">
          账户名称
        </label>
        <input
          id="account-edit-name"
          v-model="editingNameModel"
          name="account-name"
          type="text"
          autocomplete="off"
          class="app-input max-w-md"
        />
        <div class="mt-3 flex gap-2">
          <button
            type="button"
            class="button-primary min-h-10 bg-white px-4 py-2 text-slate-950 hover:bg-slate-100"
            :disabled="loading"
            @click="onUpdateAccount"
          >
            保存名称
          </button>
          <button
            type="button"
            class="inline-flex min-h-10 items-center rounded-xl px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white focus-visible:ring-3 focus-visible:ring-white/20 focus-visible:outline-none"
            :disabled="loading"
            @click="onCancelEditAccount"
          >
            取消
          </button>
        </div>
      </template>
      <template v-else>
        <h2 class="truncate text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {{ selectedAccountName }}
        </h2>
        <p class="mt-2 text-sm text-slate-400">
          最近 30 天趋势与完整交易记录
        </p>
      </template>
    </div>
    <div v-if="!isEditing" class="shrink-0 sm:text-right">
      <p class="text-xs font-semibold tracking-[0.14em] text-slate-400 uppercase">
        当前余额 · {{ selectedAccountCurrency }}
      </p>
      <p class="numeric mt-1 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        {{ formattedBalance }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
const editingNameModel = defineModel<string>("editingAccountName", {
  required: true,
});

defineProps<{
  isEditing: boolean;
  loading: boolean;
  selectedAccountName: string;
  selectedAccountCurrency: string;
  formattedBalance: string;
  onUpdateAccount: () => void;
  onCancelEditAccount: () => void;
}>();
</script>
