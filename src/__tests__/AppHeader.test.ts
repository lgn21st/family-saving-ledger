import { render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import AppHeader from "../components/AppHeader.vue";

describe("AppHeader", () => {
  it("renders user info and triggers actions", async () => {
    const user = userEvent.setup();
    const onToggleChildManager = vi.fn();
    const onLogout = vi.fn();

    render(AppHeader, {
      props: {
        user: {
          id: "parent-1",
          name: "爸爸",
          role: "parent",
          pin: "1234",
        },
        avatarOptions: [
          {
            id: "parent-1",
            label: "爸爸微笑",
            role: "parent",
            imagePath: "/a.png",
          },
        ],
        canEdit: true,
        showChildManager: false,
        onToggleChildManager,
        onLogout,
        status: "提示",
        statusTone: "text-rose-600",
      },
    });

    expect(screen.getByText("爸爸")).toBeTruthy();
    expect(screen.getByText("提示")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "管理孩子" }));
    expect(onToggleChildManager).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "退出" }));
    expect(onLogout).toHaveBeenCalled();
  });
});
