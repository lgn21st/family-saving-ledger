<template>
  <section class="surface-card p-4 sm:p-5" aria-labelledby="asset-summary-title">
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="section-kicker">家庭总览</p>
        <h2 id="asset-summary-title" class="mt-1 text-base font-semibold text-slate-950">
          按币种资产
        </h2>
      </div>
      <span class="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        实时余额
      </span>
    </div>
    <dl class="mt-4 grid grid-cols-2 gap-2.5">
      <div
        v-for="(total, currency) in currencyTotals"
        :key="currency"
        class="rounded-2xl bg-slate-950 p-3.5 text-white"
      >
        <dt class="text-xs font-semibold tracking-wide text-slate-400">
          {{ currency }} 资产总览
        </dt>
        <dd class="numeric mt-2 truncate text-lg font-semibold tracking-tight sm:text-xl">
          {{ formatAmount(total, currency) }}
        </dd>
      </div>
    </dl>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  currencyTotals: Record<string, number>;
  formatAmount: (amount: number, currency: string) => string;
}>();
</script>
