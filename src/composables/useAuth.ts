import { computed, ref } from "vue";
import type { AppUser, SupabaseFromClient } from "../types";
import { APP_USER_PUBLIC_COLUMNS } from "./useUsers";

export const useAuth = (params: {
  supabase: SupabaseFromClient;
  isSupabaseConfigured: boolean;
  setStatus: (message: string | null) => void;
}) => {
  const currentUser = ref<AppUser | null>(null);
  const loginPin = ref("");
  const loginUserId = ref<string | null>(null);
  const sessionStatus = ref<string | null>(null);
  const loading = ref(false);
  let generation = 0;
  const selectLoginUser = (id: string) => {
    if (loading.value) return;
    loginUserId.value = id;
    loginPin.value = "";
  };
  const handleLogout = () => {
    generation += 1;
    currentUser.value = null;
    loginPin.value = "";
    loginUserId.value = null;
    sessionStatus.value = null;
    loading.value = false;
    sessionStorage.removeItem("homebank.session");
  };
  const handleLogin = async () => {
    if (loading.value) return;
    params.setStatus(null);
    sessionStatus.value = null;
    if (!params.isSupabaseConfigured)
      return params.setStatus("请先配置 Supabase 环境变量。");
    if (!loginUserId.value) return params.setStatus("请选择登录用户。");
    if (loginPin.value.length !== 4)
      return params.setStatus("请输入 4 位 PIN。");
    const request = ++generation;
    loading.value = true;
    try {
      const { data, error } = await params.supabase
        .from("app_users")
        .select(APP_USER_PUBLIC_COLUMNS)
        .eq("id", loginUserId.value)
        .eq("pin", loginPin.value)
        .maybeSingle();
      if (request !== generation) return;
      const resolvedUser = data as AppUser | null;
      if (error || !resolvedUser || resolvedUser.is_active === false) {
        params.setStatus("PIN 无效，请重试。");
        return;
      }
      currentUser.value = resolvedUser;
      loginPin.value = "";
      sessionStorage.setItem(
        "homebank.session",
        JSON.stringify({
          userId: resolvedUser.id,
          expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
        }),
      );
    } catch {
      if (request === generation) params.setStatus("登录失败，请重试。");
    } finally {
      if (request === generation) loading.value = false;
    }
  };
  const restoreSession = async (userId: string) => {
    const request = ++generation;
    loading.value = true;
    try {
      const { data, error } = await params.supabase
        .from("app_users")
        .select(APP_USER_PUBLIC_COLUMNS)
        .eq("id", userId)
        .maybeSingle();
      if (request !== generation) return;
      const resolvedUser = data as AppUser | null;
      if (error || !resolvedUser || resolvedUser.is_active === false) {
        sessionStorage.removeItem("homebank.session");
        return;
      }
      currentUser.value = resolvedUser;
    } catch {
      if (request === generation) sessionStorage.removeItem("homebank.session");
    } finally {
      if (request === generation) loading.value = false;
    }
  };
  const checkSession = async () => {
    if (!params.isSupabaseConfigured || currentUser.value) return;
    const raw = sessionStorage.getItem("homebank.session");
    if (!raw) return;
    try {
      const session = JSON.parse(raw) as {
        userId?: string;
        expiresAt?: number;
      };
      if (!session.userId || !session.expiresAt) {
        sessionStorage.removeItem("homebank.session");
        return;
      }
      if (Date.now() > session.expiresAt) {
        sessionStorage.removeItem("homebank.session");
        sessionStatus.value = "登录已过期，请重新登录。";
        return;
      }
      await restoreSession(session.userId);
    } catch {
      sessionStorage.removeItem("homebank.session");
    }
  };
  return {
    user: computed(() => currentUser.value),
    loginPin,
    selectedLoginUserId: computed(() => loginUserId.value),
    sessionStatus,
    loading,
    selectLoginUser,
    handleLogin,
    handleLogout,
    restoreSession,
    checkSession,
  };
};
