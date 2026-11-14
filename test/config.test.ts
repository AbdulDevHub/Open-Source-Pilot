import { describe, expect, it } from "vitest";
import config from "../pilot.config.json" with { type: "json" };

describe("pilot.config.json", () => {
  it("has the required settings", () => {
    expect(config.labels.length).toBeGreaterThan(0);
    expect(typeof config.coAuthor).toBe("boolean");
    expect(Array.isArray(config.languages)).toBe(true);
  });
});
