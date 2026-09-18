import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { copyObjects, flattenCopy, validateOverviewCoverage, validatePageCopy, validateOverviewCardUsage, checkWorkspaceUI } from "../scripts/ui-contract.mjs";

const copySource = readFileSync(new URL("../lib/copy.ts", import.meta.url), "utf8");
const copyTree = copyObjects(copySource);
const pages = copyTree.WORKSPACE_PAGE_COPY;

// Render the real TSX components without Next's server or a browser. Only routing is stubbed.
const require = createRequire(import.meta.url);
function loadModule(path, sourceOverride, copyOverride) {
  const source = sourceOverride ?? readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: path,
  });
  const module = { exports: {} };
  const resolve = (id) => {
    if (id === "next/link") return { __esModule: true, default: (props) => createElement("a", props) };
    if (id === "next/navigation") return { usePathname: () => "/workspace/test/distribution" };
    if (id === "@/lib/copy" && copyOverride) return copyOverride;
    if (id.startsWith("@/")) return loadModule(`${id.slice(2)}.ts`);
    return require(id);
  };
  new Function("require", "module", "exports", outputText)(resolve, module, module.exports);
  return module.exports;
}

function renderComponent(name, props, copy) {
  const component = loadModule(`components/workspace/${name}.tsx`, undefined, copy)[name];
  return renderToStaticMarkup(createElement(component, props));
}

const escapeHtml = (text) => renderToStaticMarkup(createElement("span", null, text)).replace(/^<span>|<\/span>$/g, "");

test("copy extraction preserves nested section keys without executing application code", () => {
  const objects = copyObjects('export const COPY = { notes: { title: "Annotate your writing.", description: "Notes are attached to passages." } } as const;');
  assert.deepEqual(flattenCopy(objects.COPY, "COPY"), [["COPY.notes.title", "Annotate your writing."], ["COPY.notes.description", "Notes are attached to passages."]]);
});

test("copy contract rejects headline drift, multi-sentence introductions, instructions and long descriptions", () => {
  const page = { label: "Notes", title: "Annotate your posts.", description: "Notes are attached to passages in your library." };
  assert.deepEqual(validatePageCopy({ notes: page }), []);
  for (const patch of [{ title: "Your notes." }, { description: "Feedback is based on your writing." }, { description: "Feedback are based on your writing." }, { description: "Analysis are based on your writing." }, { description: "Notes are saved. Pick a post." }, { description: "Choose a post to begin." }, { description: "Notes are simply attached to your best writing." }, { description: "Notes are " + "long ".repeat(18) + "sentences." }]) {
    assert.ok(validatePageCopy({ notes: { ...page, ...patch } }).length > 0);
  }
});

test("the actual workspace satisfies the copy and control contracts", () => {
  assert.deepEqual(checkWorkspaceUI(process.cwd(), pages), []);
});

test("Overview rejects missing destinations and copy overrides, including expressions and spreads", () => {
  assert.deepEqual(validateOverviewCardUsage('<InsightCard section="notes" token={token} />'), []);
  for (const attrs of ['section="notes"', 'token={token}', 'section="notes" token={token} title="Local title"', 'section="notes" token={token} description={"Local description"}', 'section="notes" token={token} {...copy}']) {
    assert.ok(validateOverviewCardUsage(`<InsightCard ${attrs} />`).length > 0, attrs);
  }
});

test("Overview requires every tool, one-word labels and verbs, and no independent CTA nouns", () => {
  assert.deepEqual(validateOverviewCoverage(pages), []);
  assert.ok(validateOverviewCoverage({ ...pages, library: { ...pages.library, ctaVerb: "Browse" } }).length > 0);
  const { ctaVerb, ...withoutCta } = pages.notes;
  assert.ok(validateOverviewCoverage({ ...pages, notes: withoutCta }).length > 0);
  for (const patch of [{ ctaVerb: "Create new" }, { ctaVerb: "add" }, { ctaVerb: "Add." }, { ctaVerb: "" }, { label: "Social posts" }, { cta: "Add writing" }, { eyebrow: "Notes" }]) {
    assert.ok(validatePageCopy({ ...pages, notes: { ...pages.notes, ...patch } }).length > 0, JSON.stringify(patch));
  }
});

