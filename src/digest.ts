import type { RankedIssue } from "./types.js";

/** Title of the one rolling digest issue the Action keeps up to date. */
export const DIGEST_TITLE = "Open source picks";

const hours = (h: number | null) => (h === null ? "?" : h < 48 ? `${Math.round(h)}h` : `${Math.round(h / 24)}d`);
const pct = (x: number | null) => (x === null ? "?" : `${Math.round(x * 100)}%`);
const escapeCell = (s: string) => s.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();

function policyNote(r: RankedIssue): string {
  if (r.repo.policy.class === "disclosure-required") return "disclose AI help";
  if (r.repo.policy.class === "unknown") return "read AI rules";
  return "";
}

/** Markdown body for the digest issue. */
export function renderDigest(top: RankedIssue[], generatedAt: Date): string {
  const lines = [
    `Ranked by merge likelihood on ${generatedAt.toISOString().slice(0, 10)}. Pick one and ask Claude to claim it in this repo.`,
    "",
    "| # | Score | Issue | Lang | Reply | Outside merge rate | Note |",
    "|---|---|---|---|---|---|---|",
    ...top.map(
      (r, i) =>
        `| ${i + 1} | ${r.score} | [${escapeCell(`${r.issue.repo}#${r.issue.number}`)}](${r.issue.url}) ${escapeCell(r.issue.title)} | ${r.repo.language ?? "?"} | ${hours(r.repo.medianResponseHours)} | ${pct(r.repo.outsideMergeRate)} | ${policyNote(r)} |`,
    ),
  ];
  if (top.length === 0) lines.push("", "No issues passed the filters today.");
  return lines.join("\n");
}
