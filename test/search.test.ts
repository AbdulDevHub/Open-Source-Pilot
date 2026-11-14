import { describe, expect, it } from "vitest";
import { interleave, labelVariants } from "../src/search.js";

describe("interleave", () => {
  it("takes from every list in turn, dedupes and stops at the limit", () => {
    expect(interleave([["a", "b", "c"], ["x", "a", "y"]], 4)).toEqual(["a", "x", "b", "c"]);
  });

  it("handles uneven and empty lists", () => {
    expect(interleave([["a"], [], ["x", "y"]], 10)).toEqual(["a", "x", "y"]);
  });
});

describe("labelVariants", () => {
  it("covers common spellings", () => {
    const v = labelVariants(["good first issue"]);
    expect(v).toEqual(expect.arrayContaining(["good first issue", "Good First Issue", "Good first issue", "good-first-issue"]));
  });
});
