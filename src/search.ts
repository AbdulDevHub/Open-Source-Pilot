import { execFileSync } from "node:child_process";
import { graphql } from "@octokit/graphql";
import { POLICY_FILES } from "./policy.js";
import { toIssue, toSignals, type RawRepo } from "./signals.js";
import type { IssueCandidate, PilotConfig, RepoSignals } from "./types.js";

const REPOS_PER_QUERY = 5;
const DAY = 86_400_000;

/** GITHUB_TOKEN in CI, otherwise the token of the logged-in gh CLI. */
export function getToken(): string {
  const env = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (env) return env;
  try {
    return execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim();
  } catch {
    throw new Error("No GitHub token: set GITHUB_TOKEN or run `gh auth login`.");
  }
}

export function client(token = getToken()) {
  return graphql.defaults({ headers: { authorization: `token ${token}` } });
}
type Client = ReturnType<typeof client>;

/** Common spellings of each configured label, since repos name them differently. */
export function labelVariants(labels: string[]): string[] {
  const out = new Set<string>();
  for (const label of labels) {
    const base = label.toLowerCase().replace(/[-_]+/g, " ").trim();
    const title = base.replace(/\b\w/g, (c) => c.toUpperCase());
    const sentence = base.charAt(0).toUpperCase() + base.slice(1);
    for (const v of [label, base, title, sentence, base.replace(/ /g, "-")]) out.add(v);
  }
  return [...out];
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/** Repo search queries: active, popular repos that have open beginner issues. */
export function repoQueries(cfg: PilotConfig, now: Date): string[] {
  const since = isoDate(new Date(now.getTime() - 30 * DAY));
  const counters = new Set<string>();
  for (const l of cfg.labels.map((x) => x.toLowerCase().replace(/[-_]+/g, " "))) {
    if (l === "good first issue") counters.add("good-first-issues:>0");
    else if (l === "help wanted") counters.add("help-wanted-issues:>0");
  }
  if (counters.size === 0) counters.add("good-first-issues:>0");
  const langs = cfg.languages.length ? cfg.languages : [null];
  const queries: string[] = [];
  for (const counter of counters)
    for (const lang of langs)
      queries.push(
        [`stars:>=${cfg.minStars}`, "archived:false", counter, `pushed:>=${since}`, lang && `language:"${lang}"`, "sort:updated"]
          .filter(Boolean)
          .join(" "),
      );
  return queries;
}

export async function searchRepos(gql: Client, cfg: PilotConfig, now: Date): Promise<string[]> {
  const lists: string[][] = [];
  for (const q of repoQueries(cfg, now)) {
    const res = await gql<{ search: { nodes: { nameWithOwner?: string }[] } }>(
      `query($q: String!) { search(query: $q, type: REPOSITORY, first: 50) { nodes { ... on Repository { nameWithOwner } } } }`,
      { q },
    );
    lists.push(res.search.nodes.flatMap((n) => (n.nameWithOwner ? [n.nameWithOwner] : [])));
  }
  return interleave(lists, cfg.maxRepos);
}

/** Round-robin across result lists (deduped), so every label/language query gets a fair share. */
export function interleave(lists: string[][], limit: number): string[] {
  const out = new Set<string>();
  for (let i = 0; out.size < limit && lists.some((l) => i < l.length); i++)
    for (const list of lists) {
      const name = list[i];
      if (name !== undefined && out.size < limit) out.add(name);
    }
  return [...out];
}

function repoFields(labels: string[]): string {
  const policy = POLICY_FILES.map((p, i) => `p${i}: object(expression: "HEAD:${p}") { ... on Blob { text } }`).join("\n");
  return `
    nameWithOwner stargazerCount isArchived
    primaryLanguage { name }
    defaultBranchRef { target { ... on Commit { statusCheckRollup { state } } } }
    merged: pullRequests(states: MERGED, first: 30, orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes { mergedAt authorAssociation author { login __typename } }
    }
    recent: pullRequests(first: 30, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes {
        createdAt state mergedAt closedAt authorAssociation author { login __typename }
        comments(first: 5) { nodes { createdAt authorAssociation } }
        reviews(first: 5) { nodes { submittedAt authorAssociation } }
      }
    }
    issues(states: OPEN, first: 15, labels: ${JSON.stringify(labels)}, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes {
        number title url createdAt body
        assignees { totalCount }
        labels(first: 10) { nodes { name } }
        comments(last: 15) { nodes { body authorAssociation author { login __typename } } }
        timelineItems(last: 20, itemTypes: [CROSS_REFERENCED_EVENT, CONNECTED_EVENT]) {
          nodes {
            __typename
            ... on CrossReferencedEvent { source { __typename ... on PullRequest { state } } }
            ... on ConnectedEvent { subject { __typename ... on PullRequest { state } } }
          }
        }
      }
    }
    ${policy}`;
}

export interface RepoDetails {
  signals: RepoSignals;
  issues: IssueCandidate[];
}

/** Fetch signals, labelled issues and policy files for repos, a few per GraphQL request. */
export async function fetchRepos(
  gql: Client,
  names: string[],
  cfg: PilotConfig,
  now: Date,
  onProgress?: (done: number, total: number) => void,
): Promise<RepoDetails[]> {
  const fields = repoFields(labelVariants(cfg.labels));
  const out: RepoDetails[] = [];
  for (let i = 0; i < names.length; i += REPOS_PER_QUERY) {
    const batch = names.slice(i, i + REPOS_PER_QUERY);
    const aliases = batch
      .map((name, j) => {
        const [owner, repo] = name.split("/");
        return `r${j}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(repo)}) { ${fields} }`;
      })
      .join("\n");
    let res: Record<string, RawRepo | null>;
    try {
      res = await gql<Record<string, RawRepo | null>>(`query { ${aliases} }`);
    } catch (err) {
      // Partial data (e.g. one repo blocked) still comes back on the error object.
      const data = (err as { data?: Record<string, RawRepo | null> }).data;
      if (!data) throw err;
      res = data;
    }
    for (const raw of Object.values(res)) {
      if (!raw) continue;
      out.push({
        signals: toSignals(raw, POLICY_FILES, now),
        issues: raw.issues.nodes.map((n) => toIssue(raw.nameWithOwner, n)),
      });
    }
    onProgress?.(Math.min(i + REPOS_PER_QUERY, names.length), names.length);
  }
  return out;
}
