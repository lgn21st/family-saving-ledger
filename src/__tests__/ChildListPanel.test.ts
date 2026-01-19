import { render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ChildListPanel from "../components/ChildListPanel.vue";

const avatarOptions = [
  { id: "child-1", label: "小可爱", role: "child", imagePath: "/a.png" },
];

describe("ChildListPanel", () => {
  it("shows empty state when no children exist", () => {
    render(ChildListPanel, {
      props: {
        childUsers: [],
        selectedChildId: null,
        avatarOptions,
        onSelectChild: vi.fn(),
      },
    });

    expect(screen.getByText("暂无孩子，请先创建。")).toBeTruthy();
  });

  it("selects a child", async () => {
    const user = userEvent.setup();
    const onSelectChild = vi.fn();

    render(ChildListPanel, {
      props: {
        childUsers: [{ id: "child-1", name: "小乐", role: "child" }],
        selectedChildId: null,
        avatarOptions,
        onSelectChild,
      },
    });

    await user.click(screen.getByRole("button", { name: /小乐/ }));
    expect(onSelectChild).toHaveBeenCalledWith("child-1");
  });
});
