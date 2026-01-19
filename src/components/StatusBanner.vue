<template>
  <div v-if="message" class="px-6 pt-4">
    <div :class="bannerClass">
      {{ message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

type StatusTone = "success" | "error";

const props = defineProps<{
  message: string | null;
  tone: StatusTone;
}>();

const bannerClass = computed(() => [
  "rounded-2xl border px-4 py-3 text-sm",
  props.tone === "success"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-rose-200 bg-rose-50 text-rose-700",
]);
</script>
