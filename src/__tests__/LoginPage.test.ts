import { render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import LoginPage from "../components/LoginPage.vue";

describe("LoginPage", () => {
  it("forwards login interactions", async () => {
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
        selectedLoginUserId: "u-1",
        loginPin: "",
        loading: false,
        selectedLoginUser: { id: "u-1", name: "小乐", role: "child" },
        sessionStatus: null,
        status: null,
        avatarOptions: [],
        sanitizePin: (value: string) => value.replace(/\D/g, ""),
        onSelectLoginUser,
        onLogin,
        "onUpdate:loginPin": onUpdateLoginPin,
      },
    });

    await user.click(screen.getByRole("button", { name: "爸爸" }));
    expect(onSelectLoginUser).toHaveBeenCalledWith("u-2");

    await user.type(screen.getByPlaceholderText("PIN"), "12a");
    expect(onUpdateLoginPin).toHaveBeenLastCalledWith("12");

    await user.type(screen.getByPlaceholderText("PIN"), "1234");
    await user.click(screen.getByRole("button", { name: "登录 小乐" }));
    expect(onUpdateLoginPin).toHaveBeenCalled();
  });
});
