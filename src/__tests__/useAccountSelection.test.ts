import { ref } from "vue";
import { describe, expect, it } from "vitest";

import { useAccountSelection } from "../composables/useAccountSelection";

describe("useAccountSelection", () => {
  it("selects account and child based on ids", () => {
    const user = ref({ id: "parent", name: "爸", role: "parent" } as const);
    const accounts = ref([
      {
        id: "acc-1",
        name: "日常",
        currency: "CNY",
        owner_child_id: "child-1",
        created_at: "2024-01-01",
      },
    ]);
    const childUsers = ref([
      { id: "child-1", name: "小乐", role: "child" as const },
    ]);

    const handle = useAccountSelection({
      user,
      accounts,
      childUsers,
      selectedAccountId: ref("acc-1"),
      selectedChildId: ref("child-1"),
    });

    expect(handle.selectedAccount.value?.id).toBe("acc-1");
    expect(handle.selectedChild.value?.id).toBe("child-1");
    expect(handle.canEdit.value).toBe(true);
  });

  it("builds transfer targets with owner names", () => {
    const handle = useAccountSelection({
      user: ref({ id: "parent", name: "爸", role: "parent" }),
      accounts: ref([
        {
          id: "acc-1",
          name: "日常",
          currency: "CNY",
          owner_child_id: "child-1",
        },
        {
          id: "acc-2",
          name: "教育",
          currency: "CNY",
          owner_child_id: "child-2",
        },
      ]),
      childUsers: ref([
        { id: "child-1", name: "小乐", role: "child" },
        { id: "child-2", name: "小米", role: "child" },
      ]),
      selectedAccountId: ref("acc-1"),
      selectedChildId: ref("child-1"),
    });

    expect(handle.transferTargets.value).toHaveLength(1);
    expect(handle.transferTargets.value[0]?.ownerName).toBe("小米");
  });

  it("updates selected account id", () => {
    const selectedAccountId = ref<string | null>(null);
    const handle = useAccountSelection({
      user: ref({ id: "parent", name: "爸", role: "parent" }),
      accounts: ref([]),
      childUsers: ref([]),
      selectedAccountId,
      selectedChildId: ref(null),
    });

    handle.selectAccount("acc-9");
    expect(selectedAccountId.value).toBe("acc-9");
  });
});
