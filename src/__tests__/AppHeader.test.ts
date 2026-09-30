import { render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import AppHeader from "../components/AppHeader.vue";

describe("AppHeader", () => {
  it("renders user info and triggers actions", async () => {
    const user = userEvent.setup();
    const onToggleSettings = vi.fn();
    const onLogout = vi.fn();
    const onRefresh = vi.fn();

    const { rerender } = render(AppHeader, {
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
        showSettings: false,
        onToggleSettings,
        onLogout,
        status: "提示",
        statusTone: "error",
        onDismissStatus: vi.fn(),
        refreshState: "idle",
        onRefresh,
      },
    });

    expect(screen.getByText("爸爸")).toBeTruthy();
    expect(screen.getByText("提示")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "打开设置" }));
    expect(onToggleSettings).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "退出" }));
    expect(onLogout).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "刷新账本" }));
    expect(onRefresh).toHaveBeenCalledOnce();
    await rerender({ refreshState: "loading" });
    expect(screen.getByRole("button", { name: "正在刷新账本" })).toBeDisabled();
    await rerender({ refreshState: "error" });
    await user.click(screen.getByRole("button", { name: "重试刷新账本" }));
    expect(onRefresh).toHaveBeenCalledTimes(2);
  });
});
