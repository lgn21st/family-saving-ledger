import { render, screen } from "@testing-library/vue";
import { describe, expect, it } from "vitest";

import AccountTrendCard from "../components/AccountTrendCard.vue";

describe("AccountTrendCard", () => {
  it("shows empty state when chart path is missing", () => {
    render(AccountTrendCard, {
      props: {
        chartPath: "",
        currency: "CNY",
      },
    });

    expect(screen.getByText("暂无数据")).toBeTruthy();
    expect(screen.getByText("CNY")).toBeTruthy();
  });

  it("renders sparkline when chart path is provided", () => {
    render(AccountTrendCard, {
      props: {
        chartPath: "M 0 0 L 10 10",
        currency: "SGD",
      },
    });

    const path = document.querySelector("path");
    expect(path?.getAttribute("d")).toBe("M 0 0 L 10 10");
    expect(screen.getByText("SGD")).toBeTruthy();
  });
});
