import { nextTick } from "vue";
import { describe, expect, it, vi } from "vitest";

import { useStatus } from "../composables/useStatus";

describe("useStatus", () => {
  it("maps error messages and marks tone as error", async () => {
    const { status, statusTone, setErrorStatus } = useStatus();

    setErrorStatus("Insufficient balance");
    await nextTick();

    expect(status.value).toBe("余额不足。");
    expect(statusTone.value).toBe("error");
  });

  it("maps archive and close-account business errors", () => {
    const { status, setErrorStatus } = useStatus();

    setErrorStatus("Account balance must be zero before closing");
    expect(status.value).toBe("请先将账户余额清零后再关闭。");

    setErrorStatus("All child account balances must be zero before archiving");
    expect(status.value).toBe("请先将该孩子所有账户余额清零后再归档。");
  });

  it("auto clears success and error messages with different timeouts", async () => {
    vi.useFakeTimers();
    const { status, setSuccessStatus, setErrorStatus } = useStatus();

    setSuccessStatus("已保存交易。");
    await nextTick();
    vi.advanceTimersByTime(1500);
    await nextTick();
    expect(status.value).toBeNull();

    setErrorStatus("Insufficient balance");
    await nextTick();
    vi.advanceTimersByTime(3000);
    await nextTick();
    expect(status.value).toBeNull();

    vi.useRealTimers();
  });
});
