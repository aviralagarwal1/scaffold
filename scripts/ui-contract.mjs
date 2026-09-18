import ts from "typescript";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

export function copyObjects(source) {
  const tree = ts.createSourceFile("copy.ts", source, ts.ScriptTarget.Latest, true);
  const result = {};
  function value(node) {
    if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) return value(node.expression);
    if (ts.isStringLiteral(node)) return node.text;
    if (!ts.isObjectLiteralExpression(node)) return undefined;
    return Object.fromEntries(node.properties.filter(ts.isPropertyAssignment).map((item) => [item.name.getText(tree).replace(/["']/g, ""), value(item.initializer)]));
  }
  for (const statement of tree.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (declaration.initializer) result[declaration.name.getText(tree)] = value(declaration.initializer);
    }
  }
  return result;
}

export function flattenCopy(value, prefix) {
  if (typeof value === "string") return [[prefix, value]];
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, item]) => flattenCopy(item, `${prefix}.${key}`));
}

// Deliberately small language heuristics, not a general English parser.
function singular(word) {
  return word.toLowerCase().replace(/ies$/, "y").replace(/(ch|sh|x|z|ss)es$/, "$1").replace(/(?<!s)s$/, "");
}

function wordFamily(word) {
  const normalized = singular(word);
  const families = [
    ["explore", "exploration", "exploratory"],
    ["promote", "promotion", "promotional"],
    ["converse", "conversation", "conversational"],
    ["distribute", "distribution"],
    ["set", "setting"],
  ];
  return families.find((family) => family.includes(normalized))?.[0] ?? normalized;
}

export function validatePageCopy(pages) {
  const errors = [];
  const nouns = new Set();
  const labels = new Set();
  const ctaVerbs = new Set();
  for (const [key, page] of Object.entries(pages ?? {})) {
    const title = /^(?<verb>[A-Z][a-z]+) your (?<noun>[a-z]+(?: [a-z]+)?)\.$/.exec(page?.title ?? "");
    if (!title) {
      errors.push(`${key}: headline must be "Verb your noun."`);
    } else {
      const noun = singular(title.groups.noun);
      if (nouns.has(noun)) errors.push(`${key}: headline noun must be distinct across sections, including singular/plural forms`);
      nouns.add(noun);
      if (wordFamily(title.groups.verb) === wordFamily(page.label ?? "")) errors.push(`${key}: headline verb must differ from the tab's word family`);
    }
    if (!/^[A-Z][a-z]+$/.test(page?.label ?? "") || labels.has(page.label)) errors.push(`${key}: tab label must be one distinct Title Case word`);
    labels.add(page?.label);
    const line = page?.description ?? "";
    const description = /^(?<subject>[A-Z][a-z]+(?: [a-z]+){0,3}) are [^.!?;\n]+\.$/.exec(line);
    if (!description || !/s$/.test(description.groups.subject) || /(?:ss|us|is)$/.test(description.groups.subject) || line.split(/\s+/).length > 16) {
      errors.push(`${key}: description must be one "Plural noun phrase are predicate." sentence, at most 16 words`);
    }
    if (/\b(?:best|deserve|seamless|powerful|effortless|excellence|simply|just|click|select|choose)\b/i.test(line)) {
      errors.push(`${key}: description contains praise, filler, or an instruction`);
    }
    if (Object.keys(page ?? {}).some((field) => !["label", "title", "description", "ctaVerb"].includes(field))) errors.push(`${key}: section fields are label, title, description, and optional ctaVerb only`);
    if (page && "ctaVerb" in page) {
      if (!/^[A-Z][a-z]+$/.test(page.ctaVerb ?? "")) errors.push(`${key}: CTA verb must be one sentence-case word`);
      if (ctaVerbs.has(page.ctaVerb)) errors.push(`${key}: CTA verbs must be distinct across Overview cards`);
      ctaVerbs.add(page.ctaVerb);
    }
  }
  if (!Object.keys(pages ?? {}).length) errors.push("WORKSPACE_PAGE_COPY is missing");
  return errors;
}

