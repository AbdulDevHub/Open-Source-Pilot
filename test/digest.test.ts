import { describe, expect, it } from "vitest";
import { applyPrStates, type ContributionLog } from "../src/contributions.js";
import { renderDigest } from "../src/digest.js";
import type { RankedIssue } from "../src/types.js";

const ranked = (over: Partial<RankedIssue["repo"]> = {}): RankedIssue => ({
  issue: {
    repo: "acme/widget",
    number: 7,
    title: "Fix | pipe in title",
    url: "https://github.com/acme/widget/issues/7",
    createdAt: "2026-11-10T00:00:00Z",
    labels: ["good first issue"],
    bodyLength: 100,
    hasCodeBlock: false,
    assigned: false,
    hasOpenLinkedPr: false,
    claimed: false,
  },
  repo: {
    repo: "acme/widget",
    stars: 500,
    language: "Go",
    archived: false,
    lastMergeAt: null,
    outsideMerged90d: 3,
    outsideMergeRate: 0.8,
    medianResponseHours: 5,
    ciState: "SUCCESS",
    policy: { class: "none", evidence: [], files: [] },
    ...over,
  },
  score: 91,
  breakdown: { responsiveness: 1, mergeRate: 1, outsideMerges: 1, beginner: 1, activity: 1, freshness: 1, ci: 1, clarity: 1 },
});

describe("renderDigest", () => {
  it("renders one table row per issue and escapes pipes", () => {
    const md = renderDigest([ranked()], new Date("2026-11-13T00:00:00Z"));
    expect(md).toContain("2026-11-13");
    expect(md).toContain("[acme/widget#7](https://github.com/acme/widget/issues/7) Fix \\| pipe in title | Go | 5h | 80% |");
  });

  it("flags repos that need AI disclosure", () => {
    const md = renderDigest([ranked({ policy: { class: "disclosure-required", evidence: [], files: [] } })], new Date());
    expect(md).toContain("disclose AI help");
  });

  it("says so when nothing passed", () => {
    expect(renderDigest([], new Date())).toContain("No issues passed");
  });
});

describe("applyPrStates", () => {
  const log: ContributionLog = {
    contributions: [
      { repo: "a/b", pr: "https://github.com/a/b/pull/1", title: "t", summary: "s", status: "open", openedAt: "2026-11-01", mergedAt: null },
    ],
  };

  it("marks a merged PR with its date", () => {
    const { log: out, changed } = applyPrStates(log, {
      "https://github.com/a/b/pull/1": { state: "MERGED", mergedAt: "2026-11-12T10:00:00Z" },
    });
    expect(changed).toBe(true);
    expect(out.contributions[0]).toMatchObject({ status: "merged", mergedAt: "2026-11-12" });
  });

  it("reports no change when nothing moved or the PR is unknown", () => {
    expect(applyPrStates(log, { "https://github.com/a/b/pull/1": { state: "OPEN", mergedAt: null } }).changed).toBe(false);
    expect(applyPrStates(log, {}).changed).toBe(false);
  });
});
