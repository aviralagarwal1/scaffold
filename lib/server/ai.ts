import type {
  AskResponse,
  DistributionPlatform,
  DraftFeedbackResponse,
  GrammarAuditResponse,
  GrammarIssue,
  Idea,
  IdeasResponse,
  PromptSuggestionsResponse,
  RepurposeDraft,
  SourceCitation
} from "@/types/ai";
import type { Post, PostChunk } from "@/types/post";
import type { ArchiveTheme, TokenUsageFeature } from "@/types/workspace";
import {
  addRepurposeDrafts,
  assertWorkspaceTokenBudget,
  getPost,
  listGrammarIssues,
  recordWorkspaceTokenUsage,
  replaceGrammarIssues,
  workspaceCorpus
} from "./store";
import { excerpt } from "./text";
import { AppError } from "./errors";

const NON_THEME_LABELS = new Set([
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

const SHORT_THEME_LABELS = new Set(["ai", "vc", "ml", "llm", "llms", "saas", "ipo", "ip"]);
const THEME_LABEL_CONNECTORS = new Set(["and", "as", "for", "in", "of", "the", "to"]);

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

const ENTITY_SUFFIX_TERMS = new Set(["bros", "corp", "corporation", "inc", "llc", "ltd"]);

interface RetrievedChunk {
  chunk: PostChunk;
  post: Post;
  score: number;
}

const BROAD_QUESTION_TERMS = ["what should", "write next", "themes", "most", "changed", "revisit", "ideas"];

function terms(value: string): string[] {
  const stop = new Set([
    "about",
    "again",
    "could",
    "should",
    "their",
    "there",
    "these",
    "those",
    "what",
    "when",
    "where",
    "which",
    "while",
    "would",
    "write",
    "your",
    "with",
    "from",
    "have",
    "this",
    "that"
  ]);

  return (value.toLowerCase().match(/\b[a-z][a-z0-9-]{2,}\b/g) ?? []).filter((term) => !stop.has(term));
}

function retrieve(posts: Post[], chunks: PostChunk[], query: string, limit = 5): RetrievedChunk[] {
  const queryTerms = terms(query);
  const byPost = new Map(posts.map((post) => [post.id, post]));

  const scored = chunks
    .map((chunk) => {
      const post = byPost.get(chunk.postId);
      if (!post) return null;
      const text = `${post.title} ${chunk.content}`.toLowerCase();
      const score = queryTerms.reduce((total, term) => total + (text.includes(term) ? 1 : 0), 0);
      return { chunk, post, score };
    })
    .filter((item): item is RetrievedChunk => item !== null)
    .sort((a, b) => b.score - a.score);

  const broad = BROAD_QUESTION_TERMS.some((term) => query.toLowerCase().includes(term));
  const candidates = scored.filter((item) => item.score > 0);
  const latest = posts
    .slice()
    .sort((a, b) => Date.parse(b.publishedAt ?? b.createdAt) - Date.parse(a.publishedAt ?? a.createdAt))
    .slice(0, broad ? 8 : 3)
    .map((post) => {
      const chunk = chunks.find((item) => item.postId === post.id) ?? {
        id: post.id,
        workspaceId: post.workspaceId,
        postId: post.id,
        chunkIndex: 0,
        content: post.contentText,
        createdAt: post.createdAt
      };
      return { post, chunk, score: 0 };
    });

  return uniqueByPost([...candidates, ...latest]).slice(0, limit);
}

function uniqueByPost(items: RetrievedChunk[]): RetrievedChunk[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.post.id)) return false;
    seen.add(item.post.id);
    return true;
  });
}

function toSources(items: RetrievedChunk[]): SourceCitation[] {
  return items.map(({ post, chunk }) => ({
    title: post.title,
    url: post.url,
    publishedAt: post.publishedAt,
    snippet: excerpt(chunk.content, 260)
  }));
}

interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  usage?: {
    workspaceToken: string;
    feature: TokenUsageFeature;
    label: string;
    expectedTokens?: number;
  };
}

interface GeneratedText {
  text: string;
  tokens: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsdMicros: number | null;
  provider: "anthropic";
  model: string;
  estimated: boolean;
}

function estimateTokens(value: string): number {
  return Math.max(1, Math.ceil(value.length / 4));
}

async function generateWithAnthropic(system: string, user: string, options: GenerateOptions = {}): Promise<GeneratedText | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5";

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        "x-api-key": apiKey
      },
      body: JSON.stringify({
        model,
        max_tokens: options.maxTokens ?? 1800,
        temperature: options.temperature ?? 0.4,
        system,
        messages: [{ role: "user", content: user }]
      })
    });
  } catch (error) {
    console.error("Anthropic request failed", error);
    return null;
  }

  if (!response.ok) {
    console.error("Anthropic request failed", await response.text());
    return null;
  }

  const data = (await response.json()) as {
    content?: { type?: string; text?: string }[];
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const text = data.content
    ?.filter((item) => item.type === "text" && item.text)
    .map((item) => item.text)
    .join("\n")
    .trim() ?? null;
  if (!text) return null;
  const inputTokens = typeof data.usage?.input_tokens === "number" ? data.usage.input_tokens : null;
  const outputTokens = typeof data.usage?.output_tokens === "number" ? data.usage.output_tokens : null;
  const tokens = inputTokens !== null || outputTokens !== null ? (inputTokens ?? 0) + (outputTokens ?? 0) : null;
  return {
    text,
    tokens,
    inputTokens,
    outputTokens,
    costUsdMicros: inputTokens !== null || outputTokens !== null
      ? anthropicSonnetCostUsdMicros(inputTokens ?? 0, outputTokens ?? 0)
      : null,
    provider: "anthropic",
    model,
    estimated: tokens === null,
  };
}