export function validateOverviewCoverage(pages) {
  const errors = [];
  for (const [key, page] of Object.entries(pages ?? {})) {
    if ((page?.ctaVerb !== undefined) !== !["library", "settings"].includes(key)) {
      errors.push(`${key}: Overview CTAs must cover every tool except Library and Settings`);
    }
  }
  return errors;
}

/** Card callers choose a destination; the component owns all visible copy. */
export function validateOverviewCardUsage(source) {
  const errors = [];
  const tree = ts.createSourceFile("overview.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function visit(node) {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(tree) === "InsightCard") {
      const attrs = node.attributes.properties;
      if (attrs.some((attr) => !ts.isJsxAttribute(attr) || !["key", "section", "token"].includes(attr.name.getText(tree)))) {
        errors.push("InsightCard only accepts section, token, and key; local copy, URLs, and spreads are forbidden");
      }
      for (const required of ["section", "token"]) {
        if (!attrs.some((attr) => ts.isJsxAttribute(attr) && attr.name.getText(tree) === required && attr.initializer)) {
          errors.push(`InsightCard requires ${required}`);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return errors;
}

export function checkWorkspaceUI(root, pages) {
  const errors = [...validatePageCopy(pages), ...validateOverviewCoverage(pages)];
  const seen = new Map();
  function walk(dir) {
    return readdirSync(dir, { withFileTypes: true }).flatMap((item) => item.isDirectory() ? walk(join(dir, item.name)) : [join(dir, item.name)]);
  }
  for (const file of [...walk(join(root, "app/workspace")), ...walk(join(root, "components/workspace"))].filter((path) => path.endsWith(".tsx"))) {
    const source = readFileSync(file, "utf8");
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const name = relative(root, file).replaceAll("\\", "/");
    errors.push(...validateOverviewCardUsage(source).map((error) => `${name}: ${error}`));
    function visit(node) {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(tree);
        const attrs = node.attributes.properties;
        if (tag === "PageHeader") {
          const section = attrs.find((attr) => ts.isJsxAttribute(attr) && attr.name.getText(tree) === "section");
          const key = section?.initializer && ts.isStringLiteral(section.initializer) ? section.initializer.text : null;
          if (!key || !pages[key]) errors.push(`${name}: PageHeader needs a literal registered section key`);
          else seen.set(key, (seen.get(key) ?? 0) + 1);
          if (attrs.some((attr) => !ts.isJsxAttribute(attr) || !["section", "action"].includes(attr.name.getText(tree)))) errors.push(`${name}: PageHeader does not accept local copy or spreads`);
        }
        const classAttr = attrs.find((attr) => ts.isJsxAttribute(attr) && attr.name.getText(tree) === "className");
        const classes = classAttr?.initializer && ts.isStringLiteral(classAttr.initializer) ? classAttr.initializer.text : "";
        if (/\bbtn-(?:primary|secondary)\b/.test(classes) && classes.split(/\s+/).some((item) => /^(?:[\w-]+:)*!?(?:h-\d|px-\d|py-\d|text-(?:xs|sm|base|\[)|rounded-(?:full|lg|xl))/.test(item))) {
          errors.push(`${name}: shared button geometry must not be overridden locally`);
        }
        if (["input", "textarea", "select"].includes(tag) && !/\binput(?:-embedded)?\b/.test(classes)) {
          const type = attrs.find((attr) => ts.isJsxAttribute(attr) && attr.name.getText(tree) === "type");
          const value = type?.initializer && ts.isStringLiteral(type.initializer) ? type.initializer.text : "";
          // Dynamic class expressions are reviewed; native checks and hidden fields are separate controls.
          if (classes && !["checkbox", "radio", "hidden"].includes(value)) errors.push(`${name}: text fields and selects use the shared input class`);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(tree);
  }
  for (const key of Object.keys(pages)) {
    if (seen.get(key) !== 1) errors.push(`${key}: expected exactly one PageHeader consumer, found ${seen.get(key) ?? 0}`);
  }
  return errors;
}
