export type ContributionStatus = "open" | "merged" | "closed";

export interface Contribution {
  repo: string;
  issue?: string;
  pr: string;
  title: string;
  summary: string;
  learned?: string;
  language?: string;
  status: ContributionStatus;
  openedAt: string;
  mergedAt: string | null;
}

export interface ContributionLog {
  contributions: Contribution[];
}

/** Live PR state from GitHub, keyed by PR URL. */
export type PrStates = Record<string, { state: "OPEN" | "MERGED" | "CLOSED"; mergedAt: string | null }>;

/** Apply live PR states to the log. Returns the new log and whether anything changed. */
export function applyPrStates(log: ContributionLog, states: PrStates): { log: ContributionLog; changed: boolean } {
  let changed = false;
  const contributions = log.contributions.map((c) => {
    const live = states[c.pr];
    if (!live) return c;
    const status = live.state.toLowerCase() as ContributionStatus;
    const mergedAt = live.mergedAt ? live.mergedAt.slice(0, 10) : null;
    if (status === c.status && mergedAt === c.mergedAt) return c;
    changed = true;
    return { ...c, status, mergedAt };
  });
  return { log: { contributions }, changed };
}
