import { describe, expect, it } from "vitest";
import { firstResponseHours, isClaimComment, median, toIssue, type RawIssue, type RawPr } from "../src/signals.js";

const NOW = new Date("2026-11-13T12:00:00Z");
const pr = (over: Partial<RawPr> = {}): RawPr => ({
  createdAt: "2026-11-10T00:00:00Z",
  state: "OPEN",
  mergedAt: null,
  closedAt: null,
  authorAssociation: "CONTRIBUTOR",
  author: { login: "someone", __typename: "User" },
  comments: { nodes: [] },
  reviews: { nodes: [] },
  ...over,
});

describe("median", () => {
  it("handles odd, even and empty lists", () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

describe("firstResponseHours", () => {
  it("uses the earliest maintainer comment or review", () => {
    const p = pr({
      comments: {
        nodes: [
          { createdAt: "2026-11-10T01:00:00Z", authorAssociation: "CONTRIBUTOR" },
          { createdAt: "2026-11-10T06:00:00Z", authorAssociation: "MEMBER" },
        ],
      },
      reviews: { nodes: [{ submittedAt: "2026-11-10T03:00:00Z", authorAssociation: "OWNER" }] },
    });
    expect(firstResponseHours(p, NOW)).toBe(3);
  });

  it("counts a merge as a response", () => {
    expect(firstResponseHours(pr({ state: "MERGED", mergedAt: "2026-11-11T00:00:00Z" }), NOW)).toBe(24);
  });

  it("is unknown for a young unanswered PR and capped for an old one", () => {
    expect(firstResponseHours(pr(), NOW)).toBeNull();
    expect(firstResponseHours(pr({ createdAt: "2026-10-01T00:00:00Z" }), NOW)).toBe(14 * 24);
  });
});

describe("isClaimComment", () => {
  it.each([
    "Can I work on this?",
    "I'd like to take this one",
    "I’d like to work on this",
    "Please assign this to me",
    "I'm working on it",
    "Can I get assigned?",
  ])(
    "detects %s",
    (body) => expect(isClaimComment(body)).toBe(true),
  );

  it.each([
    "This also happens on Linux.",
    "Thanks for the report!",
    "Can I get a hint on where this lives?",
    "I'm working on a similar bug elsewhere",
  ])("ignores %s", (body) =>
    expect(isClaimComment(body)).toBe(false),
  );
});

describe("toIssue", () => {
  const raw = (over: Partial<RawIssue> = {}): RawIssue => ({
    number: 7,
    title: "Bug",
    url: "https://github.com/a/b/issues/7",
    createdAt: "2026-11-12T00:00:00Z",
    body: "Steps:\n```\nrun it\n```",
    assignees: { totalCount: 0 },
    labels: { nodes: [{ name: "good first issue" }] },
    comments: { nodes: [] },
    timelineItems: { nodes: [] },
    ...over,
  });

  it("flags an open linked PR but not a closed one", () => {
    const linked = (state: string) =>
      raw({ timelineItems: { nodes: [{ __typename: "CrossReferencedEvent", source: { __typename: "PullRequest", state } }] } });
    expect(toIssue("a/b", linked("OPEN")).hasOpenLinkedPr).toBe(true);
    expect(toIssue("a/b", linked("CLOSED")).hasOpenLinkedPr).toBe(false);
  });

  it("ignores claims made by maintainers", () => {
    const comments = (authorAssociation: string) =>
      raw({ comments: { nodes: [{ body: "I'll take this", authorAssociation, author: { login: "x" } }] } });
    expect(toIssue("a/b", comments("NONE")).claimed).toBe(true);
    expect(toIssue("a/b", comments("MEMBER")).claimed).toBe(false);
  });

  it("detects code blocks", () => {
    expect(toIssue("a/b", raw()).hasCodeBlock).toBe(true);
  });
});
