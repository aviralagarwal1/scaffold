import type { Post } from "@/types/post";
import type { ArchiveTheme, Workspace } from "@/types/workspace";
import { generateText } from "./anthropic";
import { normalizePostTitle, normalizePostUrl, signature } from "./post-identity";
import { excerpt } from "./text";

// Library theme engine.
//
// Themes reach the product two ways: detected deterministically from the
// corpus, and proposed by the model. Both paths need the same vocabulary and
// the same idea of what makes a label or description usable, so both used to
// carry their own copy — `store.ts` and `ai.ts` each held the connector set,
// the generic-label set, and their own `ensureSentence`/`cleanThemeLabel`.
// They live here once now.
//
// Two stopword sets remain, deliberately. THEME_STOPWORDS filters n-grams
// pulled out of raw prose and has to be broad. MODEL_THEME_STOPWORDS filters
// labels the model proposed and is narrower, because the model rarely emits
// bare function words but does reach for filler adjectives. Merging them
// would change what each path accepts.

/** Short tokens that are real subjects rather than noise. */
const SHORT_THEME_TERMS = new Set(["ai", "vc", "ml", "llm", "llms", "saas", "ipo", "ip"]);

/** Words allowed inside a label but never at either edge of one. */
const THEME_LABEL_CONNECTORS = new Set(["and", "as", "for", "in", "of", "the", "to"]);

/** Broad stopwords for n-grams extracted from prose. */
const THEME_STOPWORDS = new Set([
  "able",
  "about",
  "above",
  "after",
  "again",
  "against",
  "almost",
  "along",
  "already",
  "also",
  "although",
  "always",
  "among",
  "another",
  "aren",
  "around",
  "because",
  "before",
  "being",
  "below",
  "between",
  "both",
  "cannot",
  "can",
  "could",
  "couldn",
  "does",
  "doesn",
  "don",
  "doing",
  "done",
  "down",
  "during",
  "each",
  "either",
  "else",
  "even",
  "ever",
  "every",
  "everything",
  "first",
  "from",
  "getting",
  "going",
  "good",
  "have",
  "hadn",
  "hasn",
  "haven",
  "having",
  "here",
  "hers",
  "himself",
  "https",
  "into",
  "itself",
  "isn",
  "just",
  "like",
  "made",
  "makes",
  "many",
  "more",
  "most",
  "much",
  "must",
  "never",
  "only",
  "other",
  "over",
  "people",
  "point",
  "really",
  "real",
  "same",
  "should",
  "shouldn",
  "since",
  "some",
  "something",
  "still",
  "such",
  "than",
  "that",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "thing",
  "things",
  "this",
  "those",
  "through",
  "time",
  "under",
  "trying",
  "very",
  "want",
  "well",
  "were",
  "wasn",
  "weren",
  "what",
  "when",
  "where",
  "which",
  "while",
  "will",
  "won",
  "with",
  "work",
  "would",
  "wouldn",
  "your"
]);

/** Single words too generic to stand as a theme. */
const GENERIC_SINGLE_THEME_LABELS = new Set([
  "article",
  "articles",
  "culture",
  "essay",
  "essays",
  "industry",
  "piece",
  "pieces",
  "reader",
  "readers",
  "story",
  "stories",
  "theme",
  "themes",
  "writing"
]);

/** Narrower stopwords for labels the model proposed. */
const MODEL_THEME_STOPWORDS = new Set([
  "decades",
  "aren",
  "can",
  "couldn",
  "didn",
  "doesn",
  "don",
  "even",
  "excited",
  "favorite",
  "genuinely",
  "hadn",
  "hasn",
  "haven",
  "isn",
  "just",
  "like",
  "major",
  "more",
  "only",
  "spent",
  "than",
  "them",
  "they",
  "this",
  "time",
  "wasn",
  "weren",
  "what",
  "when",
  "where",
  "which",
  "while",
  "work",
  "won",
  "would",
  "wouldn"
]);

/** Company-name suffixes: a theme should be a subject, not an organization. */
const ENTITY_SUFFIX_TERMS = new Set(["bros", "corp", "corporation", "inc", "llc", "ltd"]);

