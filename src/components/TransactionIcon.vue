<template>
  <span
    :class="wrapperClass"
    class="text-xl font-bold leading-none flex items-center justify-center"
  >
    {{ symbol }}
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { TransactionType } from "../types";

type Props = {
  type: TransactionType;
};

const props = defineProps<Props>();

const iconBase = "flex h-9 w-9 items-center justify-center rounded-full";

const iconMap: Record<TransactionType, { className: string; symbol: string }> =
  {
    deposit: {
      className: "bg-emerald-100 text-emerald-600",
      symbol: "↑",
    },
    withdrawal: {
      className: "bg-rose-100 text-rose-500",
      symbol: "↓",
    },
    transfer_in: {
      className: "bg-emerald-100 text-emerald-600",
      symbol: "→",
    },
    transfer_out: {
      className: "bg-rose-100 text-rose-500",
      symbol: "←",
    },
    interest: {
      className: "bg-emerald-100 text-emerald-600",
      symbol: "↑",
    },
  };

const icon = computed(() => iconMap[props.type] ?? iconMap.interest);

const wrapperClass = computed(() => {
  return `${iconBase} ${icon.value.className}`;
});

const symbol = computed(() => icon.value.symbol);
</script>
