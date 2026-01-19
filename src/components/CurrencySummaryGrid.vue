<template>
  <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    <div
      v-for="(total, currency) in currencyTotals"
      :key="currency"
      class="rounded-3xl bg-white/90 p-5 text-center shadow-lg backdrop-blur"
    >
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {{ currency }} 资产总览
      </p>
      <p class="mt-3 text-3xl font-semibold text-slate-800">
        {{ formatAmount(total, currency) }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  currencyTotals: Record<string, number>;
  formatAmount: (amount: number, currency: string) => string;
}>();
</script>
