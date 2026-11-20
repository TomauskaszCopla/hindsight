/**
 * Companion-skill self-update: `npm update -g` refreshes the PACKAGE's skill/, but the copies the
 * installer placed in each host's skills directory would go stale. Every session start compares
 * the installed directory against the packaged one — every file, since SKILL.md links on-demand
 * `references/*.md` — and on drift replaces it whole, so a reference file the package dropped is
 * removed too. Upgrading the plugin upgrades the skill, no re-install needed.
 *
 * Presence-gated BY DEFAULT: a host where the skill was never installed (or was uninstalled) is
 * left alone, because for a hook harness the hook registration and the skill are installed by the
 * same command — our installer — so an absent skill is a decision.
 *
 * `install: true` flips that, and is what the persistent-plugin hosts pass (core/runtime.ts): those
 * can be wired by the HOST's own plugin manager — `dsh plugin add @vectorize-io/…`,
 * `cline plugin install`, a hand-written config entry — a route our installer never sees, so the
 * plugin loads with its tools registered and no skill anywhere (#4406). There the plugin BEING
 * LOADED is the installation signal: uninstalling removes the entry that loads us, so a running
 * plugin can only mean the host still wants us.
 */
import { cpSync, existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveSkillDirs } from "./skill-dirs";

/** The packaged skill dir (pkgRoot/skill): one level up from the flat `dist/` bundle, two from this
 *  file in the source tree — so the source tree resolves it too, and a test asserts on the real
 *  packaged SKILL.md rather than on a fixture that cannot notice a missing skill build. */
function packagedSkillDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const dist = join(here, "..", "skill");
  return existsSync(join(dist, "SKILL.md")) ? dist : join(here, "..", "..", "skill");
}

/** Every file under `dir`, as sorted paths relative to it. */
function listFiles(dir: string, sub = ""): string[] {
  const out: string[] = [];
  for (const e of readdirSync(join(dir, sub), { withFileTypes: true })) {
    const rel = sub ? join(sub, e.name) : e.name;
    if (e.isDirectory()) out.push(...listFiles(dir, rel));
    else if (e.isFile()) out.push(rel);
  }
  return out.sort();
}

/** True when `dst` holds exactly the files of `src` with the same content. The skill is SKILL.md
 *  plus on-demand `references/*.md`, so comparing SKILL.md alone would miss a changed, added or
 *  removed reference file. */
function sameTree(src: string, dst: string): boolean {
  const files = listFiles(src);
  const installed = listFiles(dst);
  if (files.length !== installed.length || files.some((f, i) => f !== installed[i])) return false;
  return files.every((f) => readFileSync(join(src, f)).equals(readFileSync(join(dst, f))));
}

/** Replace `dst` with a copy of `src`: removed first, so a file the package dropped goes too. */
export function replaceSkillDir(src: string, dst: string): void {
  rmSync(dst, { recursive: true, force: true });
  cpSync(src, dst, { recursive: true }); // recursive cpSync creates the skills root too
}

export function syncCompanionSkill(
  harness: string,
  opts: { home?: string; srcDir?: string; install?: boolean } = {}
): void {
  try {
    const parts = resolveSkillDirs(harness, opts.home ?? homedir());
    if (!parts) return; // host without a skills DIRECTORY (opencode, opencode2 — see skill-dirs.ts)
    const src = opts.srcDir ?? packagedSkillDir();
    const srcMd = join(src, "SKILL.md");
    if (!existsSync(srcMd)) return;
    const dst = join(opts.home ?? homedir(), ...parts, "hindsight-coding-agent");
    const dstMd = join(dst, "SKILL.md");
    const installed = existsSync(dstMd);
    if (!installed && !opts.install) return; // never installed here — not ours to decide
    if (!installed || !sameTree(src, dst)) replaceSkillDir(src, dst);
  } catch {
    /* best-effort — skill freshness must never break a session */
  }
}

/**
 * The packaged skill in the shape a host that registers skills IN MEMORY wants (opencode2's
 * `ctx.skill.transform`): the frontmatter `description` the host matches on, the body, and where
 * it came from on disk. opencode v2 (2.0.16+) requires `path`, the absolute SKILL.md file, and
 * rejects a draft without it (#4732); `location`, the directory, was the field sent before that
 * and stays for earlier v2 hosts, so both go out. Read at setup, so `npm update -g` upgrades this
 * copy too.
 */
export function readPackagedSkill(
  srcDir = packagedSkillDir()
): { location: string; path: string; description: string; content: string } | undefined {
  try {
    const path = join(srcDir, "SKILL.md");
    const raw = readFileSync(path, "utf8");
    const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
    return {
      location: srcDir,
      path,
      description: frontmatter ? (/^description:\s*(.+)$/m.exec(frontmatter[1])?.[1] ?? "") : "",
      content: frontmatter ? raw.slice(frontmatter[0].length) : raw,
    };
  } catch {
    return undefined; // no packaged skill (a dev tree before `npm run skill:build`)
  }
}
