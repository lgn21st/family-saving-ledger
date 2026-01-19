import { render, screen } from "@testing-library/vue";
import { describe, expect, it, vi } from "vitest";

import AppShell from "../components/AppShell.vue";

describe("AppShell", () => {
  it("renders header, status, and slot content", () => {
    render(AppShell, {
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
        onToggleChildManager: vi.fn(),
        onLogout: vi.fn(),
        status: "提示",
        statusTone: "text-rose-600",
      },
      slots: {
        default: "<div>内容</div>",
      },
    });

    expect(screen.getByText("爸爸")).toBeTruthy();
    expect(screen.getByText("提示")).toBeTruthy();
    expect(screen.getByText("内容")).toBeTruthy();
  });
});
