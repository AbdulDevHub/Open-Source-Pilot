export type PolicyClass = "banned" | "disclosure-required" | "none" | "unknown";

export interface PolicyResult {
  class: PolicyClass;
  /** Sentences that drove the classification, so the user can check them. */
  evidence: string[];
  /** Policy files that were found and read. */
  files: string[];
}

export type CiState = "SUCCESS" | "FAILURE" | "PENDING" | "ERROR" | "EXPECTED" | null;

export interface RepoSignals {
  repo: string;
  stars: number;
  language: string | null;
  archived: boolean;
  lastMergeAt: string | null;
  /** Merged PRs from non-maintainers in the last 90 days. */
  outsideMerged90d: number;
  /** merged / (merged + closed) for recent non-maintainer PRs; null when too few. */
  outsideMergeRate: number | null;
  /** Median hours until a maintainer first reacts to a non-maintainer PR; null when unknown. */
  medianResponseHours: number | null;
  ciState: CiState;
  policy: PolicyResult;
}

export interface IssueCandidate {
  repo: string;
  number: number;
  title: string;
  url: string;
  createdAt: string;
  labels: string[];
  bodyLength: number;
  hasCodeBlock: boolean;
  assigned: boolean;
  hasOpenLinkedPr: boolean;
  claimed: boolean;
}

export interface ScoreBreakdown {
  responsiveness: number;
  mergeRate: number;
  outsideMerges: number;
  beginner: number;
  activity: number;
  ci: number;
  freshness: number;
  clarity: number;
}

export interface RankedIssue {
  issue: IssueCandidate;
  repo: RepoSignals;
  score: number;
  breakdown: ScoreBreakdown;
}

export interface PilotConfig {
  githubUser: string;
  languages: string[];
  labels: string[];
  minStars: number;
  maxIssueAgeDays: number;
  maxRepos: number;
  digestSize: number;
  /** Most issues shown from any one repo. */
  perRepo: number;
  coAuthor: boolean;
}
