// Check the local documentation set. Every doc is gitignored, so a clone or
// CI run has none and the check passes with nothing to read.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const docs = existsSync("docs") ? readdirSync("docs").filter((name) => name.endsWith(".md")).map((name) => `docs/${name}`) : [];
const files = ["AGENTS.md", ...docs].filter((file) => existsSync(file));
const errors = [];
let checked = 0;
const slug = (text) => text.toLowerCase().replace(/[`*_]/g, "").replace(/[^\p{L}\p{N}_\-\s]/gu, "").trim().replace(/\s/g, "-");

// AGENTS.md is the one map. A doc it does not list should not exist, and
// CLAUDE.md only imports it so the two cannot disagree.
if (existsSync("AGENTS.md")) {
  const map = readFileSync("AGENTS.md", "utf8");
  for (const doc of docs) if (!map.includes(`(${doc})`)) errors.push(`${doc}: not linked from the AGENTS.md map`);
  if (existsSync("CLAUDE.md") && readFileSync("CLAUDE.md", "utf8").trim() !== "@AGENTS.md") errors.push("CLAUDE.md: must contain only @AGENTS.md");
} else if (docs.length) errors.push("AGENTS.md: missing, but docs/ exists without a map");

for (const file of files) {
  checked++;
  const source = readFileSync(file, "utf8");
  let fence = null;
  let columns = null;
  const lines = source.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    const at = `${file}:${index + 1}`;
    if (/^(?:<<<<<<< |=======\s*$|>>>>>>> )/.test(line)) errors.push(`${at}: unresolved conflict marker`);
    if (line.includes("\uFFFD")) errors.push(`${at}: invalid text encoding`);
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})(.*)$/);
    if (marker) {
      if (!fence) fence = { char: marker[1][0], length: marker[1].length };
      else if (marker[1][0] === fence.char && marker[1].length >= fence.length && !marker[2].trim()) fence = null;
      columns = null;
      continue;
    }
    if (fence) continue;
    if (line.trim().startsWith("|")) {
      const width = line.trim().replace(/^\||(?<!\\)\|$/g, "").split(/(?<!\\)\|/).length;
      if (columns !== null && columns !== width) errors.push(`${at}: table column count differs from its header`);
      columns = width;
    } else columns = null;

    for (const link of line.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const target = link[1].replace(/^<|>$/g, "");
      if (/^[a-z][\w+.-]*:/i.test(target)) continue;
      const [path, anchor] = target.split("#");
      const destination = path ? resolve(dirname(file), decodeURIComponent(path)) : resolve(file);
      if (!existsSync(destination)) {
        errors.push(`${at}: missing link target ${target}`);
      } else if (anchor && destination.endsWith(".md")) {
        const headings = [...readFileSync(destination, "utf8").matchAll(/^#{1,6}\s+(.+)$/gm)].map((match) => slug(match[1]));
        if (!headings.includes(decodeURIComponent(anchor))) errors.push(`${at}: missing heading ${target}`);
      }
    }
  }
  if (fence) errors.push(`${file}: unclosed code fence`);
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else console.log(`docs-check: ${checked} files passed fence, table, encoding, and local-link checks`);
