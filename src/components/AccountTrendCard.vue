<template>
  <section class="surface-card flex min-h-[360px] flex-col p-5 sm:p-6" aria-labelledby="trend-title">
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="section-kicker">余额变化</p>
        <h3 id="trend-title" class="mt-1 section-title">近 30 天趋势</h3>
        <p class="mt-1 text-sm text-slate-500">按日累计，清楚看到每次余额变化</p>
      </div>
      <span class="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700">
        {{ currency }}
      </span>
    </div>

    <template v-if="hasTrend">
      <dl class="mt-5 grid grid-cols-3 gap-2">
        <div class="rounded-xl bg-slate-50 px-3 py-2.5">
          <dt class="text-[11px] font-medium text-slate-500">本期变化</dt>
          <dd :class="['numeric mt-1 truncate text-sm font-semibold', changeTone]">
            {{ formattedChange }}
          </dd>
        </div>
        <div class="rounded-xl bg-slate-50 px-3 py-2.5">
          <dt class="text-[11px] font-medium text-slate-500">最高余额</dt>
          <dd class="numeric mt-1 truncate text-sm font-semibold text-slate-800">
            {{ formatBalance(maxBalance) }}
          </dd>
        </div>
        <div class="rounded-xl bg-slate-50 px-3 py-2.5">
          <dt class="text-[11px] font-medium text-slate-500">最低余额</dt>
          <dd class="numeric mt-1 truncate text-sm font-semibold text-slate-800">
            {{ formatBalance(minBalance) }}
          </dd>
        </div>
      </dl>

      <div class="mt-4 rounded-2xl border border-slate-100 bg-slate-50/80 px-3 pt-4 pb-3 sm:px-4">
        <svg
          viewBox="0 0 640 220"
          class="block h-auto w-full"
          role="img"
          :aria-label="chartDescription"
        >
          <defs>
            <linearGradient id="account-trend-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stop-color="#7c3aed" stop-opacity="0.28" />
              <stop offset="100%" stop-color="#7c3aed" stop-opacity="0.02" />
            </linearGradient>
            <filter id="account-trend-dot-shadow" x="-100%" y="-100%" width="300%" height="300%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#4c1d95" flood-opacity="0.24" />
            </filter>
          </defs>

          <g aria-hidden="true">
            <line
              v-for="gridY in gridLines"
              :key="gridY"
              x1="12"
              x2="628"
              :y1="gridY"
              :y2="gridY"
              stroke="#e2e8f0"
              stroke-width="1"
              stroke-dasharray="4 6"
            />
            <path :d="areaPath" fill="url(#account-trend-area)" />
            <path
              :d="linePath"
              fill="none"
              stroke="#7c3aed"
              stroke-width="4"
              stroke-linecap="round"
              stroke-linejoin="round"
              vector-effect="non-scaling-stroke"
            />
            <circle
              :cx="firstPlotPoint.x"
              :cy="firstPlotPoint.y"
              r="5"
              fill="#ffffff"
              stroke="#a78bfa"
              stroke-width="3"
            />
            <circle
              :cx="lastPlotPoint.x"
              :cy="lastPlotPoint.y"
              r="7"
              fill="#7c3aed"
              stroke="#ffffff"
              stroke-width="4"
              filter="url(#account-trend-dot-shadow)"
            />
          </g>
        </svg>

        <div class="mt-1 flex items-center justify-between gap-4 text-xs text-slate-500">
          <time :datetime="firstPoint.date.toISOString()">{{ formatDate(firstPoint.date) }}</time>
          <span class="numeric font-semibold text-slate-700">
            当前 {{ formatBalance(lastPoint.balance) }} {{ currency }}
          </span>
          <time :datetime="lastPoint.date.toISOString()">{{ formatDate(lastPoint.date) }}</time>
        </div>
      </div>
    </template>

    <div v-else class="mt-6 flex min-h-48 flex-1 items-center justify-center rounded-2xl bg-slate-50 p-4">
      <div class="text-center">
        <p class="text-sm font-medium text-slate-600">暂无数据</p>
        <p class="mt-1 text-xs text-slate-400">记录第一笔交易后会在这里显示。</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";

import type { ChartPoint } from "../composables/useChartData";

const props = defineProps<{
  chartPoints: ChartPoint[];
  currency: string;
}>();

type PlotPoint = ChartPoint & {
  x: number;
  y: number;
};

const gridLines = [24, 108, 192];
const hasTrend = computed(() => props.chartPoints.length >= 2);
const firstPoint = computed(() => props.chartPoints[0] ?? { date: new Date(), balance: 0 });
const lastPoint = computed(
  () => props.chartPoints[props.chartPoints.length - 1] ?? firstPoint.value,
);
const balances = computed(() => props.chartPoints.map((point) => point.balance));
const minBalance = computed(() => Math.min(...balances.value));
const maxBalance = computed(() => Math.max(...balances.value));
const balanceChange = computed(() => lastPoint.value.balance - firstPoint.value.balance);

const plotPoints = computed<PlotPoint[]>(() => {
  if (!hasTrend.value) return [];
  const range = maxBalance.value - minBalance.value;

  return props.chartPoints.map((point, index) => ({
    ...point,
    x: 12 + (index / (props.chartPoints.length - 1)) * 616,
    y: range === 0 ? 108 : 24 + ((maxBalance.value - point.balance) / range) * 168,
  }));
});

const firstPlotPoint = computed(() => plotPoints.value[0] ?? { x: 12, y: 108 });
const lastPlotPoint = computed(
  () => plotPoints.value[plotPoints.value.length - 1] ?? firstPlotPoint.value,
);
const linePath = computed(() => {
  const [first, ...rest] = plotPoints.value;
  if (!first) return "";
  return rest.reduce(
    (path, point) => `${path} H ${point.x.toFixed(2)} V ${point.y.toFixed(2)}`,
    `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`,
  );
});
const areaPath = computed(() => {
  if (!linePath.value) return "";
  return `${linePath.value} L ${lastPlotPoint.value.x.toFixed(2)} 204 L ${firstPlotPoint.value.x.toFixed(2)} 204 Z`;
});

const amountFormatter = new Intl.NumberFormat("zh-CN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "numeric",
  day: "numeric",
});
const formatBalance = (value: number) => amountFormatter.format(value);
const formatDate = (value: Date) => dateFormatter.format(value);
const formattedChange = computed(() => {
  const sign = balanceChange.value > 0 ? "+" : balanceChange.value < 0 ? "−" : "";
  return `${sign}${formatBalance(Math.abs(balanceChange.value))}`;
});
const changeTone = computed(() => {
  if (balanceChange.value > 0) return "text-emerald-700";
  if (balanceChange.value < 0) return "text-rose-700";
  return "text-slate-600";
});
const chartDescription = computed(
  () =>
    `近 30 天余额趋势，从 ${formatBalance(firstPoint.value.balance)} ${props.currency} ` +
    `变化到 ${formatBalance(lastPoint.value.balance)} ${props.currency}，` +
    `本期变化 ${formattedChange.value} ${props.currency}`,
);
</script>
