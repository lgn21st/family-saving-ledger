<template>
  <main id="main-content" ref="content" tabindex="-1" class="page-container min-h-0 flex-1 overflow-y-auto py-5 sm:py-7">
    <header class="surface-card p-5 sm:p-7">
      <div>
        <p class="section-kicker">家庭管理</p>
        <h1
          class="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl"
        >
          设置
        </h1>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          在这里管理家庭成员和账户。日常查看、记账与转账仍留在账本工作台。
        </p>
      </div>

      <nav
        class="mt-6 flex gap-2 border-b border-slate-200"
        aria-label="设置分类"
      >
        <button
          v-for="item in navigationItems"
          :key="item.id"
          type="button"
          :aria-current="activeSection === item.id ? 'page' : undefined"
          :class="[
            '-mb-px min-h-11 border-b-2 px-4 py-2 text-sm font-semibold transition-[border-color,color] focus-visible:ring-3 focus-visible:ring-brand-100 focus-visible:outline-none',
            activeSection === item.id
              ? 'border-brand-700 text-brand-700'
              : 'border-transparent text-slate-500 hover:text-slate-900',
          ]"
          @click="activeSection = item.id"
        >
          {{ item.label }}
        </button>
      </nav>
    </header>

    <div v-show="activeSection === 'members'">
      <slot name="members" />
    </div>
    <div v-show="activeSection === 'accounts'">
      <slot name="accounts" />
    </div>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
type SettingsSection = "members" | "accounts";
const props = withDefaults(defineProps<{ initialSection?: SettingsSection }>(), {
  initialSection: "members",
});
const activeSection = ref<SettingsSection>(props.initialSection);
const content = ref<HTMLElement | null>(null);
onMounted(() => content.value?.focus());
const navigationItems: Array<{ id: SettingsSection; label: string }> = [
  { id: "members", label: "成员" },
  { id: "accounts", label: "账户" },
];
</script>
