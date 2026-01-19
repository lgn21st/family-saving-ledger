<template>
  <div class="flex flex-wrap items-center justify-between gap-4">
    <div>
      <template v-if="isEditing">
        <div class="flex flex-col gap-2">
          <input
            v-model="editingNameModel"
            type="text"
            class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-base font-semibold text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <div class="flex gap-2">
            <button
              type="button"
              class="rounded-full bg-emerald-100 px-4 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-200"
              :disabled="loading"
              @click="onUpdateAccount"
            >
              保存名称
            </button>
            <button
              type="button"
              class="rounded-full bg-slate-200 px-4 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-300"
              :disabled="loading"
              @click="onCancelEditAccount"
            >
              取消
            </button>
          </div>
        </div>
      </template>
      <template v-else>
        <h3 class="text-lg font-semibold text-slate-800">
          {{ selectedAccountName }}
        </h3>
        <p class="text-sm text-slate-500">
          币种 {{ selectedAccountCurrency }} · 余额 {{ formattedBalance }}
        </p>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  isEditing: boolean;
  editingAccountName: string;
  loading: boolean;
  selectedAccountName: string;
  selectedAccountCurrency: string;
  formattedBalance: string;
  onUpdateAccount: () => void;
  onCancelEditAccount: () => void;
}>();

const emit = defineEmits<{
  (event: "update:editingAccountName", value: string): void;
}>();

const editingNameModel = computed({
  get: () => props.editingAccountName,
  set: (value) => emit("update:editingAccountName", value),
});
</script>
