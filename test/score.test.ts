import { describe, expect, it } from "vitest";
import { beginnerScore, breakdown, diversify, exclusionReason, rankIssues, responsivenessScore, totalScore, WEIGHTS } from "../src/score.js";
import type { IssueCandidate, RepoSignals } from "../src/types.js";

const NOW = new Date("2026-11-13T12:00:00Z");
const cfg = { minStars: 50, maxIssueAgeDays: 60 };
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();

const repo = (over: Partial<RepoSignals> = {}): RepoSignals => ({
  repo: "acme/widget",
  stars: 500,
  language: "TypeScript",
  archived: false,
  lastMergeAt: daysAgo(1),
  outsideMerged90d: 10,
  outsideMergeRate: 1,
  medianResponseHours: 12,
  ciState: "SUCCESS",
  policy: { class: "none", evidence: [], files: [] },
  ...over,
});

const issue = (over: Partial<IssueCandidate> = {}): IssueCandidate => ({
  repo: "acme/widget",
  number: 1,
  title: "Fix the thing",
  url: "https://github.com/acme/widget/issues/1",
  createdAt: daysAgo(0),
  labels: ["good first issue"],
  bodyLength: 400,
  hasCodeBlock: true,
  assigned: false,
  hasOpenLinkedPr: false,
  claimed: false,
  ...over,
});

describe("weights", () => {
  it("sum to 100", () => {
    expect(Object.values(WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100);
  });
});

describe("responsivenessScore", () => {
  it("is 1 within a day, 0 at two weeks, neutral when unknown", () => {
    expect(responsivenessScore(3)).toBe(1);
    expect(responsivenessScore(14 * 24)).toBeCloseTo(0);
    expect(responsivenessScore(null)).toBe(0.5);
  });

  it("drops as replies get slower", () => {
    expect(responsivenessScore(48)).toBeGreaterThan(responsivenessScore(7 * 24));
  });
});

describe("scoring", () => {
  it("gives a perfect repo and issue 100", () => {
    expect(totalScore(breakdown(issue(), repo(), cfg, NOW))).toBe(100);
  });

  it("scores unknown signals as neutral, not zero", () => {
    const b = breakdown(issue(), repo({ outsideMergeRate: null, medianResponseHours: null, ciState: null }), cfg, NOW);
    expect(b.mergeRate).toBe(0.5);
    expect(b.responsiveness).toBe(0.5);
    expect(b.ci).toBe(0.5);
  });

  it("ranks a responsive repo above a slow one", () => {
    const fast = { issue: issue({ number: 1 }), repo: repo({ repo: "a/fast" }) };
    const slow = {
      issue: issue({ number: 2 }),
      repo: repo({ repo: "b/slow", medianResponseHours: 10 * 24, outsideMergeRate: 0.2 }),
    };
    const { ranked } = rankIssues([slow, fast], cfg, NOW);
    expect(ranked.map((r) => r.repo.repo)).toEqual(["a/fast", "b/slow"]);
  });
});

describe("beginnerScore", () => {
  it("prefers newcomer labels over plain help wanted", () => {
    expect(beginnerScore(["good first issue"])).toBe(1);
    expect(beginnerScore(["difficulty/easy", "help wanted"])).toBe(1);
    expect(beginnerScore(["help wanted"])).toBeLessThan(1);
  });
});

describe("diversify", () => {
  it("caps issues per repo and keeps rank order", () => {
    const pairs = [1, 2, 3].map((n) => ({ issue: issue({ number: n }), repo: repo() }));
    pairs.push({ issue: issue({ number: 9, repo: "z/other" }), repo: repo({ repo: "z/other", medianResponseHours: 200 }) });
    const { ranked } = rankIssues(pairs, cfg, NOW);
    const top = diversify(ranked, 10, 2);
    expect(top.map((r) => r.repo.repo)).toEqual(["acme/widget", "acme/widget", "z/other"]);
  });
});

describe("exclusionReason", () => {
  it.each<[string, Partial<IssueCandidate>, Partial<RepoSignals>]>([
    ["archived repo", {}, { archived: true }],
    ["repo bans AI-assisted contributions", {}, { policy: { class: "banned", evidence: [], files: [] } }],
    ["under 50 stars", {}, { stars: 10 }],
    ["no merge in 30 days", {}, { lastMergeAt: daysAgo(45) }],
    ["no merge in 30 days", {}, { lastMergeAt: null }],
    ["assigned", { assigned: true }, {}],
    ["has an open PR", { hasOpenLinkedPr: true }, {}],
    ["claimed in comments", { claimed: true }, {}],
    ["too old", { createdAt: daysAgo(90) }, {}],
  ])("excludes: %s", (reason, i, r) => {
    expect(exclusionReason(issue(i), repo(r), cfg, NOW)).toBe(reason);
  });

  it("keeps disclosure-required and unknown repos", () => {
    for (const cls of ["disclosure-required", "unknown"] as const) {
      expect(exclusionReason(issue(), repo({ policy: { class: cls, evidence: [], files: [] } }), cfg, NOW)).toBeNull();
    }
  });
});
