#!/usr/bin/env node
/**
 * Generate the companion skill (skill/SKILL.md + skill/references/*.md) from the README +
 * skill-src/preamble.md.
 *
 * The companion skill and the README documented the same configuration in two different files, and
 * they drifted apart in BOTH directions: the skill never named `bankIdTemplate`, `optInOnly`,
 * `retainTags` or the daemon settings and claimed outright that "no environment variables" exist
 * (there are 30-odd, see core/config.ts ENV_KEYS), while the README's reference table had lost
 * `autoReflect` and `surveyRefreshCommits`, which only the skill had. Issue #3735 was filed against
 * the half of that drift that faces users.
 *
 * So the README is the single source for everything BOTH audiences need — configuration, install,
 * diagnostics — and this script copies the regions it marks into the skill:
 *
 *     <!-- skill:begin -->                          … <!-- skill:end -->
 *     <!-- skill:begin title="Install / update" --> … <!-- skill:end -->
 *
 * The skill-only half — what the agent does with the memory (tools, crediting, corrections) — has
 * no place in an npm README, so it stays in skill-src/preamble.md, which carries the frontmatter.
 *
 * Progressive disclosure: a host loads SKILL.md in full every time the skill triggers, so SKILL.md
 * carries only the preamble plus an index. Each region becomes its own `references/<slug>.md`,
 * which the agent reads on demand. A region over SPLIT_WORDS is split further at its subsections
 * (`###` once normalised), so an agent that needs one setting does not load the whole
 * configuration chapter. The slug comes from the region's `title=` or its first heading; a split
 * part's slug is prefixed with its region's.
 *
 * Heading levels are normalised per region: a region's first heading becomes `##` and everything
 * below it shifts by the same delta, so a marked `### Reference` reads as a top-level section
 * without the README having to know that. A region that starts mid-section (no heading of its own)
 * declares `title=` and gets an `##` synthesised. Split parts are re-normalised the same way.
 * Lines inside fenced code blocks are never treated as headings.
 *
 * Run: node scripts/build-skill.mjs [--check]
 * Write mode replaces every generated file and deletes stale files under skill/references/.
 * `--check` fails when any generated file differs or is missing, or when skill/references/ holds a
 * file the build would not produce (for CI — see src/docs-freshness.test.ts, which is what
 * actually gates it and unit-tests the marker parsing).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(here, "..");
const readmePath = join(pkgRoot, "README.md");
const preamblePath = join(pkgRoot, "skill-src", "preamble.md");
const skillDir = join(pkgRoot, "skill");

const BEGIN = /^<!--\s*skill:begin(?:\s+title="([^"]*)")?\s*-->$/;
const END = /^<!--\s*skill:end\s*-->$/;
const HEADING = /^(#{1,6})(\s+)(.*)$/;
const FENCE = /^\s*(```|~~~)/;

/** A region bigger than this is split at its subsections into separate reference files. */
export const SPLIT_WORDS = 1500;
export const REFERENCES = "references";

const MARKER_SKILL =
  "<!-- GENERATED from skill-src/preamble.md + README.md (its skill:begin regions).\n" +
  "     Edit those, then run: npm run skill:build -->";
const MARKER_REFERENCE =
  "<!-- GENERATED from README.md (its skill:begin regions).\n" +
  "     Edit README.md, then run: npm run skill:build -->";

/** Apply `fn(hashes, space, text)` to every heading line outside fenced code blocks. */
function mapHeadings(text, fn) {
  let fenced = false;
  return text
    .split("\n")
    .map((line) => {
      if (FENCE.test(line)) {
        fenced = !fenced;
        return line;
      }
      if (fenced) return line;
      const m = HEADING.exec(line);
      return m ? fn(m[1], m[2], m[3]) : line;
    })
    .join("\n");
}

/** Headings outside fenced code blocks, as { level, text, index } (index = line number). */
function headingsOf(text) {
  const out = [];
  let fenced = false;
  text.split("\n").forEach((line, index) => {
    if (FENCE.test(line)) fenced = !fenced;
    else if (!fenced) {
      const m = HEADING.exec(line);
      if (m) out.push({ level: m[1].length, text: m[3].trim(), index });
    }
  });
  return out;
}

