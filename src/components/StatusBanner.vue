<template>
  <div
    v-if="message"
    class="pointer-events-none fixed top-22 right-4 left-4 z-[60] flex justify-center sm:left-auto sm:w-[420px]"
    :role="tone === 'error' ? 'alert' : 'status'"
    aria-live="polite"
  >
    <div :class="bannerClass" class="pointer-events-auto w-full shadow-lg">
      {{ message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { StatusTone } from "../types";

const props = defineProps<{
  message: string | null;
  tone: StatusTone;
}>();

const bannerClass = computed(() => [
  "rounded-2xl border px-4 py-3 text-sm font-medium backdrop-blur",
  props.tone === "success"
    ? "border-emerald-200 bg-emerald-50/95 text-emerald-800"
    : "border-rose-200 bg-rose-50/95 text-rose-800",
]);
</script>