function anthropicSonnetCostUsdMicros(inputTokens: number, outputTokens: number): number {
  return Math.ceil(inputTokens * 3 + outputTokens * 15);
}

async function generateText(system: string, user: string, options: GenerateOptions = {}): Promise<string | null> {
  const expectedTokens =
    options.usage?.expectedTokens ?? estimateTokens(system) + estimateTokens(user) + (options.maxTokens ?? 1800);
  if (options.usage) {
    await assertWorkspaceTokenBudget(options.usage.workspaceToken, expectedTokens, options.usage.feature);
  }

  const generated = await generateWithAnthropic(system, user, options);
  if (!generated) return null;

  if (options.usage) {
    await recordWorkspaceTokenUsage({
      token: options.usage.workspaceToken,
      feature: options.usage.feature,
      label: options.usage.label,
      tokens: generated.tokens ?? estimateTokens(system) + estimateTokens(user) + estimateTokens(generated.text),
      inputTokens: generated.inputTokens,
      outputTokens: generated.outputTokens,
      costUsdMicros: generated.costUsdMicros,
      provider: generated.provider,
      model: generated.model,
      estimated: generated.estimated
    });
  }

  return generated.text;
}

const editorialSystemPrompt = [
  "You are a careful curator for a writer's publication and library.",
  "Use only the provided public library context.",
  "Do not invent subscriber data, open rates, clicks, traffic, revenue, or performance rankings.",
  "If private metrics are unavailable, say so plainly.",
  "Give specific, actionable feedback grounded in source posts.",
  "Preserve the writer's style and ambition.",
  "Avoid generic content marketing advice."
].join("\n");

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
      if (!normalized.some((word) => word.length >= 4 || SHORT_THEME_LABELS.has(word))) continue;
      const label = titleCaseThemeLabel(phraseWords.join(" "));
      if (isUsefulModelThemeLabel(label)) candidates.push(label);
    }
  }

  return candidates.slice(0, 24);
}

function titleCaseThemeLabel(value: string): string {
  return cleanModelThemeText(value)
    .split(/\s+/)
    .map((word) => {
      const lower = word.toLowerCase();
      if (SHORT_THEME_LABELS.has(lower)) return lower === "llms" ? "LLMs" : lower.toUpperCase();
      if (lower === "and" || lower === "of" || lower === "as") return lower;
      return `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`;
    })
    .join(" ");
}

function mergeThemeCandidates(candidates: ThemeCandidate[]): ThemeCandidate[] {
  const byKey = new Map<string, ThemeCandidate>();
  for (const candidate of candidates) {
    const key = cleanModelThemeText(candidate.label).toLowerCase();
    if (!key) continue;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        ...candidate,
        label: cleanModelThemeText(candidate.label),
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
      const label = "label" in item && typeof item.label === "string" ? cleanModelThemeText(item.label) : "";
      const rationale = "rationale" in item && typeof item.rationale === "string" ? cleanModelThemeText(item.rationale) : "";
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
    const label = cleanModelThemeText(candidate.label);
    const key = normalizeThemeKey(label);
    if (!isUsefulModelThemeLabel(label) || isEntityThemeLabel(label) || seen.has(key)) continue;
    if (!candidate.description && (candidate.importance ?? 0) < 0.55 && candidate.evidencePostIds.length < 2) continue;
    if (!candidate.description && isSearchResultDescription(candidate.rationale)) continue;
    if (selected.some((theme) => areThemeLabelsTooSimilar(theme.label, label))) continue;
    seen.add(key);
    selected.push({
      label,
      description: normalizeThemeDescription(
        candidate.description ||
        candidate.rationale ||
        `You return to ${label.toLowerCase()} as a recurring lens in your library.`,
        label
      ),
      evidencePostIds: candidate.evidencePostIds.slice(0, 5),
      confidence: clampModelScore(candidate.importance ?? 0.55),
      level: candidate.level ?? "subtheme",
      parentLabel: candidate.parentLabel ?? null,
      aliases: [],
      importance: clampModelScore(candidate.importance ?? 0.55),
      breadth: clampModelScore(candidate.breadth ?? 0.45)
    });
    if (selected.length >= 15) break;
  }

  return selected.sort(compareModelThemes);
}

function mergeArchiveThemes(themes: ArchiveTheme[]): ArchiveTheme[] {
  const seen = new Set<string>();
  const acceptedLabels: string[] = [];
  return themes
    .filter((theme) => {
      const key = normalizeThemeKey(theme.label);
      if (!key || isEntityThemeLabel(theme.label) || seen.has(key)) return false;
      if (acceptedLabels.some((existing) => areThemeLabelsTooSimilar(existing, theme.label))) return false;
      seen.add(key);
      acceptedLabels.push(theme.label);
      return true;
    })
    .sort(compareModelThemes)
    .slice(0, 15);
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
    const label = "label" in item && typeof item.label === "string" ? cleanModelThemeText(item.label) : "";
    const description =
      "description" in item && typeof item.description === "string"
        ? cleanModelThemeText(item.description)
        : "";
    const confidence = "confidence" in item && typeof item.confidence === "number" ? item.confidence : 0.5;
    const level = parseThemeLevel("level" in item ? item.level : null);
    const parentLabel =
      "parentLabel" in item && typeof item.parentLabel === "string" ? cleanModelThemeText(item.parentLabel) : null;
    const aliases =
      "aliases" in item && Array.isArray(item.aliases)
        ? (item.aliases as unknown[])
            .filter((alias): alias is string => typeof alias === "string")
            .map(cleanModelThemeText)
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
      description: normalizeThemeDescription(description, label),
      evidencePostIds,
      confidence: clampModelScore(confidence),
      level,
      parentLabel,
      aliases,
      importance: clampModelScore(importance),
      breadth: clampModelScore(breadth)
    });
  }

  return themes.slice(0, 15);
}