/** Shift headings so the first one lands on `##`. */
function normalise(body) {
  const first = headingsOf(body)[0];
  if (!first) return body;
  const shift = 2 - first.level;
  if (shift === 0) return body;
  return mapHeadings(body, (hashes, space, text) => {
    const level = Math.min(6, Math.max(1, hashes.length + shift));
    return "#".repeat(level) + space + text;
  });
}

function parseRegions(src) {
  const out = [];
  let current = null;
  for (const line of src.split("\n")) {
    const begin = BEGIN.exec(line);
    if (begin) {
      if (current) throw new Error("nested <!-- skill:begin -->");
      current = { title: begin[1], lines: [] };
      continue;
    }
    if (END.test(line)) {
      if (!current) throw new Error("<!-- skill:end --> without a begin");
      out.push(current);
      current = null;
      continue;
    }
    if (current) current.lines.push(line);
  }
  if (current) throw new Error("unterminated <!-- skill:begin -->");
  if (!out.length) throw new Error("no <!-- skill:begin --> regions in the README");
  return out;
}

function render({ title, lines }) {
  const body = lines.join("\n").trim();
  if (!headingsOf(body).length) {
    if (!title) throw new Error("a region with no heading must declare title=");
    return `## ${title}\n\n${body}`;
  }
  const shifted = normalise(body);
  return title ? `## ${title}\n\n${shifted}` : shifted;
}

/** The marked regions of the README, in file order, with heading levels normalised. */
export function regions(src) {
  return parseRegions(src).map(render);
}

