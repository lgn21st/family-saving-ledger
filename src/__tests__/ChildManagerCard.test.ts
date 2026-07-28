import { render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ChildManagerCard from "../components/ChildManagerCard.vue";

const avatarOptions = [
  { id: "child-1", label: "小可爱", role: "child", imagePath: "/a.png" },
];

describe("ChildManagerCard", () => {
  it("emits updates for creation inputs and avatar selection", async () => {
    const user = userEvent.setup();
    const onCreateChild = vi.fn();
    const onUpdateName = vi.fn();
    const onUpdatePin = vi.fn();
    const onUpdateAvatar = vi.fn();

    render(ChildManagerCard, {
      props: {
        childUsers: [],
        childAvatars: avatarOptions,
        avatarOptions,
        newChildName: "",
        newChildPin: "",
        newChildAvatarId: "",
        editingChildId: null,
        editingChildName: "",
        loading: false,
        sanitizePin: (value: string) => value.replace(/\D/g, ""),
        onCreateChild,
        onStartEditChild: vi.fn(),
        onUpdateChild: vi.fn(),
        onCancelEditChild: vi.fn(),
        onArchiveChild: vi.fn(),
        "onUpdate:newChildName": onUpdateName,
        "onUpdate:newChildPin": onUpdatePin,
        "onUpdate:newChildAvatarId": onUpdateAvatar,
        "onUpdate:editingChildName": vi.fn(),
      },
    });

    await user.type(screen.getByPlaceholderText("孩子姓名"), "小乐");
    expect(onUpdateName).toHaveBeenLastCalledWith("小乐");

    await user.type(screen.getByPlaceholderText("PIN（4 位）"), "12a");
    expect(onUpdatePin).toHaveBeenLastCalledWith("12");

    await user.click(screen.getByRole("button", { name: /小可爱/ }));
    expect(onUpdateAvatar).toHaveBeenCalledWith("child-1");

    await user.click(screen.getByRole("button", { name: "创建孩子" }));
    expect(onCreateChild).toHaveBeenCalled();
  });

  it("supports edit and archive actions", async () => {
    const user = userEvent.setup();
    const onStartEditChild = vi.fn();
    const onUpdateChild = vi.fn();
    const onCancelEditChild = vi.fn();
    const onArchiveChild = vi.fn();

    render(ChildManagerCard, {
      props: {
        childUsers: [{ id: "child-1", name: "小乐", role: "child" }],
        childAvatars: avatarOptions,
        avatarOptions,
        newChildName: "",
        newChildPin: "",
        newChildAvatarId: "child-1",
        editingChildId: null,
        editingChildName: "",
        loading: false,
        sanitizePin: (value: string) => value,
        onCreateChild: vi.fn(),
        onStartEditChild,
        onUpdateChild,
        onCancelEditChild,
        onArchiveChild,
      },
    });

    await user.click(screen.getByRole("button", { name: "编辑" }));
    expect(onStartEditChild).toHaveBeenCalledWith({
      id: "child-1",
      name: "小乐",
      role: "child",
    });

    await user.click(screen.getByRole("button", { name: "归档" }));
    await user.click(screen.getByRole("button", { name: "确认归档" }));
    expect(onArchiveChild).toHaveBeenCalledWith("child-1");

    render(ChildManagerCard, {
      props: {
        childUsers: [{ id: "child-1", name: "小乐", role: "child" }],
        childAvatars: avatarOptions,
        avatarOptions,
        newChildName: "",
        newChildPin: "",
        newChildAvatarId: "child-1",
        editingChildId: "child-1",
        editingChildName: "小乐",
        loading: false,
        sanitizePin: (value: string) => value,
        onCreateChild: vi.fn(),
        onStartEditChild,
        onUpdateChild,
        onCancelEditChild,
        onArchiveChild,
      },
    });

    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(onUpdateChild).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(onCancelEditChild).toHaveBeenCalled();
  });
});
