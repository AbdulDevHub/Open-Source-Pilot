import { classifyPolicy } from "./policy.js";
import type { CiState, IssueCandidate, RepoSignals } from "./types.js";

// Shapes of the GraphQL repo node fetched in search.ts.
export interface RawActor {
  login: string;
  __typename?: string;
}
export interface RawPr {
  createdAt: string;
  state: "OPEN" | "MERGED" | "CLOSED";
  mergedAt: string | null;
  closedAt: string | null;
  authorAssociation: string;
  author: RawActor | null;
  comments: { nodes: { createdAt: string; authorAssociation: string }[] };
  reviews: { nodes: { submittedAt: string | null; authorAssociation: string }[] };
}
export interface RawIssue {
  number: number;
  title: string;
  url: string;
  createdAt: string;
  body: string;
  assignees: { totalCount: number };
  labels: { nodes: { name: string }[] };
  comments: { nodes: { body: string; authorAssociation: string; author: RawActor | null }[] };
  timelineItems: {
    nodes: {
      __typename: string;
      source?: { __typename: string; state?: string };
      subject?: { __typename: string; state?: string };
    }[];
  };
}
export interface RawRepo {
  nameWithOwner: string;
  stargazerCount: number;
  isArchived: boolean;
  primaryLanguage: { name: string } | null;
  defaultBranchRef: { target: { statusCheckRollup?: { state: CiState } | null } | null } | null;
  merged: { nodes: { mergedAt: string; authorAssociation: string; author: RawActor | null }[] };
  recent: { nodes: RawPr[] };
  issues: { nodes: RawIssue[] };
  [policyAlias: `p${number}`]: { text: string | null } | null;
}

const MAINTAINER = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** Unanswered PRs older than this count as this slow. */
export const RESPONSE_CAP_HOURS = 14 * 24;

const isBot = (a: RawActor | null) => !a || a.__typename === "Bot" || a.login.endsWith("[bot]");
const isOutside = (association: string, author: RawActor | null) =>
  !MAINTAINER.has(association) && !isBot(author);

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** Hours from PR creation to the first maintainer comment/review, or to merge/close. */
export function firstResponseHours(pr: RawPr, now: Date): number | null {
  const times = [
    ...pr.comments.nodes.filter((c) => MAINTAINER.has(c.authorAssociation)).map((c) => c.createdAt),
    ...pr.reviews.nodes
      .filter((r) => MAINTAINER.has(r.authorAssociation) && r.submittedAt)
      .map((r) => r.submittedAt!),
    pr.mergedAt,
    pr.closedAt,
  ]
    .filter((t): t is string => !!t)
    .map((t) => Date.parse(t));
  const created = Date.parse(pr.createdAt);
  if (times.length > 0) return Math.max(0, (Math.min(...times) - created) / HOUR);
  const waited = (now.getTime() - created) / HOUR;
  // Still waiting: only count it once it's clearly slow, otherwise it's not known yet.
  return waited >= RESPONSE_CAP_HOURS ? RESPONSE_CAP_HOURS : null;
}

const CLAIM =
  /\b(i(['’]?d| would) (like|love) to (work|take|try|tackle|help)|(can|could|may) i (work on|take|try|tackle|pick|get (assigned|this)|be assigned)|(please )?assign (it |this )?(issue )?(to )?me|i(['’]?ll| will) (take|work on|pick|tackle)|i(['’]?m| am) (working on (this|it)|taking (this|it)|on it)|let me (work|take|try)|i want to (work on|take|contribute))\b/i;

export function isClaimComment(body: string): boolean {
  return CLAIM.test(body);
}

export function toIssue(repo: string, raw: RawIssue): IssueCandidate {
  const prRefs = raw.timelineItems.nodes
    .map((n) => n.source ?? n.subject)
    .filter((s) => s?.__typename === "PullRequest");
  return {
    repo,
    number: raw.number,
    title: raw.title,
    url: raw.url,
    createdAt: raw.createdAt,
    labels: raw.labels.nodes.map((l) => l.name),
    bodyLength: raw.body.trim().length,
    hasCodeBlock: /```|^ {4}\S/m.test(raw.body),
    assigned: raw.assignees.totalCount > 0,
    hasOpenLinkedPr: prRefs.some((s) => s?.state === "OPEN"),
    claimed: raw.comments.nodes.some(
      (c) => isOutside(c.authorAssociation, c.author) && isClaimComment(c.body),
    ),
  };
}

export function toSignals(raw: RawRepo, policyPaths: readonly string[], now: Date): RepoSignals {
  const mergedTimes = raw.merged.nodes.map((n) => Date.parse(n.mergedAt));
  const outsideMerged90d = raw.merged.nodes.filter(
    (n) => isOutside(n.authorAssociation, n.author) && now.getTime() - Date.parse(n.mergedAt) <= 90 * DAY,
  ).length;

  const outsidePrs = raw.recent.nodes.filter((p) => isOutside(p.authorAssociation, p.author));
  const done = outsidePrs.filter((p) => p.state !== "OPEN");
  const merged = done.filter((p) => p.state === "MERGED").length;
  const responses = outsidePrs
    .map((p) => firstResponseHours(p, now))
    .filter((h): h is number => h !== null);

  const docs = policyPaths
    .map((path, i) => ({ path, text: raw[`p${i}`]?.text ?? null }))
    .filter((d): d is { path: string; text: string } => !!d.text);

  return {
    repo: raw.nameWithOwner,
    stars: raw.stargazerCount,
    language: raw.primaryLanguage?.name ?? null,
    archived: raw.isArchived,
    lastMergeAt: mergedTimes.length ? new Date(Math.max(...mergedTimes)).toISOString() : null,
    outsideMerged90d,
    outsideMergeRate: done.length >= 3 ? merged / done.length : null,
    medianResponseHours: responses.length >= 2 ? median(responses) : null,
    ciState: raw.defaultBranchRef?.target?.statusCheckRollup?.state ?? null,
    policy: classifyPolicy(docs),
  };
}
