import { describe, expect, it } from "vitest";

import {
  addZonedDays,
  endOfZonedDay,
  startOfZonedDay,
} from "../utils/timezone";

describe("timezone helpers", () => {
  it("resolves Singapore midnight as the previous UTC afternoon", () => {
    const instant = new Date("2024-01-30T12:00:00Z");
    const start = startOfZonedDay(instant, "Asia/Singapore");

    expect(start.toISOString()).toBe("2024-01-29T16:00:00.000Z");
    expect(addZonedDays(start, 1, "Asia/Singapore").toISOString()).toBe(
      "2024-01-30T16:00:00.000Z",
    );
    expect(endOfZonedDay(start, "Asia/Singapore").toISOString()).toBe(
      "2024-01-30T15:59:59.999Z",
    );
  });
});
