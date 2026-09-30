import { render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import LoginPage from "../components/LoginPage.vue";

describe("LoginPage", () => {
  it("selects a user, sanitizes PIN input and submits login", async () => {
    const user = userEvent.setup();
    const onSelectLoginUser = vi.fn();
    const onLogin = vi.fn();
    const onUpdateLoginPin = vi.fn();

    render(LoginPage, {
      props: {
        isSupabaseConfigured: true,
        loginUsers: [
          { id: "u-1", name: "小乐", role: "child" },
          { id: "u-2", name: "爸爸", role: "parent" },
        ],
        loginUsersState: "ready",
        selectedLoginUserId: "u-1",
        loginPin: "",
        loading: false,
        selectedLoginUser: { id: "u-1", name: "小乐", role: "child" },
        sessionStatus: null,
        status: null,
        avatarOptions: [],
        onSelectLoginUser,
        onLogin,
        onRetry: vi.fn(async () => {}),
        "onUpdate:loginPin": onUpdateLoginPin,
      },
    });

    await user.click(screen.getByRole("button", { name: "爸爸" }));
    expect(onSelectLoginUser).toHaveBeenCalledWith("u-2");

    await user.type(screen.getByPlaceholderText("PIN"), "12a");
    expect(onUpdateLoginPin).toHaveBeenLastCalledWith("12");

    await user.clear(screen.getByPlaceholderText("PIN"));
    await user.type(screen.getByPlaceholderText("PIN"), "1234");
    expect(onUpdateLoginPin).toHaveBeenLastCalledWith("1234");
    await user.click(screen.getByRole("button", { name: "登录 小乐" }));
    expect(onLogin).toHaveBeenCalledOnce();
  });

  it("distinguishes a pending read, a failed read and a confirmed empty ledger", async () => {
    const onRetry = vi.fn(async () => {});
    const { rerender } = render(LoginPage, {
      props: {
        isSupabaseConfigured: true, loginUsers: [], loginUsersState: "loading",
        selectedLoginUserId: null, loginPin: "", loading: false,
        selectedLoginUser: null, sessionStatus: null, status: null, avatarOptions: [],
        onSelectLoginUser: vi.fn(), onLogin: vi.fn(), onRetry,
      },
    });
    expect(screen.getByRole("status")).toHaveTextContent("正在加载家庭成员");
    expect(screen.queryByText(/暂无可登录成员/)).toBeNull();
    await rerender({ loginUsersState: "error" });
    expect(screen.getByRole("alert")).toHaveTextContent("家庭成员加载失败");
    await userEvent.setup().click(screen.getByRole("button", { name: "重新加载成员" }));
    expect(onRetry).toHaveBeenCalledOnce();
    await rerender({ loginUsersState: "ready" });
    expect(screen.getByText("暂无可登录成员，请联系家长检查账本。")).toBeVisible();
    expect(screen.queryByRole("button", { name: "重新加载成员" })).toBeNull();
    await rerender({ isSupabaseConfigured: false, loginUsersState: "loading" });
    expect(screen.getByRole("alert")).toHaveTextContent("请先配置 Supabase 连接后再登录");
  });
});
