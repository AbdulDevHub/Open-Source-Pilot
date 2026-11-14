import type { IssueCandidate, PilotConfig, RankedIssue, RepoSignals, ScoreBreakdown } from "./types.js";

/** Weights sum to 100, so the score reads as a percentage. */
export const WEIGHTS: Record<keyof ScoreBreakdown, number> = {
  responsiveness: 25,
  mergeRate: 20,
  outsideMerges: 15,
  beginner: 10,
  activity: 10,
  freshness: 10,
  ci: 5,
  clarity: 5,
};

/** Labels that mark an issue as meant for newcomers (vs plain "help wanted"). */
const BEGINNER_LABEL = /good[ _-]?first|first[ _-]?timers?|beginner|starter|easy|newcomer|low[ _-]hanging/i;

export function beginnerScore(labels: string[]): number {
  return labels.some((l) => BEGINNER_LABEL.test(l)) ? 1 : 0.3;
}

/** A repo counts as active when something was merged within this many days. */
export const ACTIVE_DAYS = 30;
const DAY = 86_400_000;
const NEUTRAL = 0.5;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const daysSince = (iso: string, now: Date) => (now.getTime() - Date.parse(iso)) / DAY;

/** 1 at <=24h, 0 at >=14 days, log-scaled in between. Unknown is neutral. */
export function responsivenessScore(hours: number | null): number {
  if (hours === null) return NEUTRAL;
  if (hours <= 24) return 1;
  return clamp01(1 - Math.log(hours / 24) / Math.log(14));
}

export function breakdown(
  issue: IssueCandidate,
  repo: RepoSignals,
  cfg: Pick<PilotConfig, "maxIssueAgeDays">,
  now: Date,
): ScoreBreakdown {
  const ci =
    repo.ciState === "SUCCESS" ? 1 : repo.ciState === "FAILURE" || repo.ciState === "ERROR" ? 0 : NEUTRAL;
  return {
    responsiveness: responsivenessScore(repo.medianResponseHours),
    mergeRate: repo.outsideMergeRate ?? NEUTRAL,
    outsideMerges: clamp01(repo.outsideMerged90d / 10),
    beginner: beginnerScore(issue.labels),
    activity: repo.lastMergeAt ? clamp01(1 - (daysSince(repo.lastMergeAt, now) - 3) / (ACTIVE_DAYS - 3)) : 0,
    ci,
    freshness: clamp01(1 - daysSince(issue.createdAt, now) / cfg.maxIssueAgeDays),
    clarity: clamp01(issue.bodyLength / 400) * 0.7 + (issue.hasCodeBlock ? 0.3 : 0),
  };
}

export function totalScore(b: ScoreBreakdown): number {
  let total = 0;
  for (const key of Object.keys(WEIGHTS) as (keyof ScoreBreakdown)[]) total += WEIGHTS[key] * b[key];
  return Math.round(total);
}

/** Why an issue should not be shown at all, or null when it is a fair candidate. */
export function exclusionReason(
  issue: IssueCandidate,
  repo: RepoSignals,
  cfg: Pick<PilotConfig, "minStars" | "maxIssueAgeDays">,
  now: Date,
): string | null {
  if (repo.archived) return "archived repo";
  if (repo.policy.class === "banned") return "repo bans AI-assisted contributions";
  if (repo.stars < cfg.minStars) return `under ${cfg.minStars} stars`;
  if (!repo.lastMergeAt || daysSince(repo.lastMergeAt, now) > ACTIVE_DAYS) return "no merge in 30 days";
  if (issue.assigned) return "assigned";
  if (issue.hasOpenLinkedPr) return "has an open PR";
  if (issue.claimed) return "claimed in comments";
  if (daysSince(issue.createdAt, now) > cfg.maxIssueAgeDays) return "too old";
  return null;
}

/** Take the top `size` issues, at most `perRepo` from any one repo, so one busy repo can't fill the list. */
export function diversify(ranked: RankedIssue[], size: number, perRepo = 2): RankedIssue[] {
  const counts = new Map<string, number>();
  const out: RankedIssue[] = [];
  for (const r of ranked) {
    const n = counts.get(r.repo.repo) ?? 0;
    if (n >= perRepo) continue;
    counts.set(r.repo.repo, n + 1);
    out.push(r);
    if (out.length === size) break;
  }
  return out;
}

export function rankIssues(
  pairs: { issue: IssueCandidate; repo: RepoSignals }[],
  cfg: Pick<PilotConfig, "minStars" | "maxIssueAgeDays">,
  now: Date,
): { ranked: RankedIssue[]; excluded: { issue: IssueCandidate; reason: string }[] } {
  const ranked: RankedIssue[] = [];
  const excluded: { issue: IssueCandidate; reason: string }[] = [];
  for (const { issue, repo } of pairs) {
    const reason = exclusionReason(issue, repo, cfg, now);
    if (reason) {
      excluded.push({ issue, reason });
      continue;
    }
    const b = breakdown(issue, repo, cfg, now);
    ranked.push({ issue, repo, score: totalScore(b), breakdown: b });
  }
  ranked.sort((a, b) => b.score - a.score || Date.parse(b.issue.createdAt) - Date.parse(a.issue.createdAt));
  return { ranked, excluded };
}
