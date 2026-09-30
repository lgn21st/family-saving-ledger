import { render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import MemberManagement from "../features/MemberManagement.vue";
import type { AppUser } from "../types";

const setup = (children: AppUser[] = []) => {
  const services = {
    childUsers: ref(children),
    createChild: vi.fn(async () => ({ ok: true as const })),
    updateChildName: vi.fn(async () => ({ ok: true as const })),
    archiveChild: vi.fn(async () => ({ ok: true as const })),
    setErrorStatus: vi.fn(),
    setSuccessStatus: vi.fn(),
  };
  render(MemberManagement, { props: { services } });
  return services;
};
describe("MemberManagement", () => {
  it("owns creation inputs, sanitizes PIN and submits the selected avatar", async () => {
    const user = userEvent.setup();
    const services = setup();
    await user.type(screen.getByLabelText("孩子姓名"), "小乐");
    await user.type(screen.getByLabelText("4 位登录 PIN"), "12a");
    expect(screen.getByLabelText("4 位登录 PIN")).toHaveValue("12");
    await user.type(screen.getByLabelText("4 位登录 PIN"), "34");
    await user.click(screen.getByRole("button", { name: /小天使/ }));
    await user.click(screen.getByRole("button", { name: "创建孩子" }));
    expect(services.createChild).toHaveBeenCalledWith({ name: "小乐", pin: "1234", avatarId: "child-2" });
    expect(screen.getByLabelText("孩子姓名")).toHaveValue("");
    expect(screen.getByLabelText("4 位登录 PIN")).toHaveValue("");
  });
  it("edits names and requires confirmation for archive, restoring focus on cancel", async () => {
    const user = userEvent.setup();
    const services = setup([{ id: "child-1", name: "小乐", role: "child" }]);
    await user.click(screen.getByRole("button", { name: "编辑" }));
    await user.clear(screen.getByLabelText("孩子姓名"));
    await user.type(screen.getByLabelText("孩子姓名"), "小宝");
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(services.updateChildName).toHaveBeenCalledWith("child-1", "小宝");
    const trigger = screen.getByRole("button", { name: "归档" });
    await user.click(trigger);
    expect(services.archiveChild).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(trigger).toHaveFocus();
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "确认归档" }));
    expect(services.archiveChild).toHaveBeenCalledWith("child-1");
  });
});
