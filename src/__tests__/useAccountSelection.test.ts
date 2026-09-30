import type { AppUser } from "../types";
import { effectScope, nextTick, ref } from "vue";
import { describe, expect, it } from "vitest";
import { useAccountSelection } from "../composables/useAccountSelection";
const first = {
  id: "acc-1",
  name: "日常",
  currency: "CNY",
  owner_child_id: "child-1",
  created_by: "parent",
  is_active: true,
};
const second = { ...first, id: "acc-2", owner_child_id: "child-2" };
const setup = () => {
  const user = ref<AppUser | null>({ id: "parent", name: "爸", role: "parent" });
  const accounts = ref([first, second]);
  const childUsers = ref<AppUser[]>([
    { id: "child-1", name: "小乐", role: "child" },
    { id: "child-2", name: "小米", role: "child" },
  ]);
  const scope = effectScope();
  const selection = scope.run(() =>
    useAccountSelection({ user, accounts, childUsers }),
  )!;
  return { user, accounts, childUsers, scope, selection };
};
describe("useAccountSelection", () => {
  it("owns valid defaults and builds same-currency transfer targets", async () => {
    const { selection, scope } = setup();
    await nextTick();
    expect(selection.selectedChild.value?.id).toBe("child-1");
    expect(selection.selectedAccount.value?.id).toBe("acc-1");
    expect(selection.canEdit.value).toBe(true);
    expect(selection.transferTargets.value[0]?.ownerName).toBe("小米");
    selection.selectAccount("unknown");
    expect(selection.selectedAccountId.value).toBe("acc-1");
    scope.stop();
  });
  it("reconciles selection after changing child, closing accounts and archiving children", async () => {
    const { selection, accounts, childUsers, scope } = setup();
    selection.selectChild("child-2");
    await nextTick();
    expect(selection.selectedAccountId.value).toBe("acc-2");
    accounts.value = [first];
    await nextTick();
    expect(selection.selectedAccount.value).toBeNull();
    childUsers.value = [childUsers.value[0]];
    await nextTick();
    expect(selection.selectedChildId.value).toBe("child-1");
    expect(selection.selectedAccountId.value).toBe("acc-1");
    scope.stop();
  });
  it("clears session selection and scopes child accounts without a parent child list", async () => {
    const { selection, user, scope } = setup();
    user.value = { id: "child-2", name: "小米", role: "child" };
    await nextTick();
    expect(selection.selectedChild.value?.id).toBe("child-2");
    expect(selection.selectedAccountId.value).toBe("acc-2");
    selection.selectChild("child-1");
    expect(selection.selectedChildId.value).toBe("child-2");
    user.value = null;
    await nextTick();
    expect(selection.selectedAccountId.value).toBeNull();
    expect(selection.selectedChildId.value).toBeNull();
    scope.stop();
  });
});
