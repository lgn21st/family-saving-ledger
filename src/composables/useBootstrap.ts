import { watch, type Ref } from "vue";
import type { AppUser } from "../types";

export const useBootstrap = (params: {
  isSupabaseConfigured: boolean;
  user: Ref<AppUser | null>;
  loginUsers: Ref<AppUser[]>;
  selectedLoginUserId: Ref<string | null>;
  loadLoginUsers: () => Promise<void>;
  checkSession: () => Promise<void>;
  loadAccounts: (user: AppUser) => Promise<void>;
  loadChildUsers: () => Promise<void>;
}) => {
  const {
    isSupabaseConfigured,
    user,
    loginUsers,
    selectedLoginUserId,
    loadLoginUsers,
    checkSession,
    loadAccounts,
    loadChildUsers,
  } = params;

  const loadLoginUsersAndSelect = async () => {
    await loadLoginUsers();
    if (!selectedLoginUserId.value && loginUsers.value.length > 0) {
      selectedLoginUserId.value = loginUsers.value[0]?.id ?? null;
    }
  };

  const bootstrap = async () => {
    if (!isSupabaseConfigured || user.value) return;
    await loadLoginUsersAndSelect();
    await checkSession();
  };

  watch(user, async (currentUser) => {
    if (!currentUser) return;
    await loadAccounts(currentUser);
    if (currentUser.role === "parent") {
      await loadChildUsers();
    }
  });

  return {
    loadLoginUsersAndSelect,
    bootstrap,
  };
};
