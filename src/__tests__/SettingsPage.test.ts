import { render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import SettingsPage from "../components/SettingsPage.vue";

describe("SettingsPage", () => {
  it("navigates between independent management features", async () => {
    render(SettingsPage, {
      slots: {
        members:
          '<section><h2>孩子管理</h2><input aria-label="成员草稿" /></section>',
        accounts: "<section><h2>账户列表</h2></section>",
      },
    });
    const user = userEvent.setup();
    expect(screen.getByRole("heading", { name: "设置" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "孩子管理" }),
    ).toBeInTheDocument();
    await user.type(
      screen.getByRole("textbox", { name: "成员草稿" }),
      "未保存姓名",
    );
    await user.click(screen.getByRole("button", { name: "账户" }));
    expect(
      screen.getByRole("heading", { name: "账户列表" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "孩子管理" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "成员" }));
    expect(screen.getByRole("textbox", { name: "成员草稿" })).toHaveValue(
      "未保存姓名",
    );
  });
});
