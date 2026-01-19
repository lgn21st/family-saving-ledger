import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";

import { useTransactionPaging } from "../composables/useTransactionPaging";

describe("useTransactionPaging", () => {
  it("skips loading when no account is selected", async () => {
    const handleLoadMoreTransactions = vi.fn(async () => undefined);
    const { handleLoadMoreForSelected } = useTransactionPaging({
      selectedAccount: ref(null),
      handleLoadMoreTransactions,
    });

    await handleLoadMoreForSelected();
    expect(handleLoadMoreTransactions).not.toHaveBeenCalled();
  });

  it("loads more for the selected account", async () => {
    const handleLoadMoreTransactions = vi.fn(async () => undefined);
    const { handleLoadMoreForSelected } = useTransactionPaging({
      selectedAccount: ref({ id: "acc-1" }),
      handleLoadMoreTransactions,
    });

    await handleLoadMoreForSelected();
    expect(handleLoadMoreTransactions).toHaveBeenCalledWith("acc-1");
  });
});
