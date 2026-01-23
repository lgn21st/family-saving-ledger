import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";

import { useSession } from "../composables/useSession";

describe("useSession", () => {
  it("selects login user and clears pin", () => {
    const loginPin = ref("1234");
    const selectedLoginUserId = ref<string | null>(null);

    const { selectLoginUser } = useSession({
      user: ref(null),
      accounts: ref([]),
      balances: ref({}),
      loginPin,
      selectedLoginUserId,
      selectedAccountId: ref(null),
      selectedChildId: ref(null),
      showChildManager: ref(false),
      showAccountCreator: ref(false),
      clearTransactions: vi.fn(),
      setStatus: vi.fn(),
      loadBalances: vi.fn(async () => undefined),
      resetSelectedAccountData: vi.fn(async () => undefined),
      selectedAccount: ref(null),
    });

    selectLoginUser("user-1");
    expect(selectedLoginUserId.value).toBe("user-1");
    expect(loginPin.value).toBe("");
  });

  it("refreshes account data using current selection", async () => {
    const loadBalances = vi.fn(async () => undefined);
    const resetSelectedAccountData = vi.fn(async () => undefined);
    const selectedAccount = ref({ id: "acc-1" });

    const { refreshAccountData } = useSession({
      user: ref(null),
      accounts: ref([{ id: "acc-1" }]),
      balances: ref({}),
      loginPin: ref(""),
      selectedLoginUserId: ref(null),
      selectedAccountId: ref("acc-1"),
      selectedChildId: ref(null),
      showChildManager: ref(false),
      showAccountCreator: ref(false),
      clearTransactions: vi.fn(),
      setStatus: vi.fn(),
      loadBalances,
      resetSelectedAccountData,
      selectedAccount,
    });

    await refreshAccountData();
    expect(loadBalances).toHaveBeenCalled();
    expect(resetSelectedAccountData).toHaveBeenCalledWith("acc-1");
  });

  it("clears state on logout", () => {
    const user = ref({ id: "parent" });
    const accounts = ref([{ id: "acc-1" }]);
    const balances = ref({ "acc-1": 10 });
    const loginPin = ref("1234");
    const selectedLoginUserId = ref<string | null>("user-1");
    const selectedAccountId = ref<string | null>("acc-1");
    const selectedChildId = ref<string | null>("child-1");
    const showChildManager = ref(true);
    const showAccountCreator = ref(true);
    const clearTransactions = vi.fn();
    const setStatus = vi.fn();

    const { handleLogout } = useSession({
      user,
      accounts,
      balances,
      loginPin,
      selectedLoginUserId,
      selectedAccountId,
      selectedChildId,
      showChildManager,
      showAccountCreator,
      clearTransactions,
      setStatus,
      loadBalances: vi.fn(async () => undefined),
      resetSelectedAccountData: vi.fn(async () => undefined),
      selectedAccount: ref(null),
    });

    handleLogout();
    expect(user.value).toBeNull();
    expect(accounts.value).toEqual([]);
    expect(balances.value).toEqual({});
    expect(loginPin.value).toBe("");
    expect(selectedLoginUserId.value).toBeNull();
    expect(selectedAccountId.value).toBeNull();
    expect(selectedChildId.value).toBeNull();
    expect(showChildManager.value).toBe(false);
    expect(showAccountCreator.value).toBe(false);
    expect(clearTransactions).toHaveBeenCalled();
    expect(setStatus).toHaveBeenCalledWith(null);
  });
});