export function cleanThemeLabel(label: string): string {
  return label
    .replace(/\s+/g, " ")
    .replace(/^[\s"'`]+|[\s"'`.!?]+$/g, "")
    .trim();
}

function ensureSentence(value: string): string {
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}

function isUsefulThemeLabel(label: string): boolean {
  const clean = cleanThemeLabel(label).toLowerCase();
  if (clean.length < 2 || /^\d+$/.test(clean)) return false;
  const words = clean.split(/\s+/);
  if (words.length === 1 && GENERIC_SINGLE_THEME_LABELS.has(clean)) return false;
  if (words[0] === "valley" || words[words.length - 1] === "wasn") return false;
  if (THEME_LABEL_CONNECTORS.has(words[0]) || THEME_LABEL_CONNECTORS.has(words[words.length - 1])) return false;
  if (words.some((word, index) => {
    const isConnector = index > 0 && index < words.length - 1 && THEME_LABEL_CONNECTORS.has(word);
    return !isConnector && (THEME_STOPWORDS.has(word) || (word.length < 4 && !SHORT_THEME_TERMS.has(word)));
  })) return false;
  if (words.length === 1 && THEME_STOPWORDS.has(clean)) return false;
  return true;
}

function isUsefulThemeDescription(description: string): boolean {
  const lower = description.toLowerCase();
  if (!lower) return false;
  if (/\b(candidate|label)\b/.test(lower)) return false;
  if (/\bappears?\s+in\s+(?:the\s+)?(?:title|subtitle|article|post)/.test(lower)) return false;
  if (/^this\s+(?:appears|shows up|recurs|is present|candidate)/.test(lower)) return false;
  if (/^a recurring (?:archive|library) pattern around\b/.test(lower)) return false;
  return true;
}

function normalizeThemeDescription(description: string, label: string): string {
  const cleaned = description
    .replace(/\s+/g, " ")
    .replace(/^[\s"'`]+|[\s"'`.!?]+$/g, "")
    .trim();
  if (!isUsefulThemeDescription(cleaned)) {
    return `You return to ${label.toLowerCase()} as a recurring lens in your library.`;
  }
  if (/^You\b/.test(cleaned)) return ensureSentence(cleaned);
  return ensureSentence(`You ${cleaned.charAt(0).toLowerCase()}${cleaned.slice(1)}`);
}

function isGenericThemeDescription(description: string): boolean {
  return /^You return to .+ as a recurring lens in your (?:archive|library)\.$/i.test(description.trim());
}

function extractThemeTerms(text: string, maxWords: 2 | 3, includeSingleWords: boolean): string[] {
  const words = text.match(/\b[a-z][a-z-]{1,}\b/g) ?? [];
  const terms: string[] = [];

  if (includeSingleWords) {
    for (const word of words) {
      if (isUsefulThemeLabel(word)) terms.push(word);
    }
  }

  for (let size = 2; size <= maxWords; size += 1) {
    for (let i = 0; i <= words.length - size; i += 1) {
      const phraseWords = words.slice(i, i + size);
      const phrase = phraseWords.join(" ");
      if (!isUsefulThemeLabel(phrase)) continue;
      terms.push(phrase);
    }
  }

  return terms;
}

export function detectArchiveThemes(posts: Post[]): ArchiveTheme[] {
  const postCounts = new Map<string, Set<string>>();
  const weightedCounts = new Map<string, number>();
  for (const post of posts) {
    const title = post.title.toLowerCase().replace(/https?:\/\/\S+/g, " ");
    const subtitle = (post.subtitle ?? "").toLowerCase().replace(/https?:\/\/\S+/g, " ");
    const body = post.contentText.toLowerCase().replace(/https?:\/\/\S+/g, " ");
    const titleTerms = extractThemeTerms(`${title} ${subtitle}`, 3, true);
    const bodyTerms = extractThemeTerms(body, 3, false);

    for (const term of [...titleTerms, ...bodyTerms]) {
      const seenInPosts = postCounts.get(term) ?? new Set<string>();
      seenInPosts.add(post.id);
      postCounts.set(term, seenInPosts);
    }
    for (const term of titleTerms) {
      weightedCounts.set(term, (weightedCounts.get(term) ?? 0) + 4);
    }
    for (const term of bodyTerms) {
      weightedCounts.set(term, (weightedCounts.get(term) ?? 0) + 1);
    }
  }

  const maxPosts = Math.max(posts.length, 1);
  const scoredThemes = [...weightedCounts.entries()]
    .map(([term, weight]) => {
      const evidencePostIds = [...(postCounts.get(term) ?? new Set<string>())];
      const libraryReach = evidencePostIds.length / maxPosts;
      return {
        label: term,
        description: `A recurring library pattern around ${term}.`,
        evidencePostIds: evidencePostIds.slice(0, 5),
        confidence: Math.min(0.9, 0.35 + libraryReach * 0.45 + Math.min(weight / 120, 0.1)),
        level: term.includes(" ") ? "subtheme" as const : "field" as const,
        parentLabel: null,
        aliases: [],
        importance: Math.min(0.9, 0.35 + libraryReach * 0.45 + Math.min(weight / 120, 0.1)),
        breadth: term.includes(" ") ? 0.45 : 0.65,
        score: weight + evidencePostIds.length * 8
      };
    })
    .filter((theme) => isUsefulThemeLabel(theme.label))
    .sort((a, b) => b.score - a.score);
  const recurringThemes = scoredThemes.filter((theme) => theme.evidencePostIds.length > 1 || posts.length <= 2);

  return (recurringThemes.length ? recurringThemes : scoredThemes)
    .slice(0, 12)
    .map(({ score: _score, ...theme }) => theme);
}

function compareArchiveThemes(a: ArchiveTheme, b: ArchiveTheme): number {
  const levelRank = (theme: ArchiveTheme) => theme.level === "field" ? 0 : theme.level === "subtheme" ? 1 : 2;
  const byLevel = levelRank(a) - levelRank(b);
  if (byLevel !== 0) return byLevel;
  const byImportance = (b.importance ?? b.confidence) - (a.importance ?? a.confidence);
  if (byImportance !== 0) return byImportance;
  return (b.breadth ?? 0) - (a.breadth ?? 0);
}

export function normalizeArchiveThemes(workspace: Workspace, posts: Post[]): ArchiveTheme[] {
  const seen = new Set<string>();
  const storedThemes: ArchiveTheme[] = workspace.archiveThemes?.length ? workspace.archiveThemes : workspace.topThemes.map((label) => ({
    label,
    description: `A recurring library pattern around ${label}.`,
    evidencePostIds: [],
    confidence: 0.45
  }));
  const themes = storedThemes
    .map((theme) => ({
      label: cleanThemeLabel(theme.label),
      description: normalizeThemeDescription(theme.description ?? "", cleanThemeLabel(theme.label)),
      evidencePostIds: Array.isArray(theme.evidencePostIds) ? theme.evidencePostIds.slice(0, 5) : [],
      confidence: clampConfidence(theme.confidence),
      level: theme.level === "field" || theme.level === "subtheme" || theme.level === "motif" ? theme.level : "subtheme",
      parentLabel: typeof theme.parentLabel === "string" && theme.parentLabel.trim() ? cleanThemeLabel(theme.parentLabel) : null,
      aliases: Array.isArray(theme.aliases) ? theme.aliases.map(cleanThemeLabel).filter(Boolean).slice(0, 8) : [],
      importance: clampConfidence(theme.importance ?? theme.confidence),
      breadth: clampConfidence(theme.breadth ?? (theme.level === "field" ? 0.75 : 0.45))
    }))
    .filter((theme) => {
      const key = theme.label.toLowerCase();
      if (!isUsefulThemeLabel(theme.label) || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return (themes.length ? themes : detectArchiveThemes(posts))
    .sort(compareArchiveThemes)
    .slice(0, 15);
}

export function normalizeProvidedArchiveThemes(themes: ArchiveTheme[], posts: Post[]): ArchiveTheme[] {
  const workspace: Workspace = {
    id: "",
    token: "",
    publicationUrl: "",
    publicationName: null,
    status: "ready",
    createdAt: "",
    updatedAt: "",
    lastIngestedAt: null,
    ingestionError: null,
    topThemes: themes.map((theme) => theme.label),
    archiveThemes: themes
  };
  return normalizeArchiveThemes(workspace, posts);
}

export function hasReusableThemeQuality(themes: ArchiveTheme[]): boolean {
  if (themes.length < 4) return false;
  return !themes.some((theme) => isGenericThemeDescription(theme.description));
}

function isMinorArchiveDelta(existingValues: string[], incomingValues: string[]): boolean {
  if (existingValues.length === 0 || incomingValues.length === 0) return false;
  const existing = new Set(existingValues);
  const incoming = new Set(incomingValues);
  const overlap = [...existing].filter((value) => incoming.has(value)).length;
  const smallerSize = Math.min(existing.size, incoming.size);
  const countDelta = Math.abs(existing.size - incoming.size);
  const allowedDelta = Math.max(1, Math.floor(smallerSize * 0.08));

  return overlap / smallerSize >= 0.92 && countDelta <= allowedDelta;
}

export function isStableArchivePostSet(existingPosts: Post[], incomingPosts: Post[]): boolean {
  const existingTitles = existingPosts.map((post) => normalizePostTitle(post.title)).filter(Boolean);
  const incomingTitles = incomingPosts.map((post) => normalizePostTitle(post.title)).filter(Boolean);
  const existingUrls = existingPosts.map((post) => normalizePostUrl(post.url)).filter(Boolean);
  const incomingUrls = incomingPosts.map((post) => normalizePostUrl(post.url)).filter(Boolean);

  const existingTitleSignature = signature(existingTitles);
  const incomingTitleSignature = signature(incomingTitles);
  const existingUrlSignature = signature(existingUrls);
  const incomingUrlSignature = signature(incomingUrls);

  if (existingTitleSignature.length > 0 && existingTitleSignature === incomingTitleSignature) return true;
  if (existingUrlSignature.length > 0 && existingUrlSignature === incomingUrlSignature) return true;

  return isMinorArchiveDelta(existingUrls, incomingUrls) || isMinorArchiveDelta(existingTitles, incomingTitles);
}

function isUsefulModelThemeLabel(label: string): boolean {
  const clean = cleanThemeLabel(label).toLowerCase();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;
  if (words.length === 1 && GENERIC_SINGLE_THEME_LABELS.has(clean)) return false;
  if (words[0] === "valley" || words[words.length - 1] === "wasn") return false;
  if (THEME_LABEL_CONNECTORS.has(words[0]) || THEME_LABEL_CONNECTORS.has(words[words.length - 1])) return false;
  if (words.some((word, index) => {
    const isConnector = index > 0 && index < words.length - 1 && THEME_LABEL_CONNECTORS.has(word);
    return !isConnector && ((word.length < 4 && !SHORT_THEME_TERMS.has(word)) || MODEL_THEME_STOPWORDS.has(word));
  })) return false;
  return true;
}

function isEntityThemeLabel(label: string): boolean {
  const words = cleanThemeLabel(label).toLowerCase().split(/\s+/).filter(Boolean);
  if (words.some((word) => ENTITY_SUFFIX_TERMS.has(word))) return true;
  return false;
}

function normalizeThemeKey(label: string): string {
  return cleanThemeLabel(label)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function areThemeLabelsTooSimilar(a: string, b: string): boolean {
  const aWords = new Set(normalizeThemeKey(a).split(/\s+/).filter((word) => !SHORT_THEME_TERMS.has(word)));
  const bWords = new Set(normalizeThemeKey(b).split(/\s+/).filter((word) => !SHORT_THEME_TERMS.has(word)));
  if (aWords.size === 0 || bWords.size === 0) return false;
  const intersection = [...aWords].filter((word) => bWords.has(word)).length;
  const smaller = Math.min(aWords.size, bWords.size);
  const larger = Math.max(aWords.size, bWords.size);
  return intersection === smaller || intersection / larger >= 0.67;
}

function isSearchResultDescription(description: string): boolean {
  const lower = description.toLowerCase();
  if (!lower) return false;
  if (/\b(candidate|label)\b/.test(lower)) return true;
  if (/\bappears?\s+in\s+(?:the\s+)?(?:title|subtitle|article|post)/.test(lower)) return true;
  if (/^this\s+(?:appears|shows up|recurs|is present|candidate)/.test(lower)) return true;
  return false;
}

function normalizeModelThemeDescription(description: string, label: string): string {
  const cleaned = cleanThemeLabel(description)
    .replace(/\boften\s+/gi, "")
    .replace(/^This (?:appears|shows up|recurs|is present)\b/i, "You return to")
    .replace(/^A recurring (?:archive|library) pattern around .+$/i, "");
  if (isSearchResultDescription(cleaned)) {
    return `You return to ${label.toLowerCase()} as a recurring lens in your library.`;
  }
  if (cleaned && /^You\b/.test(cleaned)) return ensureSentence(cleaned);
  if (cleaned) return ensureSentence(`You ${cleaned.charAt(0).toLowerCase()}${cleaned.slice(1)}`);
  return `You return to ${label.toLowerCase()} as a recurring lens in your library.`;
}

// ---------------------------------------------------------------------------
// Model-driven curation.
//
// Deterministic candidates above give the model something concrete to work
// from. If the model is unavailable or returns nothing usable, every path
// below falls back to those candidates rather than failing the sync.
// ---------------------------------------------------------------------------

export async function analyzeArchiveThemes(
  posts: Post[],
  publicationName: string | null,
  usage?: { token: string },
): Promise<ArchiveTheme[]> {
  if (posts.length === 0) return [];

  const context = buildThemePostContext(posts);
  const deterministicCandidates = buildDeterministicThemeCandidates(posts);
  const modelCandidates = await generateThemeCandidates(context, publicationName, usage);
  const candidates = mergeThemeCandidates([...deterministicCandidates, ...modelCandidates]);
  if (candidates.length === 0) {
    console.warn("Library theme candidate generation unavailable; using deterministic fallback.");
    return [];
  }

  const themes = await curateArchiveThemes(context, publicationName, candidates, new Set(posts.map((post) => post.id)), usage);
  if (themes.length === 0) {
    console.warn("Library theme curation returned no usable themes; using deterministic fallback.");
    return buildFallbackCuratedThemes(candidates);
  }
  return themes;
}

function buildThemePostContext(posts: Post[]): string {
  return posts
    .slice()
    .sort((a, b) => Date.parse(b.publishedAt ?? b.createdAt) - Date.parse(a.publishedAt ?? a.createdAt))
    .slice(0, 30)
    .map((post) => [
      `Post ID: ${post.id}`,
      `Title: ${post.title}`,
      post.subtitle ? `Subtitle: ${post.subtitle}` : null,
      `Published: ${post.publishedAt ?? "unknown"}`,
      `Excerpt: ${excerpt(post.contentText, 800)}`
    ].filter(Boolean).join("\n"))
    .join("\n\n");
}

interface ThemeCandidate {
  label: string;
  rationale: string;
  evidencePostIds: string[];
  description?: string;
  level?: ArchiveTheme["level"];
  parentLabel?: string | null;
  importance?: number;
  breadth?: number;
}

function buildDeterministicThemeCandidates(posts: Post[]): ThemeCandidate[] {
  const candidates: ThemeCandidate[] = [];
  const addCandidate = (candidate: ThemeCandidate) => {
    if (!isUsefulModelThemeLabel(candidate.label)) return;
    candidates.push(candidate);
  };

  for (const post of posts) {
    const source = `${post.title}. ${post.subtitle ?? ""}`;
    for (const label of extractTitleThemeCandidates(source)) {
      addCandidate({
        label,
        rationale: `This candidate appears in the title or subtitle of "${post.title}".`,
        evidencePostIds: [post.id],
        level: label.split(/\s+/).length <= 2 ? "subtheme" : "motif",
        importance: 0.45,
        breadth: label.split(/\s+/).length <= 2 ? 0.5 : 0.38
      });
    }
  }

  return mergeThemeCandidates(candidates).slice(0, 80);
}

function extractTitleThemeCandidates(value: string): string[] {
  const stop = new Set([
    "also",
    "with",
    "from",
    "into",
    "what",
    "when",
    "where",
    "which",
    "will",
    "does",
    "aren",
    "can",
    "couldn",
    "doesn",
    "didn",
    "don",
    "hadn",
    "hasn",
    "haven",
    "isn",
    "shouldn",
    "your",
    "wasn",
    "weren",
    "won",
    "wouldn",
    "favorite",
    "genuinely",
    "excited",
    "major",
    "spent",
    "decades"
  ]);
  const words = value
    .replace(/\b\w+(?:n't|['’]t)\b/gi, " ")
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
  const candidates: string[] = [];

  for (let size = 2; size <= 4; size += 1) {
    for (let index = 0; index <= words.length - size; index += 1) {
      const phraseWords = words.slice(index, index + size);
      const normalized = phraseWords.map((word) => word.toLowerCase());
      if (normalized.some((word) => stop.has(word) || word.length < 2)) continue;
      if (!normalized.some((word) => word.length >= 4 || SHORT_THEME_TERMS.has(word))) continue;
      const label = titleCaseThemeLabel(phraseWords.join(" "));
      if (isUsefulModelThemeLabel(label)) candidates.push(label);
    }
  }

  return candidates.slice(0, 24);
}

function titleCaseThemeLabel(value: string): string {
  return cleanThemeLabel(value)
    .split(/\s+/)
    .map((word) => {
      const lower = word.toLowerCase();
      if (SHORT_THEME_TERMS.has(lower)) return lower === "llms" ? "LLMs" : lower.toUpperCase();
      if (lower === "and" || lower === "of" || lower === "as") return lower;
      return `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`;
    })
    .join(" ");
}

function mergeThemeCandidates(candidates: ThemeCandidate[]): ThemeCandidate[] {
  const byKey = new Map<string, ThemeCandidate>();
  for (const candidate of candidates) {
    const key = cleanThemeLabel(candidate.label).toLowerCase();
    if (!key) continue;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        ...candidate,
        label: cleanThemeLabel(candidate.label),
        evidencePostIds: [...new Set(candidate.evidencePostIds)].slice(0, 5)
      });
      continue;
    }
    existing.evidencePostIds = [...new Set([...existing.evidencePostIds, ...candidate.evidencePostIds])].slice(0, 5);
    existing.rationale = existing.rationale || candidate.rationale;
    existing.description = existing.description || candidate.description;
    existing.importance = Math.max(existing.importance ?? 0, candidate.importance ?? 0);
    existing.breadth = Math.max(existing.breadth ?? 0, candidate.breadth ?? 0);
  }

  return [...byKey.values()].sort((a, b) => {
    const byImportance = (b.importance ?? 0) - (a.importance ?? 0);
    if (byImportance !== 0) return byImportance;
    return b.evidencePostIds.length - a.evidencePostIds.length;
  });
}

async function generateThemeCandidates(
  context: string,
  publicationName: string | null,
  usage?: { token: string }
): Promise<ThemeCandidate[]> {
  const system = [
    "You analyze a writer's public library and generate candidate recurring themes.",
    "Prioritize recall over polish. A candidate can be broad, narrow, entity-based, stylistic, or thematic.",
    "A candidate is a reusable editorial lens, preoccupation, recurring subject, or recurring tension; not a frequent filler word.",
    "Use only the provided posts. Do not infer private metrics, audience data, or unpublished interests.",
    "Return valid JSON only."
  ].join("\n");

  const user = [
    `Publication: ${publicationName ?? "unknown"}`,
    "",
    "Posts:",
    context,
    "",
    "Return JSON in this exact shape:",
    JSON.stringify({
      candidates: [
        {
          label: "Candidate theme label",
          rationale: "Why this could be a recurring theme.",
          evidencePostIds: ["post-id-1", "post-id-2"]
        }
      ]
    }),
    "",
    "Rules:",
    "- Return 40 to 80 candidates if the library supports it; fewer is acceptable for small libraries.",
    "- Include both broad fields and narrower subthemes.",
    "- Similar candidates are okay in this pass; a curator will merge or organize them later.",
    "- evidencePostIds must use only Post ID values from the provided posts.",
    "- Do not include markdown fences or commentary."
  ].join("\n");

  const generated = await generateText(system, user, {
    temperature: 0.45,
    maxTokens: 3000,
    usage: usage
      ? {
          workspaceToken: usage.token,
          feature: "sync",
          label: "theme candidate generation"
        }
      : undefined
  });
  if (!generated) return [];
  return parseThemeCandidates(generated);
}

function parseThemeCandidates(raw: string): ThemeCandidate[] {
  const jsonText = raw.match(/\{[\s\S]*\}/)?.[0] ?? raw;
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return [];
  }

  if (!parsed || typeof parsed !== "object" || !("candidates" in parsed) || !Array.isArray(parsed.candidates)) {
    return [];
  }

  const seen = new Set<string>();
  return (parsed.candidates as unknown[])
    .map((item): ThemeCandidate | null => {
      if (!item || typeof item !== "object") return null;
      const label = "label" in item && typeof item.label === "string" ? cleanThemeLabel(item.label) : "";
      const rationale = "rationale" in item && typeof item.rationale === "string" ? cleanThemeLabel(item.rationale) : "";
      const evidencePostIds =
        "evidencePostIds" in item && Array.isArray(item.evidencePostIds)
          ? (item.evidencePostIds as unknown[]).filter((id): id is string => typeof id === "string").slice(0, 5)
          : [];
      const key = label.toLowerCase();
      if (!isUsefulModelThemeLabel(label) || seen.has(key)) return null;
      seen.add(key);
      return { label, rationale, evidencePostIds };
    })
    .filter((item): item is ThemeCandidate => Boolean(item))
    .slice(0, 100);
}

async function curateArchiveThemes(
  context: string,
  publicationName: string | null,
  candidates: ThemeCandidate[],
  validPostIds: Set<string>,
  usage?: { token: string }
): Promise<ArchiveTheme[]> {
  const system = [
    "You are a senior curator identifying recurring themes from a writer's public library.",
    "Your job is quality control: merge accidental duplicates, keep useful parent/subtheme relationships, and remove weak labels.",
    "Themes should be consistent in size and wording, but not forced to be mutually exclusive.",
    "If two themes overlap, make the relationship explicit with level and parentLabel.",
    "Prefer editorial lenses over raw tags. A raw entity can stay only when it represents a real recurring subject.",
    "Descriptions must be writer-facing insight sentences, not definitions and not restatements of the label.",
    "Use only the provided posts and candidates. Do not invent private metrics or audience claims.",
    "Return valid JSON only."
  ].join("\n");

  const candidateContext = candidates
    .map((candidate, index) => [
      `${index + 1}. ${candidate.label}`,
      `Rationale: ${candidate.rationale || "not provided"}`,
      `Evidence post IDs: ${candidate.evidencePostIds.join(", ") || "none provided"}`
    ].join("\n"))
    .join("\n\n");

  const user = [
    `Publication: ${publicationName ?? "unknown"}`,
    "",
    "Posts:",
    context,
    "",
    "Candidate themes:",
    candidateContext,
    "",
    "Return JSON in this exact shape:",
    JSON.stringify({
      themes: [
        {
          label: "Institutional Trust",
          description: "One sentence explaining the writer-level pattern.",
          level: "field",
          parentLabel: null,
          aliases: ["public institutions", "expert systems"],
          evidencePostIds: ["post-id-1", "post-id-2"],
          confidence: 0.86,
          importance: 0.92,
          breadth: 0.88
        }
      ]
    }),
    "",
    "Rules:",
    "- Produce 8 to 15 final themes when the library supports it. Prefer fewer strong themes over padding, but do not stop at only the broadest buckets.",
    "- The first 4 to 5 themes should be the broadest and most central library lenses.",
    "- Additional themes may be narrower subthemes only when they add a distinct lens.",
    "- level must be one of: field, subtheme, motif.",
    "- parentLabel must be null for field themes. For subthemes, use the exact label of a broader returned theme when applicable.",
    "- Labels should usually be 2 to 5 words. Short domain labels like AI, VC, LLM, SaaS, or IPO are allowed.",
    "- Avoid malformed fragments from contractions or generic filler like 'genuinely excited'.",
    "- Specific people and companies do not count as themes. Convert them into broader ideas or omit them.",
    "- Do not return standalone proper nouns, individual names, or company names as theme labels.",
    "- Avoid near-duplicates. Do not return both a broad raw topic and a stronger editorial lens for the same idea.",
    "- Keep useful hierarchy: AI and Recruiting AI can both appear if the second is a real subtheme.",
    "- Convert raw tags into stronger lenses when the library supports it: 'education' can become 'Institutional Learning'; 'markets' can become 'Market Incentives'.",
    "- Every description must start with 'You ' followed by a strong verb.",
    "- Do not use the word 'often' in descriptions.",
    "- Descriptions should sound like: 'You focus on the tension between commerce and artistic independence.'",
    "- Do not write descriptions like: 'A recurring library pattern around creative control.'",
    "- Do not write descriptions like: 'This appears in your article.' That is a search result, not a theme insight.",
    "- evidencePostIds must use only Post ID values from the provided posts.",
    "- confidence, importance, and breadth must be numbers from 0 to 1.",
    "- Do not include markdown fences or commentary."
  ].join("\n");

  const generated = await generateText(system, user, {
    temperature: 0.2,
    maxTokens: 2600,
    usage: usage
      ? {
          workspaceToken: usage.token,
          feature: "sync",
          label: "theme curation"
        }
      : undefined
  });
  if (!generated) return [];
  return parseArchiveThemes(generated, validPostIds);
}

function buildFallbackCuratedThemes(candidates: ThemeCandidate[]): ArchiveTheme[] {
  const selected: ArchiveTheme[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const label = cleanThemeLabel(candidate.label);
    const key = normalizeThemeKey(label);
    if (!isUsefulModelThemeLabel(label) || isEntityThemeLabel(label) || seen.has(key)) continue;
    if (!candidate.description && (candidate.importance ?? 0) < 0.55 && candidate.evidencePostIds.length < 2) continue;
    if (!candidate.description && isSearchResultDescription(candidate.rationale)) continue;
    if (selected.some((theme) => areThemeLabelsTooSimilar(theme.label, label))) continue;
    seen.add(key);
    selected.push({
      label,
      description: normalizeModelThemeDescription(
        candidate.description ||
        candidate.rationale ||
        `You return to ${label.toLowerCase()} as a recurring lens in your library.`,
        label
      ),
      evidencePostIds: candidate.evidencePostIds.slice(0, 5),
      confidence: clampConfidence(candidate.importance ?? 0.55),
      level: candidate.level ?? "subtheme",
      parentLabel: candidate.parentLabel ?? null,
      aliases: [],
      importance: clampConfidence(candidate.importance ?? 0.55),
      breadth: clampConfidence(candidate.breadth ?? 0.45)
    });
    if (selected.length >= 15) break;
  }

  return selected.sort(compareModelThemes);
}

function compareModelThemes(a: ArchiveTheme, b: ArchiveTheme): number {
  const levelRank = (theme: ArchiveTheme) => theme.level === "field" ? 0 : theme.level === "subtheme" ? 1 : 2;
  const byLevel = levelRank(a) - levelRank(b);
  if (byLevel !== 0) return byLevel;
  const byImportance = (b.importance ?? b.confidence) - (a.importance ?? a.confidence);
  if (byImportance !== 0) return byImportance;
  return (b.breadth ?? 0) - (a.breadth ?? 0);
}

function parseArchiveThemes(raw: string, validPostIds: Set<string>): ArchiveTheme[] {
  const jsonText = raw.match(/\{[\s\S]*\}/)?.[0] ?? raw;
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return [];
  }

  if (!parsed || typeof parsed !== "object" || !("themes" in parsed) || !Array.isArray(parsed.themes)) {
    return [];
  }

  const seen = new Set<string>();
  const acceptedLabels: string[] = [];
  const themes: ArchiveTheme[] = [];
  const rawThemes = parsed.themes as unknown[];
  for (const item of rawThemes) {
    if (!item || typeof item !== "object") continue;
    const label = "label" in item && typeof item.label === "string" ? cleanThemeLabel(item.label) : "";
    const description =
      "description" in item && typeof item.description === "string"
        ? cleanThemeLabel(item.description)
        : "";
    const confidence = "confidence" in item && typeof item.confidence === "number" ? item.confidence : 0.5;
    const level = parseThemeLevel("level" in item ? item.level : null);
    const parentLabel =
      "parentLabel" in item && typeof item.parentLabel === "string" ? cleanThemeLabel(item.parentLabel) : null;
    const aliases =
      "aliases" in item && Array.isArray(item.aliases)
        ? (item.aliases as unknown[])
            .filter((alias): alias is string => typeof alias === "string")
            .map((alias) => cleanThemeLabel(alias))
            .filter(Boolean)
            .slice(0, 8)
        : [];
    const importance = "importance" in item && typeof item.importance === "number" ? item.importance : confidence;
    const breadth = "breadth" in item && typeof item.breadth === "number" ? item.breadth : (level === "field" ? 0.75 : 0.45);
    const evidencePostIds =
      "evidencePostIds" in item && Array.isArray(item.evidencePostIds)
        ? (item.evidencePostIds as unknown[]).filter((id): id is string => typeof id === "string" && validPostIds.has(id)).slice(0, 5)
        : [];
    const key = normalizeThemeKey(label);
    if (!isUsefulModelThemeLabel(label) || isEntityThemeLabel(label) || seen.has(key)) continue;
    if (acceptedLabels.some((accepted) => areThemeLabelsTooSimilar(accepted, label))) continue;
    seen.add(key);
    acceptedLabels.push(label);
    themes.push({
      label,
      description: normalizeModelThemeDescription(description, label),
      evidencePostIds,
      confidence: clampConfidence(confidence),
      level,
      parentLabel,
      aliases,
      importance: clampConfidence(importance),
      breadth: clampConfidence(breadth)
    });
  }

  return themes.slice(0, 15);
}

function parseThemeLevel(value: unknown): ArchiveTheme["level"] {
  return value === "field" || value === "subtheme" || value === "motif" ? value : "subtheme";
}
