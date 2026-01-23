import { ref } from "vue";
import { describe, expect, it } from "vitest";

import { useCurrency } from "../composables/useCurrency";

describe("useCurrency", () => {
  it("groups accounts and sums totals by currency", () => {
    const accounts = ref([
      { id: "acc-1", currency: "CNY" },
      { id: "acc-2", currency: "CNY" },
      { id: "acc-3", currency: "SGD" },
    ]);
    const balances = ref({
      "acc-1": 10,
      "acc-2": 15,
      "acc-3": 8,
    });

    const { groupedAccounts, currencyTotals } = useCurrency({
      accounts,
      balances,
    });

    expect(groupedAccounts.value.CNY).toHaveLength(2);
    expect(groupedAccounts.value.SGD).toHaveLength(1);
    expect(currencyTotals.value.CNY).toBe(25);
    expect(currencyTotals.value.SGD).toBe(8);
  });

  it("formats amount with currency", () => {
    const { formatAmount } = useCurrency({
      accounts: ref([]),
      balances: ref({}),
    });

    expect(formatAmount(2, "CNY")).toBe("2.00 CNY");
  });
});
