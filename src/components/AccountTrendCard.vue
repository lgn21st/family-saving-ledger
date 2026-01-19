<template>
  <div class="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg backdrop-blur">
    <div class="flex items-center justify-between">
      <div>
        <h4 class="text-sm font-semibold text-slate-700">近 30 天余额趋势</h4>
        <p class="text-xs text-slate-400">按日累计余额</p>
      </div>
      <span class="text-xs font-semibold text-brand-600">{{ currency }}</span>
    </div>
    <div class="mt-4 h-32">
      <svg v-if="chartPath" viewBox="0 0 100 100" class="h-full w-full">
        <path
          :d="chartPath"
          fill="none"
          stroke="url(#sparkline)"
          stroke-width="3"
          stroke-linecap="round"
        />
        <defs>
          <linearGradient id="sparkline" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stop-color="#f97316" />
            <stop offset="50%" stop-color="#a855f7" />
            <stop offset="100%" stop-color="#38bdf8" />
          </linearGradient>
        </defs>
      </svg>
      <p v-else class="text-sm text-slate-400">暂无数据</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  chartPath: string;
  currency: string;
}>();
</script>
