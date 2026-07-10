import { render, screen } from "@testing-library/vue";
import { describe, expect, it } from "vitest";

import AccountTrendCard from "../components/AccountTrendCard.vue";

describe("AccountTrendCard", () => {
  it("shows empty state without enough chart points", () => {
    render(AccountTrendCard, {
      props: {
        chartPoints: [],
        currency: "CNY",
      },
    });

    expect(screen.getByText("暂无数据")).toBeTruthy();
    expect(screen.getByText("CNY")).toBeTruthy();
  });

  it("renders an accessible step chart and balance summary", () => {
    render(AccountTrendCard, {
      props: {
        chartPoints: [
          { date: new Date("2024-01-01T00:00:00Z"), balance: 100 },
          { date: new Date("2024-01-15T00:00:00Z"), balance: 125 },
          { date: new Date("2024-01-30T00:00:00Z"), balance: 110 },
        ],
        currency: "SGD",
      },
    });

    expect(screen.getByText("+10.00")).toBeTruthy();
    expect(screen.getByText("125.00")).toBeTruthy();
    expect(screen.getByText("100.00")).toBeTruthy();
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain(
      "变化到 110.00 SGD",
    );
    expect(document.querySelectorAll("path")).toHaveLength(2);
  });
});
