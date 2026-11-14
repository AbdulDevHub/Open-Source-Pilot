import { loadConfig } from "./config.js";
import { diversify, rankIssues } from "./score.js";
import { client, fetchRepos, searchRepos } from "./search.js";
import type { RankedIssue } from "./types.js";

const fmtHours = (h: number | null) => (h === null ? "?" : h < 48 ? `${Math.round(h)}h` : `${Math.round(h / 24)}d`);
const pct = (x: number | null) => (x === null ? "?" : `${Math.round(x * 100)}%`);

function printRanked(list: RankedIssue[]) {
  list.forEach((r, i) => {
    const flag =
      r.repo.policy.class === "disclosure-required" ? "  [AI disclosure required]" : r.repo.policy.class === "unknown" ? "  [AI policy: check]" : "";
    console.log(`\n${String(i + 1).padStart(2)}. ${r.score}  ${r.issue.repo}#${r.issue.number}  ${r.issue.title}${flag}`);
    console.log(`    ${r.issue.url}`);
    console.log(
      `    ${r.repo.language ?? "?"} · ${r.repo.stars}★ · reply ${fmtHours(r.repo.medianResponseHours)} · outside merge rate ${pct(r.repo.outsideMergeRate)} · ${r.repo.outsideMerged90d} outside merges/90d · CI ${r.repo.ciState ?? "?"}`,
    );
  });
}

async function find(args: string[]) {
  const cfg = loadConfig();
  const now = new Date();
  const gql = client();
  const log = args.includes("--json") ? () => {} : (m: string) => process.stderr.write(m);

  log("Searching for active repos with beginner issues...\n");
  const names = await searchRepos(gql, cfg, now);
  const details = await fetchRepos(gql, names, cfg, now, (d, t) => log(`\rReading repos ${d}/${t}`));
  log("\n");

  const pairs = details.flatMap((d) => d.issues.map((issue) => ({ issue, repo: d.signals })));
  const { ranked, excluded } = rankIssues(pairs, cfg, now);
  const top = diversify(ranked, cfg.digestSize, cfg.perRepo);

  if (args.includes("--json")) {
    console.log(JSON.stringify({ generatedAt: now.toISOString(), top, excludedCount: excluded.length }, null, 2));
    return;
  }
  const reasons = new Map<string, number>();
  for (const e of excluded) reasons.set(e.reason, (reasons.get(e.reason) ?? 0) + 1);
  console.log(`Checked ${names.length} repos, ${pairs.length} issues. Skipped ${excluded.length}:`);
  for (const [reason, n] of [...reasons].sort((a, b) => b[1] - a[1])) console.log(`  ${n} × ${reason}`);
  printRanked(top);
}

async function policy(repo: string | undefined) {
  if (!repo || !repo.includes("/")) throw new Error("Usage: policy <owner/repo>");
  const cfg = loadConfig();
  const [d] = await fetchRepos(client(), [repo], cfg, new Date());
  if (!d) throw new Error(`Repo not found: ${repo}`);
  const p = d.signals.policy;
  console.log(`${repo}: ${p.class}`);
  console.log(`Read: ${p.files.join(", ") || "no policy files"}`);
  for (const e of p.evidence) console.log(`  - ${e}`);
}

const [command, ...rest] = process.argv.slice(2);
const commands: Record<string, () => Promise<void>> = {
  find: () => find(rest),
  policy: () => policy(rest[0]),
};

const run = command ? commands[command] : undefined;
if (!run) {
  console.log("Usage: tsx src/cli.ts <find [--json] | policy <owner/repo>>");
  process.exitCode = command ? 1 : 0;
} else {
  run().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}
