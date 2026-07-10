<template>
  <main
    id="main-content"
    class="relative flex min-h-screen items-center overflow-hidden bg-slate-950 px-4 py-10 text-white sm:px-6 lg:py-16"
  >
    <div
      class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.4),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.2),transparent_38%)]"
      aria-hidden="true"
    />
    <div
      class="relative mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:gap-16"
    >
      <section class="max-w-xl text-center lg:text-left">
        <p class="section-kicker text-brand-300">Family Saving Ledger</p>
        <h1
          class="mt-4 text-balance text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl"
        >
          让每一笔储蓄，都变成看得见的成长
        </h1>
        <p class="mt-5 text-pretty text-base leading-7 text-slate-300 sm:text-lg">
          家长负责记录，孩子随时查看。余额、转账和每月利息，都在一个清晰的家庭账本里。
        </p>
        <div
          class="mx-auto mt-8 grid max-w-md grid-cols-3 gap-3 text-left lg:mx-0"
        >
          <div class="rounded-2xl border border-white/10 bg-white/6 p-3">
            <p class="text-sm font-semibold text-white">共同管理</p>
            <p class="mt-1 text-xs leading-5 text-slate-400">家长记账</p>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/6 p-3">
            <p class="text-sm font-semibold text-white">清晰可见</p>
            <p class="mt-1 text-xs leading-5 text-slate-400">孩子只读</p>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/6 p-3">
            <p class="text-sm font-semibold text-white">持续成长</p>
            <p class="mt-1 text-xs leading-5 text-slate-400">按月结息</p>
          </div>
        </div>
      </section>

      <section class="rounded-[2rem] bg-white p-5 text-slate-950 shadow-2xl sm:p-8">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="section-kicker">安全进入</p>
            <h2 class="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              选择你的身份
            </h2>
            <p class="mt-2 text-sm leading-6 text-slate-500">
              先选择家庭成员，再输入 4 位 PIN。
            </p>
          </div>
          <span
            class="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700"
          >
            家庭专用
          </span>
        </div>

        <p
          v-if="!isSupabaseConfigured"
          class="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          role="alert"
        >
          请先配置 Supabase 连接后再登录。
        </p>
        <p
          v-else-if="loginUsers.length === 0"
          class="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
        >
          暂无可登录成员，请先创建家庭成员。
        </p>

        <template v-else>
          <div class="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              v-for="entry in loginUsers"
              :key="entry.id"
              type="button"
              :aria-label="entry.name"
              :aria-pressed="entry.id === selectedLoginUserId"
              :class="[
                'group flex min-w-0 items-center gap-3 rounded-2xl border p-3 text-left transition-[border-color,background-color,box-shadow,transform] focus-visible:ring-3 focus-visible:ring-brand-100 focus-visible:outline-none active:translate-y-px',
                entry.id === selectedLoginUserId
                  ? 'border-brand-400 bg-brand-50 shadow-sm ring-1 ring-brand-200'
                  : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/60',
              ]"
              @click="onSelectLoginUser(entry.id)"
            >
              <Avatar
                :avatar-id="entry.avatar_id"
                :options="avatarOptions"
                :role="entry.role"
                class="h-14 w-14 shrink-0"
              />
              <span class="min-w-0">
                <span class="block truncate text-base font-semibold text-slate-900">
                  {{ entry.name }}
                </span>
                <span class="mt-0.5 block text-xs text-slate-500">
                  {{ entry.role === "parent" ? "家长 · 可管理账本" : "孩子 · 查看我的储蓄" }}
                </span>
              </span>
              <span
                v-if="entry.id === selectedLoginUserId"
                class="ml-auto shrink-0 rounded-full bg-brand-700 px-2 py-1 text-[11px] font-semibold text-white"
              >
                已选择
              </span>
            </button>
          </div>

          <form class="mt-6" @submit.prevent="onLogin">
            <label for="login-pin" class="field-label">4 位 PIN</label>
            <input
              id="login-pin"
              :value="loginPin"
              name="pin"
              type="password"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="4"
              autocomplete="current-password"
              spellcheck="false"
              placeholder="PIN"
              class="app-input numeric h-14 text-center text-xl tracking-[0.45em]"
              @input="handlePinInput"
            />
            <button
              type="submit"
              :disabled="loading"
              class="button-primary mt-4 w-full"
              :aria-label="selectedLoginUser ? `登录 ${selectedLoginUser.name}` : '登录'"
            >
              {{
                loading
                  ? "登录中…"
                  : selectedLoginUser
                    ? `进入 ${selectedLoginUser.name} 的账本`
                    : "进入家庭账本"
              }}
            </button>
          </form>
        </template>

        <p
          v-if="sessionStatus || status"
          class="mt-4 rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700"
          aria-live="polite"
        >
          {{ sessionStatus ?? status }}
        </p>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import Avatar from "./Avatar.vue";
import type { AppUser } from "../types";
import type { AvatarOption } from "../config";

const props = defineProps<{
  isSupabaseConfigured: boolean;
  loginUsers: AppUser[];
  selectedLoginUserId: string | null;
  loginPin: string;
  loading: boolean;
  selectedLoginUser: AppUser | null;
  sessionStatus: string | null;
  status: string | null;
  avatarOptions: AvatarOption[];
  sanitizePin: (value: string) => string;
  onSelectLoginUser: (id: string) => void;
  onLogin: () => void;
}>();

const emit = defineEmits<{
  (event: "update:loginPin", value: string): void;
}>();

const handlePinInput = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  emit("update:loginPin", props.sanitizePin(target?.value ?? ""));
};
</script>
