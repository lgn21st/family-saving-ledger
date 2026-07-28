<template>
  <div
    v-if="message"
    class="pointer-events-none fixed top-22 right-4 left-4 z-[60] flex justify-center sm:left-auto sm:w-[420px]"
    :role="tone === 'error' ? 'alert' : 'status'"
    aria-live="polite"
  >
    <div :class="bannerClass" class="pointer-events-auto flex w-full items-start gap-3 shadow-lg">
      <span class="min-w-0 flex-1">{{ message }}</span>
      <button
        type="button"
        class="-my-1 min-h-8 shrink-0 rounded-lg px-2 text-xs font-semibold hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-current focus-visible:outline-none"
        aria-label="关闭提示"
        @click="onDismiss"
      >
        关闭
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { StatusTone } from "../types";

const props = defineProps<{
  message: string | null;
  tone: StatusTone;
  onDismiss: () => void;
}>();

const bannerClass = computed(() => [
  "rounded-2xl border px-4 py-3 text-sm font-medium backdrop-blur",
  props.tone === "success"
    ? "border-emerald-200 bg-emerald-50/95 text-emerald-800"
    : "border-rose-200 bg-rose-50/95 text-rose-800",
]);
</script>
