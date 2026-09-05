import { render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ConfirmActionDialog from "../components/ConfirmActionDialog.vue";

const dialogProps = () => ({
  titleId: "confirm-title", descriptionId: "confirm-description",
  title: "撤销这笔交易？", description: "交易会标记为已作废。",
  confirmLabel: "确认撤销", onCancel: vi.fn(), onConfirm: vi.fn(),
});

describe("ConfirmActionDialog", () => {
  it("allows dismissal only after a pending confirmation finishes", async () => {
    const user = userEvent.setup();
    let finish!: () => void;
    const props = dialogProps();
    props.onConfirm = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    render(ConfirmActionDialog, { props });
    await user.click(screen.getByRole("button", { name: "确认撤销" }));
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-busy", "true");
    await user.click(screen.getByRole("dialog"));
    await user.keyboard("{Escape}{Tab}{Enter}");
    expect(screen.getByRole("dialog")).toHaveFocus();
    expect(props.onCancel).not.toHaveBeenCalled();
    expect(props.onConfirm).toHaveBeenCalledTimes(1);
    finish();
    await user.keyboard("{Escape}");
    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });

  it("blocks backdrop dismissal while externally loading", async () => {
    const user = userEvent.setup();
    const props = dialogProps();
    const { rerender } = render(ConfirmActionDialog, { props: { ...props, loading: true } });
    await user.click(screen.getByRole("dialog"));
    expect(props.onCancel).not.toHaveBeenCalled();
    await rerender({ loading: false });
    await user.click(screen.getByRole("dialog"));
    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });
});
