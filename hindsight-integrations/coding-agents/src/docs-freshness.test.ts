/**
 * The README is the single source of truth for configuration (scripts/build-skill.mjs copies its
 * marked regions into the companion skill; hindsight-docs/scripts/sync-coding-agents-doc.mjs copies
 * the whole thing into the docs site). These tests keep it honest in both directions:
 *
 *   - the generated skill matches what the README currently says, and
 *   - no config field is readable but undocumented — the drift issue #3735 was filed about, where
 *     `bankIdTemplate`, `optInOnly`, `banks.<id>.bank` and nine others were reachable in code while
 *     the docs a user actually reads never named them.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  build,
  diffSkill,
  referenceFiles,
  regions,
  SPLIT_WORDS,
  writeSkill,
  // @ts-expect-error — plain .mjs build script, no type declarations
} from "../scripts/build-skill.mjs";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const readme = () => readFileSync(join(pkgRoot, "README.md"), "utf8");

describe("companion skill", () => {
  it("is up to date with the README", () => {
    // Throws with the regeneration command in its message when the skill is stale.
    execFileSync("node", [join(pkgRoot, "scripts", "build-skill.mjs"), "--check"], {
      cwd: pkgRoot,
      stdio: "pipe",
    });
  });

  it("carries the configuration reference, not a subset of it", () => {
    // SKILL.md is only the index; the configuration lives in the reference files it links.
    const dir = join(pkgRoot, "skill");
    const skill = [
      readFileSync(join(dir, "SKILL.md"), "utf8"),
      ...readdirSync(join(dir, "references")).map((f) =>
        readFileSync(join(dir, "references", f), "utf8")
      ),
    ].join("\n");
    // The keys that fix the failure mode #3735 reported: a bank shared across unrelated projects.
    for (const key of ["bankIdTemplate", "dynamicBankId", "mapPathToBank", "disabled", "bank"]) {
      expect(skill).toContain(`\`${key}\``);
    }
  });

  it("links every reference file from SKILL.md, by a path relative to the skill", () => {
    const dir = join(pkgRoot, "skill");
    const md = readFileSync(join(dir, "SKILL.md"), "utf8");
    const linked = [...md.matchAll(/\]\((references\/[^)]+\.md)\)/g)].map((m) => m[1]);
    expect(linked.sort()).toEqual(
      readdirSync(join(dir, "references"))
        .map((f) => `references/${f}`)
        .sort()
    );
  });
});

describe("configuration reference", () => {
  /** Field names declared in `interface RawConfig` — the whole surface a config file may set. */
  const rawConfigFields = (): string[] => {
    const src = readFileSync(join(pkgRoot, "src", "core", "config.ts"), "utf8");
    const block = /export interface RawConfig \{([\s\S]*?)\n\}/.exec(src);
    if (!block) throw new Error("could not find interface RawConfig in core/config.ts");
    return [...block[1].matchAll(/^ {2}(\w+)\??:/gm)].map((m) => m[1]);
  };

  it("documents every field of RawConfig", () => {
    const doc = readme();
    const undocumented = rawConfigFields().filter((f) => !doc.includes(`\`${f}\``));
    expect(undocumented).toEqual([]);
  });

  it("documents the env-var rule truthfully — every key really is HINDSIGHT_<FIELD_IN_CAPS>", () => {
    // The README documents the env layer as a RULE rather than a 35-row table, so the rule has to
    // hold for every key: one deviating name would be a setting nobody could derive from the docs.
    const src = readFileSync(join(pkgRoot, "src", "core", "config.ts"), "utf8");
    const block = /const ENV_KEYS = \{([\s\S]*?)\n\} as const/.exec(src);
    if (!block) throw new Error("could not find ENV_KEYS in core/config.ts");
    const pairs = [...block[1].matchAll(/^\s*(\w+): "(HINDSIGHT_\w+)"/gm)];
    expect(pairs.length).toBeGreaterThan(30);
    const expected = (field: string) =>
      "HINDSIGHT_" + field.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase();
    expect(pairs.filter(([, field, env]) => expected(field) !== env).map(([, f]) => f)).toEqual([]);
  });

  it("keeps the map-valued settings out of the env layer, as documented", () => {
    // The README tells users these four are file-only because per-key branching cannot survive
    // flattening into one variable. If one ever gained an env var, that sentence would be a lie.
    const src = readFileSync(join(pkgRoot, "src", "core", "config.ts"), "utf8");
    const block = /const ENV_KEYS = \{([\s\S]*?)\n\} as const/.exec(src);
    const fields = [...block![1].matchAll(/^\s*(\w+): "HINDSIGHT_/gm)].map((m) => m[1]);
    for (const fileOnly of ["mapPathToBank", "harnesses", "banks", "retainMetadata"]) {
      expect(fields).not.toContain(fileOnly);
    }
    expect(readme()).toContain("are file-only");
  });

  it("documents the per-bank section's own `bank` rename field", () => {
    expect(readme()).toMatch(/`banks\.<bankId>`|`banks`/);
    expect(readme()).toContain('"bank": "team::shared"');
  });
});

