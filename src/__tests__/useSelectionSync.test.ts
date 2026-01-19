import { nextTick, ref } from "vue";
import { describe, expect, it, vi } from "vitest";

import { useSelectionSync } from "../composables/useSelectionSync";

describe("useSelectionSync", () => {
  it("resets account creator inputs and owner when child changes", async () => {
    const selectedChildId = ref<string | null>(null);
    const selectedAccountId = ref<string | null>(null);
    const selectedAccount = ref(null);
    const childUsers = ref([{ id: "child-1", role: "child" }]);
    const accounts = ref([]);
    const transactions = ref([]);
    const user = ref({ id: "parent", role: "parent" });
    const showAccountCreator = ref(true);
    const newAccountName = ref("旧名称");
    const newAccountCurrency = ref("CNY");
    const newAccountOwnerId = ref("");
    const editingAccountId = ref<string | null>(null);
    const cancelEditAccount = vi.fn();
    const clearTransactions = vi.fn();
    const resetSelectedAccountData = vi.fn(async () => undefined);

    useSelectionSync({
      supportedCurrencies: ["SGD", "CNY"],
      selectedChildId,
      selectedAccountId,
      selectedAccount,
      childUsers,
      accounts,
      transactions,
      user,
      showAccountCreator,
      newAccountName,
      newAccountCurrency,
      newAccountOwnerId,
      editingAccountId,
      cancelEditAccount,
      clearTransactions,
      resetSelectedAccountData,
    });

    selectedChildId.value = "child-1";
    await nextTick();

    expect(showAccountCreator.value).toBe(false);
    expect(newAccountName.value).toBe("");
    expect(newAccountCurrency.value).toBe("SGD");
    expect(newAccountOwnerId.value).toBe("child-1");
  });

  it("clears transactions when selected account is missing", async () => {
    const selectedChildId = ref<string | null>(null);
    const selectedAccountId = ref<string | null>("acc-1");
    const selectedAccount = ref(null);
    const childUsers = ref([]);
    const accounts = ref([]);
    const transactions = ref([]);
    const user = ref({ id: "parent", role: "parent" });
    const showAccountCreator = ref(false);
    const newAccountName = ref("");
    const newAccountCurrency = ref("SGD");
    const newAccountOwnerId = ref("");
    const editingAccountId = ref<string | null>(null);
    const cancelEditAccount = vi.fn();
    const clearTransactions = vi.fn();
    const resetSelectedAccountData = vi.fn(async () => undefined);

    useSelectionSync({
      supportedCurrencies: ["SGD"],
      selectedChildId,
      selectedAccountId,
      selectedAccount,
      childUsers,
      accounts,
      transactions,
      user,
      showAccountCreator,
      newAccountName,
      newAccountCurrency,
      newAccountOwnerId,
      editingAccountId,
      cancelEditAccount,
      clearTransactions,
      resetSelectedAccountData,
    });

    selectedAccountId.value = null;
    await nextTick();

    expect(clearTransactions).toHaveBeenCalled();
    expect(resetSelectedAccountData).not.toHaveBeenCalled();
  });

  it("syncs parent selections for child and account", async () => {
    const selectedChildId = ref<string | null>("child-missing");
    const selectedAccountId = ref<string | null>("acc-missing");
    const selectedAccount = ref(null);
    const childUsers = ref([{ id: "child-1", role: "child" }]);
    const accounts = ref([
      { id: "acc-1", owner_child_id: "child-1" },
      { id: "acc-2", owner_child_id: "child-2" },
    ]);
    const transactions = ref([]);
    const user = ref({ id: "parent", role: "parent" });
    const showAccountCreator = ref(false);
    const newAccountName = ref("");
    const newAccountCurrency = ref("SGD");
    const newAccountOwnerId = ref("");
    const editingAccountId = ref<string | null>(null);
    const cancelEditAccount = vi.fn();
    const clearTransactions = vi.fn();
    const resetSelectedAccountData = vi.fn(async () => undefined);

    useSelectionSync({
      supportedCurrencies: ["SGD"],
      selectedChildId,
      selectedAccountId,
      selectedAccount,
      childUsers,
      accounts,
      transactions,
      user,
      showAccountCreator,
      newAccountName,
      newAccountCurrency,
      newAccountOwnerId,
      editingAccountId,
      cancelEditAccount,
      clearTransactions,
      resetSelectedAccountData,
    });

    childUsers.value = [...childUsers.value];
    await nextTick();

    expect(selectedChildId.value).toBe("child-1");
    expect(selectedAccountId.value).toBe("acc-1");
  });

  it("defaults selected account for child users", async () => {
    const selectedChildId = ref<string | null>(null);
    const selectedAccountId = ref<string | null>(null);
    const selectedAccount = ref(null);
    const childUsers = ref([]);
    const accounts = ref([{ id: "acc-1", owner_child_id: "child-1" }]);
    const transactions = ref([]);
    const user = ref({ id: "child-1", role: "child" });
    const showAccountCreator = ref(false);
    const newAccountName = ref("");
    const newAccountCurrency = ref("SGD");
    const newAccountOwnerId = ref("");
    const editingAccountId = ref<string | null>(null);
    const cancelEditAccount = vi.fn();
    const clearTransactions = vi.fn();
    const resetSelectedAccountData = vi.fn(async () => undefined);

    useSelectionSync({
      supportedCurrencies: ["SGD"],
      selectedChildId,
      selectedAccountId,
      selectedAccount,
      childUsers,
      accounts,
      transactions,
      user,
      showAccountCreator,
      newAccountName,
      newAccountCurrency,
      newAccountOwnerId,
      editingAccountId,
      cancelEditAccount,
      clearTransactions,
      resetSelectedAccountData,
    });

    accounts.value = [...accounts.value];
    await nextTick();

    expect(selectedAccountId.value).toBe("acc-1");
  });

  it("cancels editing when account selection changes", async () => {
    const selectedChildId = ref<string | null>(null);
    const selectedAccountId = ref<string | null>("acc-2");
    const selectedAccount = ref({ id: "acc-2", owner_child_id: "child-1" });
    const childUsers = ref([]);
    const accounts = ref([{ id: "acc-1", owner_child_id: "child-1" }]);
    const transactions = ref([{ id: "txn-1" }]);
    const user = ref({ id: "parent", role: "parent" });
    const showAccountCreator = ref(false);
    const newAccountName = ref("");
    const newAccountCurrency = ref("SGD");
    const newAccountOwnerId = ref("");
    const editingAccountId = ref<string | null>("acc-1");
    const cancelEditAccount = vi.fn();
    const clearTransactions = vi.fn();
    const resetSelectedAccountData = vi.fn(async () => undefined);

    useSelectionSync({
      supportedCurrencies: ["SGD"],
      selectedChildId,
      selectedAccountId,
      selectedAccount,
      childUsers,
      accounts,
      transactions,
      user,
      showAccountCreator,
      newAccountName,
      newAccountCurrency,
      newAccountOwnerId,
      editingAccountId,
      cancelEditAccount,
      clearTransactions,
      resetSelectedAccountData,
    });

    transactions.value = [];
    await nextTick();

    expect(cancelEditAccount).toHaveBeenCalled();
  });
});
