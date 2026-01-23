import { ref } from "vue";
import { describe, expect, it } from "vitest";

import { useDerived } from "../composables/useDerived";

describe("useDerived", () => {
  it("selects the current login user", () => {
    const { selectedLoginUser } = useDerived({
      loginUsers: ref([{ id: "u-1" }, { id: "u-2" }]),
      selectedLoginUserId: ref("u-2"),
      selectedAccount: ref(null),
      transactions: ref([]),
    });

    expect(selectedLoginUser.value?.id).toBe("u-2");
  });

  it("filters transactions based on selected account", () => {
    const { selectedTransactions, pagedTransactions } = useDerived({
      loginUsers: ref([]),
      selectedLoginUserId: ref(null),
      selectedAccount: ref({ id: "acc-1" }),
      transactions: ref([{ id: "t-1" }]),
    });

    expect(selectedTransactions.value).toHaveLength(1);
    expect(pagedTransactions.value).toHaveLength(1);
  });

  it("returns empty transactions when no account is selected", () => {
    const { selectedTransactions } = useDerived({
      loginUsers: ref([]),
      selectedLoginUserId: ref(null),
      selectedAccount: ref(null),
      transactions: ref([{ id: "t-1" }]),
    });

    expect(selectedTransactions.value).toEqual([]);
  });
});
