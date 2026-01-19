import { render, screen } from "@testing-library/vue";
import { describe, expect, it } from "vitest";

import CurrencySummaryGrid from "../components/CurrencySummaryGrid.vue";

describe("CurrencySummaryGrid", () => {
  it("renders totals by currency", () => {
    render(CurrencySummaryGrid, {
      props: {
        currencyTotals: { CNY: 10, SGD: 5 },
        formatAmount: (amount: number, currency: string) =>
          `${amount.toFixed(2)} ${currency}`,
      },
    });

    expect(screen.getByText("CNY 资产总览")).toBeTruthy();
    expect(screen.getByText("10.00 CNY")).toBeTruthy();
    expect(screen.getByText("SGD 资产总览")).toBeTruthy();
    expect(screen.getByText("5.00 SGD")).toBeTruthy();
  });
});