describe("skill region extraction", () => {
  const extract = (src: string): string[] => regions(src) as string[];

  it("normalises a region's headings so its top level becomes the skill's ##", () => {
    const [out] = extract(
      [
        "<!-- skill:begin -->",
        "### Reference",
        "",
        "#### Recipe",
        "",
        "text",
        "<!-- skill:end -->",
      ].join("\n")
    );
    expect(out).toContain("## Reference");
    expect(out).toContain("### Recipe");
  });

  it("keeps a region that already starts at ## unchanged", () => {
    const [out] = extract(
      ["<!-- skill:begin -->", "## Configuration", "", "### Opt-in", "<!-- skill:end -->"].join(
        "\n"
      )
    );
    expect(out).toContain("## Configuration");
    expect(out).toContain("### Opt-in");
  });

  it("synthesises a heading for a region that starts mid-section", () => {
    const [out] = extract(
      ['<!-- skill:begin title="Install / update" -->', "run it", "<!-- skill:end -->"].join("\n")
    );
    expect(out).toBe("## Install / update\n\nrun it");
  });

  it("refuses a headingless region with no title rather than silently merging it upward", () => {
    expect(() =>
      extract(["<!-- skill:begin -->", "orphan text", "<!-- skill:end -->"].join("\n"))
    ).toThrow(/must declare title=/);
  });

  it("refuses an unterminated region rather than swallowing the rest of the README", () => {
    expect(() => extract(["<!-- skill:begin -->", "## A", "text"].join("\n"))).toThrow(
      /unterminated/
    );
  });

  it("refuses a README with no marked regions at all", () => {
    expect(() => extract("## Configuration\n\nno markers here")).toThrow(/no <!-- skill:begin -->/);
  });
});

