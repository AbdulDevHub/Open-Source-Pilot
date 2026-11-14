import type { PolicyClass, PolicyResult } from "./types.js";

/** Files read for AI-contribution rules, in priority order. */
export const POLICY_FILES = [
  "AI_POLICY.md",
  ".github/AI_POLICY.md",
  "AI-POLICY.md",
  "AI_POLICY",
  "GENERATIVE_AI_POLICY.md",
  "CONTRIBUTING.md",
  ".github/CONTRIBUTING.md",
  "docs/CONTRIBUTING.md",
  "contributing.md",
  "docs/contributing.md",
  "CONTRIBUTING",
  "CONTRIBUTING.rst",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/pull_request_template.md",
] as const;

// Acronyms are matched case-sensitively so "ai"/"llm" inside ordinary text don't count.
const AI_ACRONYM = /\b(AI|A\.I\.|LLMs?|GPT(-\d+)?)\b/;
const AI_WORD =
  /\b(chatgpt|copilot|claude|gemini|large language models?|machine[- ]generated|vibe[- ]cod\w*|generative ai|ai[- ](generated|assisted|assistance|tools?|agents?|written))\b/i;
const hasAiTerm = (s: string) => AI_ACRONYM.test(s) || AI_WORD.test(s);

/** "No disclosure is required" and friends: explicitly not a disclosure rule. */
const NO_DISCLOSURE =
  /\b(no (\S+ ){0,3}(label|disclosure)s?( \S+){0,2} (is|are) (required|needed|necessary)|(disclosure|label)s? (is |are )?not (required|needed|necessary)|(don['’]?t|do not|no) need to (disclose|declare|label)|disclos\w*[^.]{0,30}\(?optional)\b/i;
/** Unambiguous disclosure asks; these win over ban words ("undisclosed AI PRs will be rejected"). */
const DISCLOSURE_STRONG = /\b(disclos\w*|undisclosed)\b|^-?\s*\[[ x]\]/i;
/** Softer wording that also asks for disclosure, but loses to a ban in the same sentence. */
const DISCLOSURE_WEAK =
  /\b(declar\w*|attribut\w*|state (that|whether|if)|mention (that|whether|if)|indicate|label (it|them|your|the)|mark (it|them|your)|was used)\b/i;
/** Rules that limit *how* AI is used rather than banning it: fine when a human reviews the work. */
const CONDITIONAL =
  /\b(don'?t understand|do not understand|cannot explain|can'?t explain|without (the aid|understanding|review\w*|testing|reading)|low[- ]quality|unreviewed|unsupervised|as a justification|slop|blindly|art|images?|video|audio|diagrams|spam)\b/i;
const BAN =
  /\b(not (be )?accept(ed)?|won['’]?t accept|will not (be )?accept(ed)?|do(es)? not accept|don['’]?t accept|prohibit\w*|forbid\w*|ban(ned|s)?|not (be )?(allow(ed)?|permitted|welcome|tolerated|used|submitted)|(do|does|don['’]?t|doesn['’]?t|will not|won['’]?t) allow|disallow\w*|reject(ed)?|will be closed|must not|do not (use|submit)|don['’]?t (use|submit)|refrain|zero[- ]tolerance)\b|(^|[.!:*]\s*)no (AI|LLMs?|GPT)\b/i;
const ALLOW = /\b(welcome[ds]?|encourag\w*|allowed|permitted|feel free|fine to use|okay to use|ok to use)\b/i;
const NORMATIVE = /\b(must|should|shall|please|required?|policy|accept\w*|expect\w*|responsible)\b/i;

export type SentenceClass = "banned" | "disclosure-required" | "allowed" | "rules" | null;

export function classifySentence(sentence: string): SentenceClass {
  if (!hasAiTerm(sentence)) return null;
  if (NO_DISCLOSURE.test(sentence)) return "allowed";
  if (DISCLOSURE_STRONG.test(sentence)) return "disclosure-required";
  if (BAN.test(sentence)) return CONDITIONAL.test(sentence) ? "rules" : "banned";
  if (DISCLOSURE_WEAK.test(sentence)) return "disclosure-required";
  if (ALLOW.test(sentence)) return "allowed";
  if (NORMATIVE.test(sentence)) return "rules";
  return null;
}

/** Split text into sentence-ish chunks: paragraphs, list items and sentence ends. */
export function sentences(text: string): string[] {
  return text
    .replace(/<!--|-->/g, " ")
    .replace(/`[^`\n]*`/g, " ") // code spans: file names like `CLAUDE.md`, flags, env vars
    .replace(/^\s*\|.*$/gm, " ") // markdown table rows: changelogs, label lists
    .split(/\n\s*\n|(?<=[.!?])\s+|\n(?=\s*([-*]|\d+\.)\s)|\n(?=#)/)
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 2);
}

const trim = (s: string) => (s.length > 240 ? `${s.slice(0, 237)}...` : s);

/**
 * Classify a repo's AI-contribution policy from the text of its policy files.
 * banned > disclosure-required > allowed (none) > other AI rules (unknown) > none.
 */
export function classifyPolicy(docs: { path: string; text: string }[]): PolicyResult {
  const found: Record<Exclude<SentenceClass, null>, string[]> = {
    banned: [],
    "disclosure-required": [],
    allowed: [],
    rules: [],
  };
  for (const doc of docs)
    for (const s of sentences(doc.text)) {
      const c = classifySentence(s);
      if (c) found[c].push(trim(s));
    }

  const files = docs.map((d) => d.path);
  const result = (cls: PolicyClass, evidence: string[]): PolicyResult => ({ class: cls, evidence: evidence.slice(0, 3), files });
  if (found.banned.length) return result("banned", found.banned);
  if (found["disclosure-required"].length) return result("disclosure-required", found["disclosure-required"]);
  if (found.allowed.length) return result("none", found.allowed);
  if (found.rules.length) return result("unknown", found.rules);
  return result("none", []);
}