export function slugify(text) {
  const slug = text
    .toLowerCase()
    .replace(/[`*]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) throw new Error(`cannot derive a file name from heading "${text}"`);
  return slug;
}

const words = (text) => text.split(/\s+/).filter(Boolean).length;
const titleOf = (body) => headingsOf(body)[0].text;

/**
 * The reference files the README's regions become, in README order: one per region, except that a
 * region over SPLIT_WORDS splits at its `###` subsections — its lead-in (up to the first one) keeps
 * the region's slug, and each subsection becomes `<region slug>-<subsection slug>`.
 */
export function referenceFiles(src) {
  const files = [];
  for (const region of parseRegions(src)) {
    const body = render(region);
    const title = region.title ?? titleOf(body);
    const slug = slugify(title);
    const subsections = headingsOf(body).filter((h) => h.level === 3);
    if (words(body) <= SPLIT_WORDS || !subsections.length) {
      files.push({ slug, trail: [title], body });
      continue;
    }
    const lines = body.split("\n");
    const lead = lines.slice(0, subsections[0].index).join("\n").trim();
    // A lead-in that is only the heading carries nothing worth a file.
    if (lead.split("\n").length > 1) {
      files.push({ slug, trail: [title], body: lead });
    }
    subsections.forEach((h, i) => {
      const end = i + 1 < subsections.length ? subsections[i + 1].index : lines.length;
      const part = normalise(lines.slice(h.index, end).join("\n").trim());
      files.push({ slug: `${slug}-${slugify(h.text)}`, trail: [title, h.text], body: part });
    });
  }
  const seen = new Set();
  for (const f of files) {
    if (seen.has(f.slug)) throw new Error(`two skill reference files would be named ${f.slug}.md`);
    seen.add(f.slug);
  }
  return relinkAnchors(files);
}

/** GitHub's heading anchor: lowercase, punctuation dropped, spaces to hyphens. */
const anchorOf = (heading) =>
  heading
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/ /g, "-");

/**
 * The README links its own sections as `(#anchor)`. Once a region is split, the target may live in
 * another reference file, so such a link is pointed at `<slug>.md#anchor` (all reference files
 * share one directory). Anchors to sections outside the skill are left as the README wrote them.
 */
function relinkAnchors(files) {
  const home = new Map();
  for (const f of files) {
    for (const h of headingsOf(f.body)) {
      const anchor = anchorOf(h.text);
      if (!home.has(anchor)) home.set(anchor, f.slug);
    }
  }
  return files.map((f) => ({
    ...f,
    body: f.body.replace(/\]\(#([^)\s]+)\)/g, (link, anchor) => {
      const slug = home.get(anchor);
      return slug && slug !== f.slug ? `](${slug}.md#${anchor})` : link;
    }),
  }));
}

const tidy = (text) => `${text.replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;

/** The "read when …" index line for one reference file, built from its headings. */
function indexLine({ slug, trail, body }) {
  const path = `${REFERENCES}/${slug}.md`;
  const subs = headingsOf(body)
    .filter((h) => h.level === 3)
    .map((h) => h.text);
  const covers = subs.length ? `: ${subs.join(" · ")}` : "";
  return `- [\`${path}\`](${path}) — read when you need **${trail.join(" › ")}**${covers}.`;
}

/**
 * Every generated file, keyed by its path relative to skill/: `SKILL.md` (frontmatter, marker,
 * preamble, reference index) and `references/<slug>.md` per reference file.
 */
export function build({
  readme = readFileSync(readmePath, "utf8"),
  preamble = readFileSync(preamblePath, "utf8"),
} = {}) {
  const head = preamble.trimEnd();
  // The frontmatter block has to stay first for the host to parse the skill at all.
  const fm = /^---\n[\s\S]*?\n---\n/.exec(head);
  if (!fm) throw new Error("skill-src/preamble.md must start with a frontmatter block");
  const refs = referenceFiles(readme);
  const index = [
    "## Reference",
    "",
    "Configuration, install and diagnostics details live in separate files. Paths are relative to " +
      "this skill's directory (the one holding this SKILL.md). Read only the file the task needs.",
    "",
    ...refs.map(indexLine),
  ].join("\n");
  const files = new Map();
  files.set(
    "SKILL.md",
    tidy(`${fm[0]}\n${MARKER_SKILL}\n\n${head.slice(fm[0].length).trimStart()}\n\n${index}`)
  );
  for (const ref of refs) {
    files.set(`${REFERENCES}/${ref.slug}.md`, tidy(`${MARKER_REFERENCE}\n\n${ref.body}`));
  }
  return files;
}

/** Entries under `<dir>/references/` the build would not produce. */
function staleReferences(dir, files) {
  const refDir = join(dir, REFERENCES);
  if (!existsSync(refDir)) return [];
  return readdirSync(refDir)
    .map((name) => `${REFERENCES}/${name}`)
    .filter((rel) => !files.has(rel));
}

/** Why `dir` does not match `files`: one line per differing, missing or stale file. */
export function diffSkill(dir, files) {
  const problems = [];
  for (const [rel, content] of files) {
    const path = join(dir, rel);
    if (!existsSync(path)) problems.push(`missing: ${rel}`);
    else if (readFileSync(path, "utf8") !== content) problems.push(`out of date: ${rel}`);
  }
  for (const rel of staleReferences(dir, files)) problems.push(`stale: ${rel}`);
  return problems;
}

/** Write every generated file into `dir` and delete stale reference files. Returns the removed. */
export function writeSkill(dir, files) {
  mkdirSync(join(dir, REFERENCES), { recursive: true });
  const removed = staleReferences(dir, files);
  for (const rel of removed) rmSync(join(dir, rel), { recursive: true, force: true });
  for (const [rel, content] of files) writeFileSync(join(dir, rel), content);
  return removed;
}

// Guarded so the test can import the helpers without the CLI running on import.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const generated = build();
  if (process.argv.includes("--check")) {
    const problems = diffSkill(skillDir, generated);
    if (problems.length) {
      console.error(
        "[coding-agents] ❌ skill/ is out of date with the README:\n" +
          problems.map((p) => `  ${p}`).join("\n") +
          "\n  Run: npm run skill:build"
      );
      process.exit(1);
    }
    console.log("[coding-agents] ✅ skill/ matches the README.");
  } else {
    const removed = writeSkill(skillDir, generated);
    console.log(
      `[coding-agents] wrote ${generated.size} files to ${skillDir} from the README + preamble` +
        (removed.length ? `; removed stale ${removed.join(", ")}.` : ".")
    );
  }
}
