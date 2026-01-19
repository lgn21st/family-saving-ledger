import { describe, expect, it } from "vitest";

import { avatarOptions, supportedCurrencies } from "../config";

describe("config exports", () => {
  it("exposes avatar options and currencies", () => {
    expect(Array.isArray(avatarOptions)).toBe(true);
    expect(avatarOptions.length).toBeGreaterThan(0);
    expect(supportedCurrencies).toEqual(["SGD", "CNY"]);
  });
});