function parseThemeLevel(value: unknown): ArchiveTheme["level"] {
  return value === "field" || value === "subtheme" || value === "motif" ? value : "subtheme";
}

function clampModelScore(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}

function cleanModelThemeText(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/^[\s"'`]+|[\s"'`.!?]+$/g, "")
    .trim();
}

function isUsefulModelThemeLabel(label: string): boolean {
  const clean = cleanModelThemeText(label).toLowerCase();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;
  if (words.length === 1 && GENERIC_SINGLE_THEME_LABELS.has(clean)) return false;
  if (words[0] === "valley" || words[words.length - 1] === "wasn") return false;
  if (THEME_LABEL_CONNECTORS.has(words[0]) || THEME_LABEL_CONNECTORS.has(words[words.length - 1])) return false;
  if (words.some((word, index) => {
    const isConnector = index > 0 && index < words.length - 1 && THEME_LABEL_CONNECTORS.has(word);
    return !isConnector && ((word.length < 4 && !SHORT_THEME_LABELS.has(word)) || NON_THEME_LABELS.has(word));
  })) return false;
  return true;
}

function isEntityThemeLabel(label: string): boolean {
  const words = cleanModelThemeText(label).toLowerCase().split(/\s+/).filter(Boolean);
  if (words.some((word) => ENTITY_SUFFIX_TERMS.has(word))) return true;
  return false;
}

function normalizeThemeKey(label: string): string {
  return cleanModelThemeText(label)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function areThemeLabelsTooSimilar(a: string, b: string): boolean {
  const aWords = new Set(normalizeThemeKey(a).split(/\s+/).filter((word) => !SHORT_THEME_LABELS.has(word)));
  const bWords = new Set(normalizeThemeKey(b).split(/\s+/).filter((word) => !SHORT_THEME_LABELS.has(word)));
  if (aWords.size === 0 || bWords.size === 0) return false;
  const intersection = [...aWords].filter((word) => bWords.has(word)).length;
  const smaller = Math.min(aWords.size, bWords.size);
  const larger = Math.max(aWords.size, bWords.size);
  return intersection === smaller || intersection / larger >= 0.67;
}

function normalizeThemeDescription(description: string, label: string): string {
  const cleaned = cleanModelThemeText(description)
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

function isSearchResultDescription(description: string): boolean {
  const lower = description.toLowerCase();
  if (!lower) return false;
  if (/\b(candidate|label)\b/.test(lower)) return true;
  if (/\bappears?\s+in\s+(?:the\s+)?(?:title|subtitle|article|post)/.test(lower)) return true;
  if (/^this\s+(?:appears|shows up|recurs|is present|candidate)/.test(lower)) return true;
  return false;
}

function ensureSentence(value: string): string {
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

export async function answerArchiveQuestion(
  token: string,
  message: string,
  options: { history?: { role: "user" | "assistant"; content: string }[] } = {},
): Promise<AskResponse> {
  if (!message.trim()) throw new AppError("Ask a question about the library.", 400);

  const { workspace, posts, chunks } = await workspaceCorpus(token);
  if (posts.length === 0) {
    throw new AppError("This workspace doesn't have any posts yet.", 409);
  }

  const retrieved = retrieve(posts, chunks, message);
  const sources = toSources(retrieved);
  const context = retrieved
    .map(({ post, chunk }, index) => `[${index + 1}] ${post.title}\n${post.url}\n${excerpt(chunk.content, 1200)}`)
    .join("\n\n");
  const history = (options.history ?? [])
    .slice(-8)
    .map((turn) => `${turn.role === "assistant" ? "Curator" : "Writer"}: ${excerpt(turn.content, 700)}`)
    .join("\n\n");

  const generated = await generateText(
    editorialSystemPrompt,
    [
      `Publication: ${workspace.publicationName ?? workspace.publicationUrl}`,
      history ? `Recent conversation:\n${history}` : null,
      `Question: ${message}`,
      `Library context:\n${context}`,
      "Answer with: Direct answer, What I am seeing in the library, Specific examples, Recommendation, Suggested next step."
    ].filter(Boolean).join("\n\n"),
    {
      usage: {
        workspaceToken: token,
        feature: "conversation",
        label: "conversation answer"
      }
    }
  );

  return {
    answer:
      generated ??
      [
        `Based on the public library, the strongest answer comes from ${sources.length} relevant post${sources.length === 1 ? "" : "s"}.`,
        "",
        "What I am seeing in your library",
        sources.map((source) => `- "${source.title}" points to this pattern: ${source.snippet}`).join("\n"),
        "",
        "Recommendation",
        "Use these posts as the source material for the next editorial decision. I do not have private subscriber, open, click, or traffic data, so this is a qualitative library read rather than a performance claim."
      ].join("\n"),
    sources
  };
}

// Editorial focus dimensions. Each entry is the writer-facing label and the
// guidance the model receives when this dimension is selected. The order
// moves from core editorial checks to more granular prose/argument controls.
const FOCUS_GUIDANCE: Record<string, { label: string; guide: string }> = {
  hook: {
    label: "Hook",
    guide: "Hook — does the opening earn the reader's attention without overpromising.",
  },
  structure: {
    label: "Structure",
    guide: "Structure — how the body is organized, including pacing and the through-line of the argument.",
  },
  ending: {
    label: "Ending",
    guide: "Ending — does the close resolve the piece without flattening it.",
  },
  voice: {
    label: "Voice",
    guide: "Voice — how the prose compares to the writer's library in tone and rhythm.",
  },
  clarity: {
    label: "Clarity",
    guide: "Clarity — readability of the prose, where meaning is obscured, where sentences could be sharper.",
  },
  originality: {
    label: "Originality",
    guide: "Originality — freshness of the angle and the argument relative to the writer's prior work.",
  },
  argument: {
    label: "Argument",
    guide: "Argument — strength, specificity, and progression of the central claim and supporting claims.",
  },
  insight: {
    label: "Insight",
    guide: "Insight — whether the piece gives the reader a non-obvious realization, sharper understanding, or memorable idea.",
  },
  evidence: {
    label: "Evidence",
    guide: "Evidence — whether examples, facts, anecdotes, or library-grounded proof adequately support the claims.",
  },
  nuance: {
    label: "Nuance",
    guide: "Nuance — whether the piece handles complexity, caveats, tensions, and fair opposing views without muddying the thesis.",
  },
  framing: {
    label: "Framing",
    guide: "Framing — the lens, promise, and context that tell the reader how to understand the piece.",
  },
  stakes: {
    label: "Stakes",
    guide: "Stakes — whether the piece makes clear why the subject matters now and what changes for the reader.",
  },
  narrative: {
    label: "Narrative",
    guide: "Narrative — how well scenes, anecdotes, chronology, or story movement carry the reader through the piece.",
  },
  tension: {
    label: "Tension",
    guide: "Tension — the unresolved question, contrast, or pressure that keeps the reader invested.",
  },
  pacing: {
    label: "Pacing",
    guide: "Pacing — macro speed of the piece: where it lingers too long, rushes, or needs a turn.",
  },
  transitions: {
    label: "Transitions",
    guide: "Transitions — how cleanly the piece moves between sections, examples, claims, and emotional registers.",
  },
  rhythm: {
    label: "Rhythm",
    guide: "Rhythm — sentence cadence, variation, and momentum at the paragraph and line level.",
  },
  specificity: {
    label: "Specificity",
    guide: "Specificity — where abstract language should become concrete, named, sensory, or example-driven.",
  },
  cohesion: {
    label: "Cohesion",
    guide: "Cohesion — whether paragraphs and ideas belong together and reinforce the same through-line.",
  },
  compression: {
    label: "Compression",
    guide: "Compression — places to tighten repetition, throat-clearing, hedging, or low-value exposition.",
  },
};

export async function generateDraftFeedback(
  token: string,
  draft: string,
  options: { focus?: string[] } = {},
): Promise<DraftFeedbackResponse> {
  if (draft.trim().length < 80) throw new AppError("Paste a longer draft for meaningful feedback.", 400);

  const { posts, chunks } = await workspaceCorpus(token);
  if (posts.length === 0) throw new AppError("This workspace doesn't have any posts yet.", 409);
  const retrieved = retrieve(posts, chunks, draft, 5);
  const sources = toSources(retrieved);
  const context = retrieved
    .map(({ post, chunk }, index) => `[${index + 1}] ${post.title}\n${excerpt(chunk.content, 1000)}`)
    .join("\n\n");

  // Resolve the focus list to known dimensions; ignore unknown values defensively.
  const requested = (options.focus ?? [])
    .map((id) => id.toLowerCase().trim())
    .filter((id) => id in FOCUS_GUIDANCE);
  const dimensions = requested.length > 0 ? requested : Object.keys(FOCUS_GUIDANCE);
  const focusBlock = dimensions
    .map((id) => `- ${FOCUS_GUIDANCE[id].guide}`)
    .join("\n");
  const focusFormat = dimensions
    .map((id) => FOCUS_GUIDANCE[id].label)
    .join(", ");
  const onlySelected = requested.length > 0
    ? "\n\nThe writer asked you to focus only on the dimensions above. Do not comment on dimensions they did not select."
    : "";

  const generated = await generateText(
    editorialSystemPrompt,
    `Evaluate this draft against the writer's library. Do not rewrite the full draft by default.\n\nLibrary context:\n${context}\n\nDraft:\n${draft}\n\nFocus dimensions:\n${focusBlock}${onlySelected}\n\nFor each focus dimension above, write a short editorial section under that dimension's name as the heading. Use this section order: ${focusFormat}.`,
    {
      usage: {
        workspaceToken: token,
        feature: "feedback",
        label: "draft feedback"
      }
    }
  );

  return {
    feedback:
      generated ??
      [
        "Overall read",
        "This draft has enough material for an editorial pass, but generated model feedback is not configured. Based on lexical overlap, compare it most closely with the cited library posts.",
        "",
        "What feels most like your voice",
        sources.map((source) => `- Check whether the draft shares the structure or argument style of "${source.title}".`).join("\n"),
        "",
        "Specific edits",
        "- Move the central claim into the opening third if the introduction delays the point.",
        "- Preserve opinionated phrasing where it carries voice; only simplify sentences that obscure meaning."
      ].join("\n"),
    sources
  };
}

export async function generateIdeas(token: string, options: { focus?: string } = {}): Promise<IdeasResponse> {
  const { workspace, posts, chunks } = await workspaceCorpus(token);
  if (posts.length === 0) throw new AppError("This workspace doesn't have any posts yet.", 409);
  const themes = ideaThemesForWorkspace(workspace);
  const themeLabels = themes.map((theme) => theme.label);
  const retrieved = retrieve(posts, chunks, themeLabels.join(" "), 8);
  const sources = toSources(retrieved);
  const postSources = new Map(posts.map((post) => [post.id, postToSource(post)]));

  const generated = await generateThemeBoundIdeas({
    publicationName: workspace.publicationName ?? workspace.publicationUrl,
    themes,
    posts,
    focus: options.focus?.trim() ?? "",
    token
  });

  if (generated) {
    return {
      sections: generated.sections.map((section) => ({
        name: section.name,
        ideas: section.ideas.map((idea) => {
          const theme = themes.find((item) => item.label.toLowerCase() === idea.lens.toLowerCase()) ?? themes[0];
          const relatedPosts = idea.relatedPostIds
            .map((id) => postSources.get(id))
            .filter((source): source is SourceCitation => Boolean(source));
          return {
            title: idea.title,
            thesis: idea.thesis,
            lens: theme?.label ?? idea.lens,
            whyItFits: idea.whyItFits,
            relatedPosts: relatedPosts.length ? relatedPosts : sources.slice(0, 2)
          };
        })
      }))
    };
  }

  const fallbackThemes = themes.length
    ? themes
    : ["your library", "recent essays", "recurring argument"].map((label) => ({
        label,
        description: `A recurring library pattern around ${label}.`,
        evidencePostIds: [],
        confidence: 0.4
      }));
  const ideas: Idea[] = fallbackThemes
    .slice(0, 6)
    .map((theme, index) => {
      const relatedPosts = theme.evidencePostIds
        .map((id) => postSources.get(id))
        .filter((source): source is SourceCitation => Boolean(source));
      return {
        title: `What ${theme.label} still does not explain`,
        thesis: `A sharper follow-up that revisits ${theme.label} through a more specific argument or lived example.`,
        lens: theme.label,
        whyItFits: `This fits because ${theme.label} is part of the library profile from the last sync, without claiming private performance data.`,
        relatedPosts: relatedPosts.length ? relatedPosts : sources.slice(index % Math.max(sources.length, 1), index % Math.max(sources.length, 1) + 2)
      };
    });

  return {
    sections: [
      { name: "Natural sequels", ideas: ideas.slice(0, 2) },
      { name: "Theme lenses", ideas: ideas.slice(2, 4) },
      { name: "Posts to revisit", ideas: ideas.slice(4, 6) }
    ]
  };
}

function ideaThemesForWorkspace(workspace: { topThemes: string[]; archiveThemes?: ArchiveTheme[]; customThemes?: string[] }): ArchiveTheme[] {
  const archiveThemes = workspace.archiveThemes?.length ? workspace.archiveThemes.slice(0, 15) : workspace.topThemes.slice(0, 15).map((label) => ({
    label,
    description: `A recurring library pattern around ${label}.`,
    evidencePostIds: [],
    confidence: 0.45
  }));
  const seen = new Set(archiveThemes.map((theme) => theme.label.toLowerCase()));
  const customThemes = (workspace.customThemes ?? [])
    .map((label) => label.trim())
    .filter((label) => label && !seen.has(label.toLowerCase()))
    .slice(0, 10)
    .map((label) => ({
      label,
      description: `A user-saved lens for exploring the library through ${label}.`,
      evidencePostIds: [],
      confidence: 0.5,
      level: "subtheme" as const
    }));
  return [...archiveThemes, ...customThemes].slice(0, 20);
}

function postToSource(post: Post): SourceCitation {
  return {
    title: post.title,
    url: post.url,
    publishedAt: post.publishedAt,
    snippet: excerpt(post.contentText, 260)
  };
}

interface GeneratedIdeaPayload {
  sections: {
    name: string;
    ideas: {
      title: string;
      thesis: string;
      lens: string;
      whyItFits: string;
      relatedPostIds: string[];
    }[];
  }[];
}

async function generateThemeBoundIdeas({
  publicationName,
  themes,
  posts,
  focus,
  token
}: {
  publicationName: string;
  themes: ArchiveTheme[];
  posts: Post[];
  focus: string;
  token: string;
}): Promise<GeneratedIdeaPayload | null> {
  if (themes.length === 0) return null;
  const validThemeLabels = new Set(themes.map((theme) => theme.label.toLowerCase()));
  const validPostIds = new Set(posts.map((post) => post.id));
  const postContext = posts
    .slice()
    .sort((a, b) => Date.parse(b.publishedAt ?? b.createdAt) - Date.parse(a.publishedAt ?? a.createdAt))
    .slice(0, 18)
    .map((post) => [
      `Post ID: ${post.id}`,
      `Title: ${post.title}`,
      post.subtitle ? `Subtitle: ${post.subtitle}` : null,
      `Excerpt: ${excerpt(post.contentText, 360)}`
    ].filter(Boolean).join("\n"))
    .join("\n\n");
  const themeContext = themes
    .map((theme) => [
      `Theme: ${theme.label}`,
      `Description: ${theme.description}`,
      `Evidence post IDs: ${theme.evidencePostIds.join(", ") || "none recorded"}`
    ].join("\n"))
    .join("\n\n");

  const system = [
    "You generate article ideas for a writer from their saved library themes.",
    "Every idea must channel one saved theme as its lens.",
    "Do not introduce a topic unless it extends, recombines, or challenges a saved theme.",
    "Use only the public library context. Do not invent audience, revenue, traffic, subscriber, or performance claims.",
    "Return valid JSON only."
  ].join("\n");

  const user = [
    `Publication: ${publicationName}`,
    focus ? `Writer's optional focus: ${focus}` : "Writer's optional focus: none",
    "",
    "Saved themes from the last library sync:",
    themeContext,
    "",
    "Recent library context:",
    postContext,
    "",
    "Return JSON in this exact shape:",
    JSON.stringify({
      sections: [
        {
          name: "Natural sequels",
          ideas: [
            {
              title: "Specific article title",
              thesis: "One-sentence thesis.",
              lens: themes[0]?.label ?? "Theme label",
              whyItFits: "Why this follows from the library theme and cited posts.",
              relatedPostIds: ["post-id-1", "post-id-2"]
            }
          ]
        }
      ]
    }),
    "",
    "Rules:",
    "- Return exactly 3 sections: Natural sequels, Theme lenses, Posts to revisit.",
    "- Return exactly 2 ideas per section.",
    "- lens must exactly match one saved Theme label.",
    "- relatedPostIds must use only provided Post ID values.",
    "- If the optional focus does not fit the saved themes, ignore the focus and stay with the closest saved themes.",
    "- Do not include markdown fences or commentary."
  ].join("\n");

  const generated = await generateText(system, user, {
    temperature: 0.55,
    maxTokens: 1800,
    usage: {
      workspaceToken: token,
      feature: "exploration",
      label: "idea generation"
    }
  });
  if (!generated) return null;
  return parseGeneratedIdeas(generated, validThemeLabels, validPostIds);
}

function parseGeneratedIdeas(
  raw: string,
  validThemeLabels: Set<string>,
  validPostIds: Set<string>
): GeneratedIdeaPayload | null {
  const jsonText = raw.match(/\{[\s\S]*\}/)?.[0] ?? raw;
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object" || !("sections" in parsed) || !Array.isArray(parsed.sections)) {
    return null;
  }

  const sections = (parsed.sections as unknown[])
    .map((section): GeneratedIdeaPayload["sections"][number] | null => {
      if (!section || typeof section !== "object") return null;
      const name = "name" in section && typeof section.name === "string" ? cleanModelThemeText(section.name) : "";
      const rawIdeas = "ideas" in section && Array.isArray(section.ideas) ? (section.ideas as unknown[]) : [];
      const ideas = rawIdeas
        .map((idea): GeneratedIdeaPayload["sections"][number]["ideas"][number] | null => {
          if (!idea || typeof idea !== "object") return null;
          const title = "title" in idea && typeof idea.title === "string" ? cleanModelThemeText(idea.title) : "";
          const thesis = "thesis" in idea && typeof idea.thesis === "string" ? cleanModelThemeText(idea.thesis) : "";
          const lens = "lens" in idea && typeof idea.lens === "string" ? cleanModelThemeText(idea.lens) : "";
          const whyItFits =
            "whyItFits" in idea && typeof idea.whyItFits === "string" ? cleanModelThemeText(idea.whyItFits) : "";
          const relatedPostIds =
            "relatedPostIds" in idea && Array.isArray(idea.relatedPostIds)
              ? (idea.relatedPostIds as unknown[]).filter((id): id is string => typeof id === "string" && validPostIds.has(id)).slice(0, 4)
              : [];
          if (!title || !thesis || !validThemeLabels.has(lens.toLowerCase())) return null;
          return { title, thesis, lens, whyItFits, relatedPostIds };
        })
        .filter((idea): idea is GeneratedIdeaPayload["sections"][number]["ideas"][number] => Boolean(idea))
        .slice(0, 2);
      if (!name || ideas.length === 0) return null;
      return { name, ideas };
    })
    .filter((section): section is GeneratedIdeaPayload["sections"][number] => Boolean(section))
    .slice(0, 3);

  return sections.length ? { sections } : null;
}

// Curated server-side seeds. Used only when the model is unavailable. These
// templates are theme/title-aware so the fallback still feels library-grounded
// rather than reading like generic chatbot prompts.
const FALLBACK_PROMPT_TEMPLATES = [
  (theme: string) => `What do I keep saying about ${theme} without quite landing it?`,
  (theme: string) => `Where does my writing on ${theme} contradict itself?`,
  (theme: string) => `Which post anchors my strongest take on ${theme}?`,
  (theme: string) => `What angle on ${theme} have I circled but never written?`,
  (theme: string) => `Which of my pieces on ${theme} should I revisit now?`,
  (title: string) => `What would a sequel to "${title}" look like a year on?`,
  (title: string) => `What argument did "${title}" leave on the table?`,
  (title: string) => `Whose response to "${title}" am I most curious about?`
];

const STATIC_FALLBACK_PROMPTS = [
  "Where do my recent posts diverge from my early voice?",
  "Which posts feel most like me, and why?",
  "What's the pattern in how I open my strongest essays?",
  "What would surprise a long-time reader of my library?",
  "What topic does my library suggest I've been quietly avoiding?"
];

function normalizePromptKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\s ]+/g, " ")
    .replace(/[‘’“”"']/g, "")
    .replace(/[?.!]+$/g, "")
    .trim();
}

function parsePromptList(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) =>
      line
        // strip bullets, numbering, leading punctuation
        .replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "")
        // strip surrounding quotes/braces the model sometimes adds
        .replace(/^[\s"'‘’“”`(\[]+/, "")
        .replace(/[\s"'‘’“”`)\]]+$/, "")
        .trim()
    )
    .filter((line) => line.length >= 12 && /\?\s*$/.test(line));
}

function buildFallbackPrompts(themes: string[], posts: Post[], count: number): string[] {
  const recentTitles = posts
    .slice()
    .sort((a, b) => Date.parse(b.publishedAt ?? b.createdAt) - Date.parse(a.publishedAt ?? a.createdAt))
    .slice(0, 4)
    .map((post) => post.title);

  const candidates: string[] = [];
  for (const theme of themes) {
    for (const template of FALLBACK_PROMPT_TEMPLATES.slice(0, 5)) {
      candidates.push(template(theme));
    }
  }
  for (const title of recentTitles) {
    for (const template of FALLBACK_PROMPT_TEMPLATES.slice(5)) {
      candidates.push(template(title));
    }
  }
  candidates.push(...STATIC_FALLBACK_PROMPTS);

  // light shuffle so repeated calls don't return the same first N
  return candidates
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map((item) => item.value)
    .slice(0, count);
}

export async function generatePromptSuggestions(
  token: string,
  options: { excludePrompts?: string[]; count?: number } = {}
): Promise<PromptSuggestionsResponse> {
  const count = Math.min(Math.max(options.count ?? 3, 1), 6);
  const excluded = new Set((options.excludePrompts ?? []).map(normalizePromptKey));

  const { workspace, posts, chunks } = await workspaceCorpus(token);
  if (posts.length === 0) {
    throw new AppError("This workspace doesn't have any posts yet.", 409);
  }

  const recentPosts = posts
    .slice()
    .sort((a, b) => Date.parse(b.publishedAt ?? b.createdAt) - Date.parse(a.publishedAt ?? a.createdAt))
    .slice(0, 8);

  const sampleChunks = recentPosts
    .map((post) => {
      const chunk = chunks.find((item) => item.postId === post.id);
      return chunk ? `- ${post.title}: ${excerpt(chunk.content, 240)}` : `- ${post.title}`;
    })
    .join("\n");

  const themesLine = workspace.topThemes.length
    ? workspace.topThemes.join(", ")
    : "no themes detected yet";

  const excludedLine = excluded.size
    ? `\n\nThe writer has already seen these prompts. Do not repeat or paraphrase them:\n${(options.excludePrompts ?? [])
        .map((line) => `- ${line}`)
        .join("\n")}`
    : "";

  const system = [
    "You write library-aware questions a writer might ask their own library.",
    "Each question must be specific, intellectually interesting, and grounded in patterns the writer's library could plausibly reveal.",
    "Avoid generic chatbot prompts (no 'how do I improve my writing', no 'give me ideas').",
    "Do not invent subscriber numbers, traffic, or performance claims.",
    "Return ONLY the questions, one per line, no numbering, no bullets, no quotes, no commentary.",
    "Each line must end with a question mark."
  ].join("\n");

  const user = [
    `Publication: ${workspace.publicationName ?? workspace.publicationUrl}`,
    `Recurring themes: ${themesLine}`,
    "",
    "Recent posts and excerpts:",
    sampleChunks || "(no recent posts available)",
    excludedLine,
    "",
    `Write ${count} new prompts the writer has not seen.`
  ].join("\n");

  const generated = await generateText(system, user, {
    temperature: 0.85,
    maxTokens: 600,
    usage: {
      workspaceToken: token,
      feature: "suggestions",
      label: "prompt suggestions"
    }
  });

  if (generated) {
    const parsed = parsePromptList(generated)
      .filter((prompt) => !excluded.has(normalizePromptKey(prompt)));

    // dedupe by normalized key
    const seen = new Set<string>();
    const deduped = parsed.filter((prompt) => {
      const key = normalizePromptKey(prompt);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (deduped.length >= count) {
      return { prompts: deduped.slice(0, count), source: "model" };
    }

    // The model returned something usable but short. Top up from the fallback
    // pool so the client always gets the requested batch size.
    const topUp = buildFallbackPrompts(workspace.topThemes, posts, count * 3)
      .filter((prompt) => {
        const key = normalizePromptKey(prompt);
        if (excluded.has(key) || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    const merged = [...deduped, ...topUp].slice(0, count);
    if (merged.length > 0) {
      return { prompts: merged, source: deduped.length > 0 ? "model" : "fallback" };
    }
  }

  const fallback = buildFallbackPrompts(workspace.topThemes, posts, count * 3)
    .filter((prompt) => !excluded.has(normalizePromptKey(prompt)))
    .slice(0, count);

  return { prompts: fallback, source: "fallback" };
}

export async function generateDistributionDrafts(
  token: string,
  postId: string,
  platform: DistributionPlatform
): Promise<RepurposeDraft[]> {
  const post = await getPost(token, postId);
  const content = await generateDistributionContent(token, platform, post);
  return addRepurposeDrafts(
    token,
    [{
      postId: post.id,
      platform,
      status: "pending",
      title: null,
      content,
      sourcePostTitle: post.title,
      sourcePostUrl: post.url
    }]
  );
}

const DISTRIBUTION_LIMITS: Record<DistributionPlatform, { target: number; hard: number; guidance: string }> = {
  twitter: {
    target: 260,
    hard: 280,
    guidance: "Write one concise X/Twitter post. No thread setup, no numbered list, no URL unless it easily fits."
  },
  linkedin: {
    target: 1100,
    hard: 3000,
    guidance: "Write one thoughtful LinkedIn post with short paragraphs and a clear professional takeaway."
  },
  facebook: {
    target: 900,
    hard: 5000,
    guidance: "Write one conversational Facebook post that sounds personal, direct, and easy to respond to."
  },
  instagram: {
    target: 1200,
    hard: 2200,
    guidance: "Write one Instagram caption. No carousel outline, no slide labels, no raw URL."
  },
  reddit: {
    target: 1600,
    hard: 40000,
    guidance: "Write one Reddit post that opens with a concrete question or observation and invites discussion."
  }
};

async function generateDistributionContent(token: string, platform: DistributionPlatform, post: Post): Promise<string> {
  const spec = DISTRIBUTION_LIMITS[platform];
  const sourceExcerpt = excerpt(post.contentText, platform === "twitter" ? 700 : 1400);
  const generated = cleanDistributionContent(await generateDistributionText(token, platform, post, sourceExcerpt));
  if (generated && generated.length <= spec.hard) return generated;

  if (generated) {
    const repaired = cleanDistributionContent(await repairDistributionText(token, platform, post, generated));
    if (repaired && repaired.length <= spec.hard) return repaired;
  }

  return fallbackDistributionContent(platform, post);
}

async function generateDistributionText(
  token: string,
  platform: DistributionPlatform,
  post: Post,
  sourceExcerpt: string
): Promise<string | null> {
  const spec = DISTRIBUTION_LIMITS[platform];
  const system = [
    "You write single social posts that repurpose a writer's published essay.",
    "Use only the provided source post. Do not invent facts, audience metrics, revenue, traffic, or reader response.",
    "Return only the final post text. No markdown fences, labels, alternatives, explanations, or thread/carousel structure."
  ].join("\n");
  const user = [
    `Platform: ${platform}`,
    `Target length: about ${spec.target} characters.`,
    `Hard maximum: ${spec.hard} characters.`,
    `Platform guidance: ${spec.guidance}`,
    "",
    `Source title: ${post.title}`,
    post.subtitle ? `Source subtitle: ${post.subtitle}` : null,
    `Source excerpt: ${sourceExcerpt}`,
    "",
    "Write exactly one post. It must be coherent as a standalone post and must stay under the hard maximum."
  ].filter(Boolean).join("\n");

  return generateText(system, user, {
    temperature: 0.45,
    maxTokens: distributionMaxTokens(platform),
    usage: {
      workspaceToken: token,
      feature: "distribution",
      label: `${platform} distribution draft`
    }
  });
}

async function repairDistributionText(
  token: string,
  platform: DistributionPlatform,
  post: Post,
  draft: string
): Promise<string | null> {
  const spec = DISTRIBUTION_LIMITS[platform];
  const system = [
    "You shorten social copy while preserving the main idea.",
    "Return only the revised post text. No markdown fences, labels, explanations, alternatives, threads, or carousel structure."
  ].join("\n");
  const user = [
    `Platform: ${platform}`,
    `Hard maximum: ${spec.hard} characters.`,
    `Source title: ${post.title}`,
    "",
    "Draft to shorten:",
    draft,
    "",
    "Rewrite this as exactly one post under the hard maximum."
  ].join("\n");

  return generateText(system, user, {
    temperature: 0.2,
    maxTokens: distributionMaxTokens(platform),
    usage: {
      workspaceToken: token,
      feature: "distribution",
      label: `${platform} distribution repair`
    }
  });
}

function distributionMaxTokens(platform: DistributionPlatform): number {
  const hard = DISTRIBUTION_LIMITS[platform].hard;
  return Math.min(900, Math.max(180, Math.ceil(hard / 3) + 80));
}

function cleanDistributionContent(raw: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/^```(?:\w+)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .replace(/^\s*(?:post|draft|caption|tweet|linkedin|facebook|instagram|reddit)\s*:\s*/i, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return cleaned || null;
}

function fallbackDistributionContent(platform: DistributionPlatform, post: Post): string {
  const spec = DISTRIBUTION_LIMITS[platform];
  const lead = excerpt(post.contentText, Math.min(360, Math.max(120, spec.target - post.title.length - 80)));
  const draft = platform === "instagram"
    ? `${post.title}\n\n${lead}\n\nMore in the full piece.`
    : `I wrote about ${post.title.toLowerCase()}.\n\n${lead}`;
  return truncateToCharacterLimit(draft, spec.hard);
}

function truncateToCharacterLimit(value: string, max: number): string {
  if (value.length <= max) return value;
  const trimmed = value.slice(0, Math.max(0, max - 1)).trimEnd();
  return `${trimmed.replace(/[,\s.;:!?-]+$/, "")}…`;
}

export async function runGrammarAudit(token: string): Promise<GrammarAuditResponse> {
  const { posts } = await workspaceCorpus(token);
  if (posts.length === 0) throw new AppError("This workspace doesn't have any posts yet.", 409);
  const estimatedTokens = 800 + posts.reduce((total, post) => total + Math.ceil(post.contentText.length / 10), 0);
  await assertWorkspaceTokenBudget(token, estimatedTokens, "proofreading");

  const issues = posts.flatMap((post) => detectPostIssues(post)).slice(0, 30);
  const saved = await replaceGrammarIssues(token, issues);
  await recordWorkspaceTokenUsage({
    token,
    feature: "proofreading",
    label: "grammar audit heuristic scan",
    tokens: estimatedTokens
  });

  return {
    summary:
      saved.length > 0
        ? "Based on the public library, the most useful edits are style-preserving clarity passes rather than generic rewriting."
        : "No recurring grammar or style issues were detected by the heuristic pass.",
    issues: saved
  };
}

export async function getGrammarAudit(token: string): Promise<GrammarAuditResponse> {
  const issues = await listGrammarIssues(token);
  return {
    summary:
      issues.length > 0
        ? "Previously detected library-wide grammar and style issues."
        : "No grammar audit has been run for this workspace yet.",
    issues
  };
}

function detectPostIssues(post: Post): Omit<GrammarIssue, "id" | "workspaceId" | "createdAt">[] {
  const sentences = post.contentText.match(/[^.!?]+[.!?]+/g) ?? [];
  const issues: Omit<GrammarIssue, "id" | "workspaceId" | "createdAt">[] = [];

  for (const sentence of sentences.slice(0, 80)) {
    const clean = sentence.trim();
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length > 42) {
      issues.push({
        postId: post.id,
        postTitle: post.title,
        issueType: "sentence_length",
        severity: "medium" as const,
        originalText: clean,
        suggestedText: null,
        explanation: "This long sentence may delay the main claim. Consider splitting it while preserving the original voice."
      });
    }
    if (/\b(really|very|just|basically|actually)\b/i.test(clean)) {
      issues.push({
        postId: post.id,
        postTitle: post.title,
        issueType: "filler_phrase",
        severity: "low" as const,
        originalText: clean,
        suggestedText: clean.replace(/\b(really|very|just|basically|actually)\b\s*/gi, ""),
        explanation: "This sentence uses a filler word that may weaken an otherwise direct claim."
      });
    }
    if (issues.length >= 5) break;
  }

  return issues;
}
