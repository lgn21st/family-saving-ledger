/**
 * 用户认证管理
 * 处理 PIN 登录、会话恢复和自动登录验证
 *
 * 功能：
 * - PIN 登录验证
 * - SessionStorage 会话管理（30天有效期）
 * - 应用启动时自动恢复会话
 */
import type { Ref } from "vue";
import type { AppUser, SupabaseFromClient } from "../types";

export const useAuth = (params: {
  supabase: SupabaseFromClient;
  user: Ref<AppUser | null>;
  loginPin: Ref<string>;
  selectedLoginUserId: Ref<string | null>;
  isSupabaseConfigured: boolean;
  sessionStatus: Ref<string | null>;
  loading: Ref<boolean>;
  setStatus: (message: string | null) => void;
}) => {
  const {
    supabase,
    user,
    loginPin,
    selectedLoginUserId,
    isSupabaseConfigured,
    sessionStatus,
    loading,
    setStatus,
  } = params;

  const handleLogin = async () => {
    setStatus(null);
    sessionStatus.value = null;

    if (!isSupabaseConfigured) {
      setStatus("请先配置 Supabase 环境变量。");
      return;
    }

    if (!selectedLoginUserId.value) {
      setStatus("请选择登录用户。");
      return;
    }

    if (loginPin.value.length !== 4) {
      setStatus("请输入 4 位 PIN。");
      return;
    }

    loading.value = true;
    const { data, error } = await supabase
      .from("app_users")
      .select("*")
      .eq("id", selectedLoginUserId.value)
      .eq("pin", loginPin.value)
      .maybeSingle();

    const resolvedUser = data as AppUser | null;
    if (error || !resolvedUser) {
      setStatus("PIN 无效，请重试。");
      loading.value = false;
      return;
    }

    user.value = resolvedUser;
    loginPin.value = "";

    const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 30;
    sessionStorage.setItem(
      "homebank.session",
      JSON.stringify({ userId: resolvedUser.id, expiresAt }),
    );
    loading.value = false;
  };

  const restoreSession = async (userId: string) => {
    loading.value = true;
    const { data, error } = await supabase
      .from("app_users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    const resolvedUser = data as AppUser | null;
    if (error || !resolvedUser) {
      sessionStorage.removeItem("homebank.session");
      loading.value = false;
      return;
    }

    user.value = resolvedUser;
    loading.value = false;
  };

  const checkSession = async () => {
    if (!isSupabaseConfigured || user.value) return;

    const sessionRaw = sessionStorage.getItem("homebank.session");
    if (!sessionRaw) return;

    try {
      const session = JSON.parse(sessionRaw) as {
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
    handleLogin,
    restoreSession,
    checkSession,
  };
};
