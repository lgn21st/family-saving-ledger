<template>
  <span :class="wrapperClass">
    <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
      <path :d="path" />
    </svg>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type TransactionType = 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out' | 'interest'

type Props = {
  type: TransactionType
}

const props = defineProps<Props>()

const iconBase = 'flex h-9 w-9 items-center justify-center rounded-full'

const iconMap: Record<TransactionType, { className: string; path: string }> = {
  deposit: {
    className: 'bg-emerald-100 text-emerald-600',
    path: 'M12 4l6 6h-4v6h-4v-6H6l6-6z'
  },
  withdrawal: {
    className: 'bg-rose-100 text-rose-500',
    path: 'M12 20l-6-6h4V8h4v6h4l-6 6z'
  },
  transfer_in: {
    className: 'bg-sky-100 text-sky-600',
    path: 'M5 12l4-4v3h6v2H9v3l-4-4z'
  },
  transfer_out: {
    className: 'bg-purple-100 text-purple-600',
    path: 'M19 12l-4 4v-3H9v-2h6V8l4 4z'
  },
  interest: {
    className: 'bg-amber-100 text-amber-600',
    path: 'M12 3a9 9 0 100 18 9 9 0 000-18zm1 13h-2v-2h2v2zm0-4h-2V7h2v5z'
  }
}

const icon = computed(() => iconMap[props.type] ?? iconMap.interest)

const wrapperClass = computed(() => {
  return `${iconBase} ${icon.value.className}`
})

const path = computed(() => icon.value.path)
</script>
