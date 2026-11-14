import { readFileSync } from "node:fs";
import type { PilotConfig } from "./types.js";

/** Fallbacks for settings added after a user's config was created. */
const DEFAULTS: Partial<PilotConfig> = { maxRepos: 40, digestSize: 15, perRepo: 2 };

export function loadConfig(path = "pilot.config.json"): PilotConfig {
  return { ...DEFAULTS, ...JSON.parse(readFileSync(path, "utf8")) } as PilotConfig;
}
