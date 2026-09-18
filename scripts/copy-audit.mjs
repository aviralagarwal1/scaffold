#!/usr/bin/env node

// Copy inventory.
//
// Pulls every user-facing string out of app/ and components/ and writes
// docs/copy-inventory.md, so there is one place to read all the product's
// language at once and check it says the same thing everywhere.
//
// This is generated, never hand-edited. A written-by-hand inventory is stale
// the first time someone changes a headline; this one is stale for as long as
// it takes to run `npm run copy:audit`.
//
// It is a review aid, not a linter. The checks at the end flag things worth a
// human look; they are not failures and the script always exits 0.

import { readdirSync, readFileSync, writeFileSync, statSync, mkdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const SCAN = ["app", "components", "lib/copy.ts"];
const OUT = join(ROOT, "docs", "copy-inventory.md");

// Attributes and object keys that carry copy. Anything not on this list is
// treated as markup or configuration and ignored.
const COPY_ATTRS = [
  "title", "label", "placeholder", "description", "meta", "alt", "aria-label",
  "answer", "question", "body", "eyebrow", "headline", "subhead", "guide",
  "actionLabel", "busyLabel", "confirmationLabel", "removeLabel", "feature",
  "confirmationValue", "badge",
];

/**
 * Read a `[term, meaning]` pair list out of lib/copy.ts. Pairs rather than
 * objects precisely so this needs no TypeScript build step.
 */
function pairList(source, name) {
  const block = source.match(new RegExp(`export const ${name}[^=]*=\\s*\\[([\\s\\S]*?)\\n\\];`));
  if (!block) return [];
  const rows = [];
  for (const m of block[1].matchAll(/\[\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*\]/g)) {
    rows.push([m[1].replace(/\\"/g, '"'), m[2].replace(/\\"/g, '"')]);
  }
  return rows;
}

const COPY_SOURCE = readFileSync(join(ROOT, "lib", "copy.ts"), "utf8");
const VOCABULARY = pairList(COPY_SOURCE, "VOCABULARY");
const SECTIONS = pairList(COPY_SOURCE, "SECTIONS");
const AVOID = pairList(COPY_SOURCE, "AVOID");
const CASING = pairList(COPY_SOURCE, "CASING");
const BRAND = pairList(COPY_SOURCE, "BRAND");

// What not to say on a public surface, built from the AVOID list in
// lib/copy.ts so the rule and the check are the same thing. "publication" is
// excluded because it is correct nearly everywhere — only plan capacity copy
// should avoid it, which is too narrow for a word match.
const FLAGGED = AVOID
  .filter(([term]) => term !== "publication")
  .map(([term, instead]) => [
    new RegExp(term.includes(" ") ? `\\b${term}\\b` : `\\b${term}s?\\b`, term === "AI" ? "" : "i"),
    instead,
  ]);

// Title Case is correct for these: route headlines, section and card headings,
// dialog titles, plan names, proper nouns. Source.md reserves sentence case for
// buttons, command links, CTAs, statuses and validation. A new heading will be
// flagged until it is added here, which is deliberate — it forces the call to be
// made once rather than drifting.
const TITLE_CASE_OK = new Set([
  "Premium Plan", "Delete Account", "Delete Publication", "Danger Zone",
  "Frequently Asked Questions", "Monthly Plans", "Scaffold Premium",
  "Aviral Agarwal", "Book Antiqua",
]);

function walk(dir, out = []) {
  if (!statSync(dir).isDirectory()) return [dir];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      walk(full, out);
    } else if (/\.(tsx|ts)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/** Strip block and line comments so prose inside them is not mistaken for copy. */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
}

function looksLikeProse(value) {
  const text = value.trim();
  if (text.length < 4) return false;
  if (!/[a-z]{2}/.test(text)) return false;           // needs real lowercase letters
  if (/^[a-z-]+$/.test(text) && text.includes("-")) return false;  // css-ish token
  if (/^(https?:|\/|#|\.\/|@)/.test(text)) return false;           // url or path
  if (/^[\d\s.,:;%+-]+$/.test(text)) return false;                 // numbers only
  return /\s/.test(text) || text.length > 12;          // a phrase, or a long word
}

function extract(source, { jsx }) {
  const clean = stripComments(source);
  const found = new Set();

  // JSX text nodes. Only in .tsx — in a .ts file every `>…<` is a TypeScript
  // generic, and treating `Array<[term: string, instead: string]>` as copy
  // swallows whole declarations.
  if (jsx) {
    for (const m of clean.matchAll(/>([^<>{}]+)</g)) {
      const text = m[1].replace(/\s+/g, " ").trim();
      if (looksLikeProse(text)) found.add(text);
    }
  }
  // copy-carrying attributes
  const attrs = COPY_ATTRS.join("|");
  for (const m of clean.matchAll(new RegExp(`\\b(?:${attrs})\\s*=\\s*"([^"]+)"`, "g"))) {
    const text = m[1].replace(/\s+/g, " ").trim();
    if (looksLikeProse(text)) found.add(text);
  }
  // copy-carrying object keys, e.g. { title: "...", body: "..." }
  for (const m of clean.matchAll(new RegExp(`\\b(?:${attrs})\\s*:\\s*"([^"]+)"`, "g"))) {
    const text = m[1].replace(/\s+/g, " ").trim();
    if (looksLikeProse(text)) found.add(text);
  }
  return [...found].sort((a, b) => a.localeCompare(b));
}

/** The canonical strings, read straight out of lib/copy.ts. */
function canonical() {
  const source = COPY_SOURCE;
  const rows = [];
  for (const m of source.matchAll(/export const ([A-Z_]+)(?::[^=]+)?\s*=\s*\n?\s*"((?:[^"\\]|\\.)*)"/g)) {
    rows.push([m[1], m[2]]);
  }
  // The definition lists are rules about copy, not copy. They quote the very
  // words they ban, so including them would flag the rulebook for its rules.
  const DEFINITIONS = new Set(["VOCABULARY", "SECTIONS", "AVOID", "CASING", "BRAND"]);
  for (const m of source.matchAll(/export const ([A-Z_]+)(?::[^=]+)?\s*=\s*\[([^\]]+)\]/g)) {
    if (DEFINITIONS.has(m[1])) continue;
    rows.push([m[1], m[2].replace(/\s+/g, " ").trim()]);
  }
  return rows;
}

const files = SCAN.flatMap((dir) => walk(join(ROOT, dir)));
const inventory = [];
for (const file of files) {
  const rel = relative(ROOT, file).split(sep).join("/");
  // lib/copy.ts is definitions, not markup: its product strings are the
  // canonical ones, and its vocabulary lists quote the very words they ban.
  // Checking those would flag the rulebook for containing the rules.
  const strings =
    rel === "lib/copy.ts"
      ? canonical().map(([, value]) => value).filter(looksLikeProse)
      : extract(readFileSync(file, "utf8"), { jsx: rel.endsWith(".tsx") });
  if (strings.length) inventory.push([rel, strings]);
}
inventory.sort((a, b) => a[0].localeCompare(b[0]));

// ---- checks
const flags = [];
const PUBLIC = /^(app\/(page|about|support|layout|opengraph-image|twitter-image)|lib\/copy\.ts)/;
for (const [file, strings] of inventory) {
  for (const text of strings) {
    if (PUBLIC.test(file)) {
      for (const [re, why] of FLAGGED) {
        if (re.test(text)) flags.push([file, text, why]);
      }
    }
    const words = text.split(" ");
    const isTitleCase =
      words.length >= 2 && words.length <= 4 &&
      words.every((w) => /^[A-Z][a-z]+$/.test(w)) &&
      !TITLE_CASE_OK.has(text);
    if (isTitleCase) flags.push([file, text, "Title Case — buttons and CTAs take sentence case"]);
  }
}

const total = inventory.reduce((n, [, s]) => n + s.length, 0);
const lines = [];
lines.push("# Copy inventory");
lines.push("");
lines.push("Generated by `npm run copy:audit`. Do not edit by hand — rerun it instead.");
lines.push("");
lines.push(`Every user-facing string in \`app/\` and \`components/\`: **${total}** across **${inventory.length}** files.`);
lines.push("Read it end to end when you want to check the product says the same thing everywhere.");
lines.push("");
lines.push("Everything above the per-file listing is defined in `lib/copy.ts`. Change it");
lines.push("there — this file is output, and the checks below are enforced from the same");
lines.push("definitions, so a rule cannot drift away from what is checked.");
lines.push("");
lines.push("## Vocabulary");
lines.push("");
lines.push("Five levels, outermost first. Using the wrong one for the wrong level is how copy stops making sense.");
lines.push("");
lines.push("| Term | Means |");
lines.push("| --- | --- |");
for (const [term, meaning] of VOCABULARY) lines.push(`| **${term}** | ${meaning} |`);
lines.push("");
lines.push("### Workspace sections");
lines.push("");
lines.push("Nav order. Use these names everywhere, including empty and error states.");
lines.push("");
lines.push("| Section | Does |");
lines.push("| --- | --- |");
for (const [section, does] of SECTIONS) lines.push(`| **${section}** | ${does} |`);
lines.push("");
lines.push("## Words to avoid");
lines.push("");
lines.push("Flagged automatically on public surfaces. Add to `AVOID` in `lib/copy.ts`, not to the script.");
lines.push("");
lines.push("| Not this | Instead |");
lines.push("| --- | --- |");
for (const [term, instead] of AVOID) lines.push(`| ${term} | ${instead} |`);
lines.push("");
lines.push("## Casing");
lines.push("");
lines.push("Title Case names a thing. Sentence case asks for an action.");
lines.push("");
lines.push("| Context | Rule |");
lines.push("| --- | --- |");
for (const [context, rule] of CASING) lines.push(`| ${context} | ${rule} |`);
lines.push("");
lines.push("## Brand");
lines.push("");
lines.push("| | |");
lines.push("| --- | --- |");
for (const [item, value] of BRAND) lines.push(`| **${item}** | ${value} |`);
lines.push("");
lines.push("## Canonical strings");
lines.push("");
lines.push("These live in `lib/copy.ts` and every public surface reads from them.");
lines.push("Change them there and the whole product moves together.");
lines.push("");
for (const [name, value] of canonical()) {
  lines.push(`- **\`${name}\`** — ${value}`);
}
lines.push("");
lines.push("## Checks");
lines.push("");
if (!flags.length) {
  lines.push("Nothing flagged.");
} else {
  lines.push("Worth a human look. These are not errors.");
  lines.push("");
  for (const [file, text, why] of flags) {
    lines.push(`- \`${file}\` — _${why}_ — “${text}”`);
  }
}
lines.push("");
lines.push("## Every string, by file");
lines.push("");
for (const [file, strings] of inventory) {
  lines.push(`### \`${file}\``);
  lines.push("");
  for (const text of strings) lines.push(`- ${text}`);
  lines.push("");
}

mkdirSync(join(ROOT, "docs"), { recursive: true });
writeFileSync(OUT, lines.join("\n"), "utf8");
console.log(`copy-audit: ${total} strings from ${inventory.length} files -> docs/copy-inventory.md`);
console.log(flags.length ? `copy-audit: ${flags.length} flagged for review` : "copy-audit: nothing flagged");
