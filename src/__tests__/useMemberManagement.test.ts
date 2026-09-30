import type { LedgerActionResult } from "../types";
import { describe, expect, it, vi } from "vitest";
import { useMemberManagement } from "../features/useMemberManagement";

const setup = () => {
  const services = {
    createChild: vi.fn(async (): Promise<LedgerActionResult> => ({ ok: true })),
    updateChildName: vi.fn(async (): Promise<LedgerActionResult> => ({ ok: true })),
    archiveChild: vi.fn(async (): Promise<LedgerActionResult> => ({ ok: true })),
    setErrorStatus: vi.fn(),
    setSuccessStatus: vi.fn(),
    defaultAvatarId: "child-1",
  };
  return { services, form: useMemberManagement(services) };
};
describe("useMemberManagement", () => {
  it("owns and validates the creation draft before sending explicit values", async () => {
    const { services, form } = setup();
    await form.handleCreateChild();
    expect(services.setErrorStatus).toHaveBeenCalledWith("请输入孩子姓名。");
    form.newChildName.value = " 小宝 ";
    form.newChildPin.value = "abcd";
    await form.handleCreateChild();
    expect(services.setErrorStatus).toHaveBeenLastCalledWith(
      "请输入 4 位 PIN。",
    );
    expect(services.createChild).not.toHaveBeenCalled();
    form.newChildPin.value = "1234";
    form.newChildAvatarId.value = "child-2";
    await form.handleCreateChild();
    expect(services.createChild).toHaveBeenCalledWith({
      name: "小宝",
      pin: "1234",
      avatarId: "child-2",
    });
    expect(form.newChildName.value).toBe("");
    expect(form.newChildPin.value).toBe("");
    expect(form.newChildAvatarId.value).toBe("child-1");
    expect(form.loading.value).toBe(false);
    expect(services.setSuccessStatus).toHaveBeenCalledWith("孩子用户已创建。");
  });
  it("preserves a rejected draft and owns its editing lifecycle", async () => {
    const { services, form } = setup();
    form.startEditChild({ id: "child-1", name: "小乐", role: "child" });
    form.editingChildName.value = " ";
    await form.handleUpdateChild();
    expect(services.updateChildName).not.toHaveBeenCalled();
    form.editingChildName.value = "小宝";
    services.updateChildName.mockResolvedValueOnce({
      ok: false,
      message: "失败",
    });
    await form.handleUpdateChild();
    expect(form.editingChildName.value).toBe("小宝");
    expect(services.setErrorStatus).toHaveBeenCalledWith("失败");
    await form.handleUpdateChild();
    expect(services.updateChildName).toHaveBeenCalledWith("child-1", "小宝");
    expect(form.editingChildId.value).toBeNull();
  });
  it("archives through the capability and clears only the archived member editor", async () => {
    const { services, form } = setup();
    form.startEditChild({ id: "child-1", name: "小乐", role: "child" });
    services.archiveChild.mockResolvedValueOnce({
      ok: false,
      message: "余额未清零",
    });
    await form.handleArchiveChild("child-1");
    expect(form.editingChildId.value).toBe("child-1");
    await form.handleArchiveChild("child-1");
    expect(services.archiveChild).toHaveBeenCalledWith("child-1");
    expect(form.editingChildId.value).toBeNull();
    expect(services.setSuccessStatus).toHaveBeenCalledWith(
      "孩子及其账户已归档，账本记录已保留。",
    );
  });
  it("does not share drafts or busy state between instances", async () => {
    const first = setup();
    const second = setup();
    first.form.newChildName.value = "正在保存的孩子";
    first.form.newChildPin.value = "1234";
    let finish!: (value: { ok: true }) => void;
    first.services.createChild.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const saving = first.form.handleCreateChild();
    await first.form.handleCreateChild();
    expect(first.services.createChild).toHaveBeenCalledTimes(1);
    expect(first.form.loading.value).toBe(true);
    expect(second.form.loading.value).toBe(false);
    expect(second.form.newChildName.value).toBe("");
    finish({ ok: true });
    await saving;
  });
});
