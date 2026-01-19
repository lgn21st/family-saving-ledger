import { ref } from "vue";
import { describe, expect, it } from "vitest";

import { useTransactionDisplay } from "../composables/useTransactionDisplay";

describe("useTransactionDisplay", () => {
  it("formats signed amounts and tones based on direction", () => {
    const { formatSignedAmount, transactionTone } = useTransactionDisplay({
      accounts: ref([]),
      childUsers: ref([]),
    });

    const deposit = {
      type: "deposit" as const,
      amount: 12.5,
      currency: "CNY",
      note: null,
      related_account_id: null,
      created_at: new Date().toISOString(),
    };
    const withdrawal = {
      type: "withdrawal" as const,
      amount: 3,
      currency: "CNY",
      note: null,
      related_account_id: null,
      created_at: new Date().toISOString(),
    };

    expect(formatSignedAmount(deposit)).toBe("+12.50 CNY");
    expect(transactionTone(deposit)).toBe("text-emerald-600");
    expect(formatSignedAmount(withdrawal)).toBe("-3.00 CNY");
    expect(transactionTone(withdrawal)).toBe("text-rose-500");
  });

  it("uses explicit note when provided", () => {
    const { getTransactionNote } = useTransactionDisplay({
      accounts: ref([]),
      childUsers: ref([]),
    });

    const note = getTransactionNote({
      type: "deposit",
      amount: 2,
      currency: "CNY",
      note: "零花钱",
      related_account_id: null,
      created_at: new Date().toISOString(),
    });

    expect(note).toBe("零花钱");
  });

  it("builds transfer notes from related account and child", () => {
    const accounts = ref([
      { id: "acc-2", name: "教育金", owner_child_id: "child-1" },
    ]);
    const childUsers = ref([{ id: "child-1", name: "小乐" }]);
    const { getTransactionNote } = useTransactionDisplay({
      accounts,
      childUsers,
    });

    const outgoing = getTransactionNote({
      type: "transfer_out",
      amount: 5,
      currency: "CNY",
      note: null,
      related_account_id: "acc-2",
      created_at: new Date().toISOString(),
    });
    const incoming = getTransactionNote({
      type: "transfer_in",
      amount: 5,
      currency: "CNY",
      note: null,
      related_account_id: "acc-2",
      created_at: new Date().toISOString(),
    });

    expect(outgoing).toBe("转出至 小乐 教育金");
    expect(incoming).toBe("来自 小乐 教育金");
  });

  it("falls back when related account is unknown", () => {
    const { getTransactionNote } = useTransactionDisplay({
      accounts: ref([]),
      childUsers: ref([]),
    });

    const note = getTransactionNote({
      type: "transfer_in",
      amount: 8,
      currency: "CNY",
      note: null,
      related_account_id: "missing",
      created_at: new Date().toISOString(),
    });

    expect(note).toBe("—");
  });
});
