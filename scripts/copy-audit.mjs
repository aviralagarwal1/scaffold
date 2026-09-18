#!/usr/bin/env node

// Copy audit.
//
// Scans every user-facing string in app/, components/, lib/copy.ts and
// lib/sample-preview.ts against the vocabulary rules in lib/copy.ts, so a rule
// and its enforcement are the same data. It writes no document: the rules live
// in lib/copy.ts and the strings live in the code, and a generated copy of
// either would be a second source to drift.
//
// Vocabulary and casing flags are review aids printed to the console.
// Workspace copy and control contract violations fail the command.
// Extraction is heuristic, not a full UI crawl.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { copyObjects, flattenCopy, checkWorkspaceUI } from "./ui-contract.mjs";

const ROOT = process.cwd();
const SCAN = ["app", "components", "lib/copy.ts", "lib/sample-preview.ts"];

// Attributes and object keys that carry copy. Anything not on this list is
// treated as markup or configuration and ignored.
const COPY_ATTRS = [
  "title", "label", "placeholder", "description", "meta", "alt", "aria-label",
  "answer", "question", "body", "eyebrow", "headline", "subhead", "guide",
  "actionLabel", "busyLabel", "confirmationLabel", "removeLabel", "feature",
  "confirmationValue", "badge", "cta",
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
const COPY_TREE = copyObjects(COPY_SOURCE);
const AVOID = pairList(COPY_SOURCE, "AVOID");

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
// dialog titles, plan names, proper nouns. Sentence case is reserved for
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
  // Code, not copy. In a .tsx file every TypeScript generic is also a `>…<`
  // slice, so `useState<Foo>(null); const [a] = useState<Bar>` arrives looking
  // exactly like a JSX text node. Operators and declaration keywords are the
  // tell; a leading punctuation mark is not, because a sentence broken by an
  // inline tag resumes on a comma.
  if (/&&|\|\||=>|\b(?:const|let|var|return|function|await)\b/.test(text)) return false;
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

/**
 * Every quoted string in a file, for the banned-word pass.
 *
 * Deliberately blunt where `extract` is careful: it catches the array entry
 * and the ternary branch that the copy-attribute list cannot reach. Class
 * names and keys come through too, which is fine — they are only ever tested
 * against the AVOID list, never reported as copy.
 */
function stringLiterals(source) {
  const clean = stripComments(source);
  const found = new Set();
  for (const m of clean.matchAll(/"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\$]|\\.)*)`/g)) {
    const text = (m[1] ?? m[2] ?? m[3]).replace(/\s+/g, " ").trim();
    if (text.length >= 4 && /[A-Za-z]{2}/.test(text)) found.add(text);
  }
  return found;
}

/**
 * JSX text nodes, including ones set entirely in capitals.
 *
 * `looksLikeProse` skips those on purpose — an eyebrow is not a sentence —
 * which also hid "CURATOR" from the inventory. The banned-word pass still
 * has to see them: a retired word in small caps is the same word.
 */
function jsxText(source) {
  const clean = stripComments(source);
  const found = new Set();
  for (const m of clean.matchAll(/>([^<>{}]+)</g)) {
    const text = m[1].replace(/\s+/g, " ").trim();
    if (text.length >= 4 && /[A-Za-z]{2}/.test(text)) found.add(text);
  }
  return found;
}

/** The canonical strings, read straight out of lib/copy.ts. */
function canonical() {
  const source = COPY_SOURCE;
  const rows = [];
  for (const [name, object] of Object.entries(copyObjects(source))) {
    if (object && typeof object === "object") rows.push(...flattenCopy(object, name));
  }
  for (const [key, page] of Object.entries(COPY_TREE.WORKSPACE_PAGE_COPY)) {
    if (page.ctaVerb) rows.push([`Overview.${key}.cta (derived)`, `${page.ctaVerb} ${page.label.toLowerCase()}`]);
  }
  for (const m of source.matchAll(/export const ([A-Z_]+)(?::[^=]+)?\s*=\s*\n?\s*"((?:[^"\\]|\\.)*)"/g)) {
    rows.push([m[1], m[2]]);
  }
  // The definition lists are rules about copy, not copy. They quote the very
  // words they ban, so including them would flag the rulebook for its rules.
  const DEFINITIONS = new Set(["VOCABULARY", "WORKSPACE_TABS", "AVOID", "CASING", "BRAND"]);
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
  const source = readFileSync(file, "utf8");
  const strings =
    rel === "lib/copy.ts"
      ? canonical().map(([, value]) => value).filter(looksLikeProse)
      : rel === "lib/sample-preview.ts"
        ? [...stringLiterals(source)].filter(looksLikeProse)
        : extract(source, { jsx: rel.endsWith(".tsx") });
  if (strings.length) inventory.push([rel, strings]);
}
inventory.sort((a, b) => a[0].localeCompare(b[0]));

// ---- checks
//
// Casing is checked against the inventory alone, because casing only means
// anything for a heading or a button.
//
// Banned words are checked three ways: against the inventory, against every
// quoted string, and against JSX text of any case. The inventory skips
// all-caps eyebrows, and a bare JSX word is not a quoted string, so "CURATOR"
// used to clear both passes. A retired word is wrong wherever it sits.
const flags = [];
const flag = (file, text, why) => {
  if (!flags.some((entry) => entry[0] === file && entry[1] === text && entry[2] === why)) {
    flags.push([file, text, why]);
  }
};

for (const [file, strings] of inventory) {
  for (const text of strings) {
    for (const [re, why] of FLAGGED) {
      if (re.test(text)) flag(file, text, why);
    }
    const words = text.split(" ");
    const isTitleCase =
      words.length >= 2 && words.length <= 4 &&
      words.every((w) => /^[A-Z][a-z]+$/.test(w)) &&
      !TITLE_CASE_OK.has(text);
    if (isTitleCase) flag(file, text, "Title Case — buttons and CTAs take sentence case");
  }
}

for (const file of files) {
  const rel = relative(ROOT, file).split(sep).join("/");
  if (rel === "lib/copy.ts") continue;  // the rulebook quotes the words it bans
  const source = readFileSync(file, "utf8");
  const texts = stringLiterals(source);
  if (rel.endsWith(".tsx")) {
    for (const text of jsxText(source)) texts.add(text);
  }
  for (const text of texts) {
    for (const [re, why] of FLAGGED) {
      if (re.test(text)) flag(rel, text, why);
    }
  }
}

flags.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));

const total = inventory.reduce((n, [, strings]) => n + strings.length, 0);
console.log(`copy-audit: ${total} strings scanned from ${inventory.length} files`);
for (const [file, text, why] of flags) console.log(`copy-audit: review ${file}: "${text}" (${why})`);
console.log(flags.length ? `copy-audit: ${flags.length} flagged for review` : "copy-audit: nothing flagged");
const contractErrors = checkWorkspaceUI(ROOT, COPY_TREE.WORKSPACE_PAGE_COPY);
if (contractErrors.length) {
  console.error(contractErrors.map((error) => `copy-audit: ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log("copy-audit: workspace copy and control contracts passed");
}
