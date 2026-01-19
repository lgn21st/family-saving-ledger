import { ref } from "vue";
import type { AppUser } from "../types";

type SupabaseClient = {
  from: (...args: unknown[]) => any;
};

export const useUsers = (params: {
  supabase: SupabaseClient;
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

    childUsers.value = data ?? [];
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
