import { describe, expect, it } from "vitest";

type Transaction = {
  type: "deposit" | "withdrawal" | "transfer_in" | "transfer_out" | "interest";
  note: string | null;
  created_at: string;
};

type Settings = {
  annual_rate: number;
  timezone: string;
};

type InterestResult = {
  startMonth: string;
  monthsToSettle: string[];
  noteByMonth: Record<string, string>;
};

const parseInterestMonth = (note?: string | null) => {
  if (!note) return null;
  const match = note.match(/^(\d{4})年(\d{1,2})月结息/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
  };
};

const monthKey = (year: number, month: number) => {
  return `${year}-${String(month).padStart(2, "0")}`;
};

const monthKeyFromDate = (value: string, timezone: string) => {
  const localDate = new Date(
    new Date(value).toLocaleString("en-US", { timeZone: timezone }),
  );
  return monthKey(localDate.getFullYear(), localDate.getMonth() + 1);
};

const calculateInterestSchedule = (
  transactions: Transaction[],
  now: Date,
  settings: Settings,
): InterestResult => {
  const { timezone, annual_rate } = settings;
  const nowLocal = new Date(
    now.toLocaleString("en-US", { timeZone: timezone }),
  );
  const lastMonthStart = new Date(
    nowLocal.getFullYear(),
    nowLocal.getMonth() - 1,
    1,
  );

  if (transactions.length === 0) {
    return { startMonth: "", monthsToSettle: [], noteByMonth: {} };
  }

  const sorted = [...transactions].sort(
    (left, right) =>
      new Date(left.created_at).getTime() -
      new Date(right.created_at).getTime(),
  );

  const firstMonthKey = monthKeyFromDate(sorted[0].created_at, timezone);
  const firstDate = new Date(`${firstMonthKey}-01T00:00:00`);

  const settledMonths = new Set<string>();
  sorted.forEach((transaction) => {
    if (transaction.type !== "interest") return;
    const parsed = parseInterestMonth(transaction.note);
    const key = parsed
      ? monthKey(parsed.year, parsed.month)
      : monthKeyFromDate(transaction.created_at, timezone);
    settledMonths.add(key);
  });

  let startMonth = firstDate;
  if (settledMonths.size > 0) {
    const latest = Array.from(settledMonths).sort().pop();
    if (latest) {
      startMonth = new Date(`${latest}-01T00:00:00`);
      startMonth.setMonth(startMonth.getMonth() + 1);
    }
  }

  const monthsToSettle: string[] = [];
  const noteByMonth: Record<string, string> = {};
  const cursor = new Date(startMonth);

  while (cursor <= lastMonthStart) {
    const key = monthKey(cursor.getFullYear(), cursor.getMonth() + 1);
    if (!settledMonths.has(key)) {
      monthsToSettle.push(key);
      noteByMonth[key] =
        `${cursor.getFullYear()}年${cursor.getMonth() + 1}月结息，利率 ${annual_rate}%`;
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return {
    startMonth: monthKey(startMonth.getFullYear(), startMonth.getMonth() + 1),
    monthsToSettle,
    noteByMonth,
  };
};

describe("interest settlement schedule", () => {
  it("settles from first transaction month when no interest exists", () => {
    const transactions: Transaction[] = [
      {
        type: "deposit",
        note: "initial",
        created_at: "2024-01-15T10:00:00Z",
      },
    ];
    const result = calculateInterestSchedule(
      transactions,
      new Date("2024-04-10T00:00:00Z"),
      {
        annual_rate: 10,
        timezone: "Asia/Singapore",
      },
    );

    expect(result.startMonth).toBe("2024-01");
    expect(result.monthsToSettle).toEqual(["2024-01", "2024-02", "2024-03"]);
    expect(result.noteByMonth["2024-02"]).toBe("2024年2月结息，利率 10%");
  });

  it("settles from month after latest interest record", () => {
    const transactions: Transaction[] = [
      {
        type: "deposit",
        note: "initial",
        created_at: "2024-01-15T10:00:00Z",
      },
      {
        type: "interest",
        note: "2024年2月结息，利率 8%",
        created_at: "2024-03-01T00:00:00Z",
      },
    ];

    const result = calculateInterestSchedule(
      transactions,
      new Date("2024-05-10T00:00:00Z"),
      {
        annual_rate: 8,
        timezone: "Asia/Singapore",
      },
    );

    expect(result.startMonth).toBe("2024-03");
    expect(result.monthsToSettle).toEqual(["2024-03", "2024-04"]);
    expect(result.noteByMonth["2024-04"]).toBe("2024年4月结息，利率 8%");
  });

  it("skips months already settled", () => {
    const transactions: Transaction[] = [
      {
        type: "deposit",
        note: "initial",
        created_at: "2024-01-15T10:00:00Z",
      },
      {
        type: "interest",
        note: "2024年2月结息，利率 10%",
        created_at: "2024-03-01T00:00:00Z",
      },
      {
        type: "interest",
        note: "2024年3月结息，利率 10%",
        created_at: "2024-04-01T00:00:00Z",
      },
    ];

    const result = calculateInterestSchedule(
      transactions,
      new Date("2024-05-10T00:00:00Z"),
      {
        annual_rate: 10,
        timezone: "Asia/Singapore",
      },
    );

    expect(result.monthsToSettle).toEqual(["2024-04"]);
  });
});
