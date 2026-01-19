<template>
  <main
    class="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-500 px-4"
  >
    <div
      class="w-full max-w-2xl rounded-3xl bg-white/90 p-8 text-center shadow-2xl backdrop-blur"
    >
      <h1 class="text-2xl font-semibold text-slate-900">Home Bank</h1>
      <p class="mt-2 text-sm text-slate-600">请选择用户并输入 PIN。</p>
      <span
        v-if="!isSupabaseConfigured"
        class="mt-6 block text-sm text-rose-600"
      >
        请先配置 Supabase 连接。
      </span>
      <span
        v-else-if="loginUsers.length === 0"
        class="mt-6 block text-sm text-slate-500"
      >
        暂无用户，请先创建家庭成员。
      </span>
      <template v-else>
        <div class="mt-6 grid gap-4 sm:grid-cols-2">
          <button
            v-for="entry in loginUsers"
            :key="entry.id"
            type="button"
            :aria-label="entry.name"
            :class="[
              'flex items-center gap-4 rounded-3xl border px-4 py-3 text-left transition',
              entry.id === selectedLoginUserId
                ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-200'
                : 'border-white/60 bg-white shadow-sm hover:bg-brand-50',
            ]"
            @click="onSelectLoginUser(entry.id)"
          >
            <Avatar
              :avatar-id="entry.avatar_id"
              :options="avatarOptions"
              :role="entry.role"
              class="h-16 w-16"
            />
            <div>
              <p class="text-lg font-semibold text-slate-800">
                {{ entry.name }}
              </p>
              <p class="text-sm text-slate-500">
                {{ entry.role === "parent" ? "家长" : "孩子" }}
              </p>
            </div>
          </button>
        </div>

        <form class="mt-6 space-y-4" @submit.prevent="onLogin">
          <input
            :value="loginPin"
            type="password"
            inputmode="numeric"
            pattern="[0-9]*"
            maxlength="4"
            placeholder="PIN"
            class="w-full rounded-2xl border border-white/60 bg-white px-4 py-3 text-center text-2xl tracking-[0.3em] text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            @input="handlePinInput"
          />
          <button
            type="submit"
            :disabled="loading"
            class="w-full rounded-2xl bg-brand-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {{
              loading
                ? "登录中..."
                : selectedLoginUser
                  ? `登录 ${selectedLoginUser.name}`
                  : "登录"
            }}
          </button>
        </form>
      </template>
      <span
        v-if="sessionStatus || status"
        class="mt-3 block text-sm text-rose-600"
      >
        {{ sessionStatus ?? status }}
      </span>
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