describe("skill reference files", () => {
  const readme = (...parts: string[]) => parts.join("\n");
  const filler = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");
  const slugs = (src: string) => (referenceFiles(src) as { slug: string }[]).map((f) => f.slug);

  it("maps each region to one file, named from its title= or first heading", () => {
    const src = readme(
      '<!-- skill:begin title="Install / update" -->',
      "run it",
      "<!-- skill:end -->",
      "<!-- skill:begin -->",
      "## Diagnostics & logging",
      "### Is the memory ready yet?",
      "text",
      "<!-- skill:end -->"
    );
    expect(slugs(src)).toEqual(["install-update", "diagnostics-logging"]);
  });

  it("splits a region over SPLIT_WORDS at its subsections, re-normalising each to ##", () => {
    const src = readme(
      "<!-- skill:begin -->",
      "### Configuration", // a README ### — normalised to ## first
      "lead-in",
      "#### When a change takes effect",
      filler(SPLIT_WORDS),
      "#### Per-source `per_source`",
      "##### Recipe",
      "```bash",
      "### not a heading inside a fence",
      "```",
      "<!-- skill:end -->"
    );
    const files = referenceFiles(src) as { slug: string; body: string }[];
    expect(files.map((f) => f.slug)).toEqual([
      "configuration",
      "configuration-when-a-change-takes-effect",
      "configuration-per-source-per-source",
    ]);
    expect(files[0].body).toBe("## Configuration\nlead-in");
    expect(files[2].body).toMatch(/^## Per-source `per_source`\n### Recipe\n/);
    expect(files[2].body).toContain("\n### not a heading inside a fence\n");
  });

  it("keeps a region at or under SPLIT_WORDS whole", () => {
    const src = readme(
      "<!-- skill:begin -->",
      "## A",
      "### B",
      "text",
      "### C",
      "<!-- skill:end -->"
    );
    expect(slugs(src)).toEqual(["a"]);
  });

  it("points a README #anchor at the reference file that now holds the section", () => {
    const src = readme(
      "<!-- skill:begin -->",
      "## Config",
      "see [Opt-in](#opt-in-only) and [Elsewhere](#not-in-skill)",
      "### Opt-in only",
      filler(SPLIT_WORDS),
      "<!-- skill:end -->"
    );
    const [lead] = referenceFiles(src) as { body: string }[];
    expect(lead.body).toContain("[Opt-in](config-opt-in-only.md#opt-in-only)");
    expect(lead.body).toContain("[Elsewhere](#not-in-skill)");
  });

  it("refuses two parts that would share a file name", () => {
    const src = readme(
      '<!-- skill:begin title="Setup" -->',
      "a",
      "<!-- skill:end -->",
      '<!-- skill:begin title="Setup" -->',
      "b",
      "<!-- skill:end -->"
    );
    expect(() => referenceFiles(src)).toThrow(/two skill reference files would be named setup\.md/);
  });

  it("indexes every reference in SKILL.md and marks every file as generated", () => {
    const files = build({
      readme: readme('<!-- skill:begin title="Install" -->', "run it", "<!-- skill:end -->"),
      preamble: "---\nname: x\ndescription: y\n---\n\n# X\n",
    }) as Map<string, string>;
    expect([...files.keys()]).toEqual(["SKILL.md", "references/install.md"]);
    expect(files.get("SKILL.md")).toContain("[`references/install.md`](references/install.md)");
    expect(files.get("SKILL.md")).toMatch(/relative to this skill's directory/);
    for (const content of files.values()) expect(content).toContain("<!-- GENERATED from");
  });

  describe("check and write", () => {
    const dirs: string[] = [];
    afterEach(() => {
      for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
    });
    const files = new Map([
      ["SKILL.md", "index\n"],
      ["references/a.md", "a\n"],
    ]);
    const written = () => {
      const dir = mkdtempSync(join(tmpdir(), "skill-build-"));
      dirs.push(dir);
      writeSkill(dir, files);
      return dir;
    };

    it("passes on a fresh build", () => {
      expect(diffSkill(written(), files)).toEqual([]);
    });

    it("fails on a changed, a missing and a stale reference file", () => {
      const dir = written();
      writeFileSync(join(dir, "references", "a.md"), "edited\n");
      writeFileSync(join(dir, "references", "old.md"), "from a previous build\n");
      rmSync(join(dir, "SKILL.md"));
      expect(diffSkill(dir, files)).toEqual([
        "missing: SKILL.md",
        "out of date: references/a.md",
        "stale: references/old.md",
      ]);
    });

    it("write mode deletes stale reference files", () => {
      const dir = written();
      writeFileSync(join(dir, "references", "old.md"), "from a previous build\n");
      expect(writeSkill(dir, files)).toEqual(["references/old.md"]);
      expect(existsSync(join(dir, "references", "old.md"))).toBe(false);
      expect(diffSkill(dir, files)).toEqual([]);
    });
  });
});
