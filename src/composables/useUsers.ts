/**
 * 用户数据加载
 * 加载孩子用户列表和登录用户列表
 *
 * 功能：
 * - loadChildUsers: 加载所有孩子用户
 * - loadLoginUsers: 加载所有用户（家长按姓名排序，孩子按创建时间排序）
 *
 * 状态：
 * - childUsers: 仅孩子用户
 * - loginUsers: 所有用户（家长在前，孩子在后）
 */
import { ref } from "vue";
import type { AppUser, SupabaseFromClient } from "../types";

export const useUsers = (params: {
  supabase: SupabaseFromClient;
  setErrorStatus: (message: string) => void;
}) => {
  const { supabase, setErrorStatus } = params;

  const childUsers = ref<AppUser[]>([]);
  const loginUsers = ref<AppUser[]>([]);

  const loadChildUsers = async () => {
    const { data, error } = await supabase
      .from("app_users")
      .select("*")
      .eq("role", "child")
      .order("created_at");

    if (error) {
      setErrorStatus(error.message);
      return;
    }

    childUsers.value = (data ?? []) as AppUser[];
  };

  const loadLoginUsers = async () => {
    const { data, error } = await supabase
      .from("app_users")
      .select("*")
      .order("created_at");

    if (error) {
      setErrorStatus(error.message);
      return;
    }

    const rows = (data ?? []) as AppUser[];
    const parents = rows
      .filter((user) => user.role === "parent")
      .sort((left, right) => left.name.localeCompare(right.name));
    const children = rows
      .filter((user) => user.role === "child")
      .sort((left, right) =>
        (left.created_at ?? "").localeCompare(right.created_at ?? ""),
      );

    loginUsers.value = [...parents, ...children];
  };

  return {
    childUsers,
    loginUsers,
    loadChildUsers,
    loadLoginUsers,
  };
};