test("title nouns, title/tab word families, and CTA verbs cannot repeat", () => {
  for (const [key, patch] of [
    ["distribution", { title: "Share your writing." }],
    ["distribution", { title: "Share your drafts." }],
    ["distribution", { title: "Share your idea." }],
    ["distribution", { title: "Share your memories." }],
    ["search", { title: "Search your passages." }],
    ["ideas", { title: "Explore your ideas." }],
    ["distribution", { title: "Promote your work." }],
    ["ask", { title: "Converse your memory." }],
    ["notes", { ctaVerb: "Open" }],
  ]) {
    assert.ok(validatePageCopy({ ...pages, [key]: { ...pages[key], ...patch } }).length > 0, JSON.stringify(patch));
  }
});

test("real page/card rendering preserves the registry's complete copy, CTA, and stable destination", () => {
  const copy = loadModule("lib/copy.ts");
  assert.deepEqual(copy.WORKSPACE_PAGE_COPY, pages);
  assert.equal(copy.OVERVIEW_SECTIONS.length, 6);
  for (const [section, page] of Object.entries(pages)) {
    const header = renderComponent("PageHeader", { section }, copy);
    assert.ok(header.includes(`>${escapeHtml(page.title)}</h2>`));
    assert.ok(header.includes(`>${escapeHtml(page.description)}</p>`));
    if (!page.ctaVerb) continue;
    const card = renderComponent("InsightCard", { section, token: "test" }, copy);
    assert.ok(card.includes(`>${escapeHtml(page.title)}</h3>`));
    assert.ok(card.includes(`>${escapeHtml(page.description)}</p>`));
    assert.ok(card.includes(`>${page.ctaVerb} ${page.label.toLowerCase()}<span`));
    assert.ok(card.includes(`href="/workspace/test/${section}"`));
    assert.equal(copy.overviewCta(section).split(" ").length, 2);
  }
  const nav = renderComponent("WorkspaceNav", { token: "test", overview: null }, copy);
  const utilities = renderComponent("WorkspaceUtilityLinks", { token: "test", pathname: "/workspace/test/library" }, copy);
  for (const [section, page] of Object.entries(pages)) {
    const utility = copy.WORKSPACE_UTILITY_TABS.some(({ slug }) => slug === section);
    assert.ok(utility ? utilities.includes(`>${page.label}</a>`) : nav.includes(`>${page.label}<span`));
    assert.equal(nav.includes(`href="/workspace/test/${section}"`), !utility);
  }
  assert.match(utilities, /href="\/workspace\/test\/library" aria-current="page"/);
  assert.ok(utilities.includes('href="/workspace/test/settings"'));
  assert.match(nav, /href="\/workspace\/test\/distribution" aria-current="page"/);
});

test("one registry edit propagates to both introductions, navigation and CTA", () => {
  // Hypothetical wording proves derivation; it does not authorize a product rename.
  const source = copySource.replace('label: "Promotion"', 'label: "Outreach"')
    .replace('title: "Share your work."', 'title: "Present your work."')
    .replace('description: "Drafts are adapted from your writing for social platforms."', 'description: "Drafts are adapted for social platforms."');
  const copy = loadModule("lib/copy.ts", source);
  const header = renderComponent("PageHeader", { section: "distribution" }, copy);
  const card = renderComponent("InsightCard", { section: "distribution", token: "test" }, copy);
  for (const html of [header, card]) {
    assert.ok(html.includes("Present your work."));
    assert.ok(html.includes("Drafts are adapted for social platforms."));
  }
  assert.ok(card.includes("Create outreach"));
  const nav = renderComponent("WorkspaceNav", { token: "test", overview: null }, copy);
  assert.ok(nav.includes(">Outreach<span"));
});
