<template>
  <Teleport to="body">
  <div
    ref="dialogElement"
    class="fixed inset-0 z-[90] flex items-center justify-center overscroll-contain bg-slate-950/55 px-4 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="titleId"
    :aria-describedby="descriptionId"
    @click.self="onCancel"
    @keydown="handleKeydown"
  >
    <section class="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
      <p class="section-kicker" :class="tone === 'danger' ? 'text-rose-600' : 'text-brand-700'">
        {{ kicker }}
      </p>
      <h2 :id="titleId" class="mt-2 text-xl font-semibold text-slate-950">{{ title }}</h2>
      <p :id="descriptionId" class="mt-2 text-sm leading-6 text-slate-600">
        {{ description }}
      </p>
      <p v-if="detail" class="mt-2 text-sm leading-6 text-slate-500">{{ detail }}</p>
      <div class="mt-6 grid grid-cols-2 gap-3">
        <button ref="cancelButton" type="button" class="button-secondary min-h-11" :disabled="loading" @click="onCancel">
          取消
        </button>
        <button
          type="button"
          class="min-h-11 rounded-2xl px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
          :class="tone === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-brand-700 hover:bg-brand-800'"
          :disabled="loading"
          @click="onConfirm"
        >
          {{ loading ? "处理中…" : confirmLabel }}
        </button>
      </div>
    </section>
  </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";

const props = withDefaults(defineProps<{
  titleId: string;
  descriptionId: string;
  kicker?: string;
  title: string;
  description: string;
  detail?: string;
  confirmLabel: string;
  tone?: "danger" | "primary";
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}>(), {
  kicker: "请确认",
  detail: "",
  tone: "danger",
  loading: false,
});

const dialogElement = ref<HTMLElement | null>(null);
const cancelButton = ref<HTMLButtonElement | null>(null);
let previousBodyOverflow = "";
let appRoot: HTMLElement | null = null;
let appWasInert = false;
let previousAppAriaHidden: string | null = null;

onMounted(async () => {
  previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  appRoot = document.getElementById("app");
  if (appRoot) {
    appWasInert = appRoot.hasAttribute("inert");
    previousAppAriaHidden = appRoot.getAttribute("aria-hidden");
    appRoot.setAttribute("inert", "");
    appRoot.setAttribute("aria-hidden", "true");
  }
  await nextTick();
  cancelButton.value?.focus();
});

onBeforeUnmount(() => {
  document.body.style.overflow = previousBodyOverflow;
  if (!appRoot) return;
  if (!appWasInert) appRoot.removeAttribute("inert");
  if (previousAppAriaHidden === null) appRoot.removeAttribute("aria-hidden");
  else appRoot.setAttribute("aria-hidden", previousAppAriaHidden);
});

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape" && !props.loading) {
    event.preventDefault();
    props.onCancel();
    return;
  }
  if (event.key !== "Tab" || !dialogElement.value) return;
  const controls = Array.from(dialogElement.value.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
  ));
  const first = controls[0];
  const last = controls[controls.length - 1];
  if (!first || !last) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
};
</script>
