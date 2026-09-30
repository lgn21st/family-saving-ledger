import { ref } from "vue";
import type { AppUser, SupabaseFromClient } from "../types";

export const APP_USER_PUBLIC_COLUMNS =
  "id, name, role, avatar_id, is_active, created_at, archived_at, archived_by";

export const useUsers = (params: {
  supabase: SupabaseFromClient;
  setErrorStatus: (message: string) => void;
}) => {
  const { supabase, setErrorStatus } = params;

  const childUsers = ref<AppUser[]>([]);
  const loginUsers = ref<AppUser[]>([]);
  const loginUsersState = ref<"loading" | "ready" | "error">("loading");

  let childGeneration = 0;
  const resetChildren = () => {
    childGeneration += 1;
    childUsers.value = [];
  };
  const loadChildUsers = async () => {
    const request = ++childGeneration;
    const { data, error } = await supabase
      .from("app_users")
      .select(APP_USER_PUBLIC_COLUMNS)
      .eq("role", "child")
      .order("created_at");

    if (request !== childGeneration) return false;
    if (error) {
      setErrorStatus(error.message);
      return false;
    }

    childUsers.value = ((data ?? []) as AppUser[]).filter(
      (user) => user.is_active !== false,
    );
    return true;
  };

  let loginGeneration = 0;
  const loadLoginUsers = async () => {
    const request = ++loginGeneration;
    loginUsersState.value = "loading";
    try {
      const { data, error } = await supabase
        .from("app_users")
        .select(APP_USER_PUBLIC_COLUMNS)
        .order("created_at");
      if (request !== loginGeneration) return false;
      if (error) throw new Error(error.message);

      const rows = ((data ?? []) as AppUser[]).filter(
        (user) => user.is_active !== false,
      );
      const parents = rows
        .filter((user) => user.role === "parent")
        .sort((left, right) => left.name.localeCompare(right.name));
      const children = rows
        .filter((user) => user.role === "child")
        .sort((left, right) =>
          (left.created_at ?? "").localeCompare(right.created_at ?? ""),
        );

      loginUsers.value = [...parents, ...children];
      loginUsersState.value = "ready";
      return true;
    } catch {
      if (request !== loginGeneration) return false;
      loginUsersState.value = "error";
      setErrorStatus("家庭成员加载失败，请检查网络后重试。");
      return false;
    }
  };

  return {
    childUsers,
    loginUsers,
    loginUsersState,
    resetChildren,
    loadChildUsers,
    loadLoginUsers,
  };
};
