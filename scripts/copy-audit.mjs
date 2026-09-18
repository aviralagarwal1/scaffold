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
const SCAN = ["app", "components"];
const OUT = join(ROOT, "docs", "copy-inventory.md");

// Attributes and object keys that carry copy. Anything not on this list is
// treated as markup or configuration and ignored.
const COPY_ATTRS = [
  "title", "label", "placeholder", "description", "meta", "alt", "aria-label",
  "answer", "question", "body", "eyebrow", "headline", "subhead", "guide",
  "actionLabel", "busyLabel", "confirmationLabel", "removeLabel", "feature",
  "confirmationValue", "badge",
];

// Words the product should not say on a public surface. From Source.md's copy
// rules plus the decision not to sell on the model.
const FLAGGED = [
  [/\bAI\b/, "sells on the model"],
  [/\bagents?\b/i, "sells on the model"],
  [/\bingest\w*/i, "internal vocabulary"],
  [/\byour Substack\b/i, "platform-specific framing"],
  [/\beditor\b/i, "retired persona label"],
  [/\bcurator\b/i, "retired persona label"],
];

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

function extract(source) {
  const clean = stripComments(source);
  const found = new Set();

  // JSX text nodes
  for (const m of clean.matchAll(/>([^<>{}]+)</g)) {
    const text = m[1].replace(/\s+/g, " ").trim();
    if (looksLikeProse(text)) found.add(text);
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
  const source = readFileSync(join(ROOT, "lib", "copy.ts"), "utf8");
  const rows = [];
  for (const m of source.matchAll(/export const ([A-Z_]+)(?::[^=]+)?\s*=\s*\n?\s*"((?:[^"\\]|\\.)*)"/g)) {
    rows.push([m[1], m[2]]);
  }
  for (const m of source.matchAll(/export const ([A-Z_]+)(?::[^=]+)?\s*=\s*\[([^\]]+)\]/g)) {
    rows.push([m[1], m[2].replace(/\s+/g, " ").trim()]);
  }
  return rows;
}

const files = SCAN.flatMap((dir) => walk(join(ROOT, dir)));
const inventory = [];
for (const file of files) {
  const strings = extract(readFileSync(file, "utf8"));
  if (strings.length) inventory.push([relative(ROOT, file).split(sep).join("/"), strings]);
}
inventory.sort((a, b) => a[0].localeCompare(b[0]));

// ---- checks
const flags = [];
const PUBLIC = /^app\/(page|about|support|layout|opengraph-image|twitter-image)/;
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
