import type {
  AskResponse,
  DistributionPlatform,
  DraftFeedbackResponse,
  Idea,
  IdeasResponse,
  PromptSuggestionsResponse,
  RepurposeDraft,
  SourceCitation
} from "@/types/ai";
import type { Post } from "@/types/post";
import type { ArchiveTheme } from "@/types/workspace";
import {
  addRepurposeDrafts,
  getPost,
  workspaceCorpus
} from "./store";
import { excerpt } from "./text";
import { AppError } from "./errors";
import { generateText } from "./anthropic";
import { retrieve, toSources } from "./retrieval";
import { cleanThemeLabel } from "./themes";

const editorialSystemPrompt = [
  "You are a careful curator for a writer's publication and library.",
  "Use only the provided public library context.",
  "Do not invent subscriber data, open rates, clicks, traffic, revenue, or performance rankings.",
  "If private metrics are unavailable, say so plainly.",
  "Give specific, actionable feedback grounded in source posts.",
  "Preserve the writer's style and ambition.",
  "Avoid generic content marketing advice."
].join("\n");

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
      const name = "name" in section && typeof section.name === "string" ? cleanThemeLabel(section.name) : "";
      const rawIdeas = "ideas" in section && Array.isArray(section.ideas) ? (section.ideas as unknown[]) : [];
      const ideas = rawIdeas
        .map((idea): GeneratedIdeaPayload["sections"][number]["ideas"][number] | null => {
          if (!idea || typeof idea !== "object") return null;
          const title = "title" in idea && typeof idea.title === "string" ? cleanThemeLabel(idea.title) : "";
          const thesis = "thesis" in idea && typeof idea.thesis === "string" ? cleanThemeLabel(idea.thesis) : "";
          const lens = "lens" in idea && typeof idea.lens === "string" ? cleanThemeLabel(idea.lens) : "";
          const whyItFits =
            "whyItFits" in idea && typeof idea.whyItFits === "string" ? cleanThemeLabel(idea.whyItFits) : "";
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

