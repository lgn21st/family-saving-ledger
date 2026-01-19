import { render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import LoginPanel from "../components/LoginPanel.vue";

describe("LoginPanel", () => {
  it("renders login users and emits pin updates", async () => {
    const user = userEvent.setup();
    const onSelectLoginUser = vi.fn();
    const onLogin = vi.fn();
    const onUpdateLoginPin = vi.fn();

    render(LoginPanel, {
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

    const input = screen.getByPlaceholderText("PIN");
    await user.type(input, "12a");
    expect(onUpdateLoginPin).toHaveBeenLastCalledWith("12");
  });
});
