import type {
  AskResponse,
  DistributionPlatform,
  DraftFeedbackResponse,
  GrammarAuditResponse,
  GrammarIssue,
  Idea,
  IdeasResponse,
  RepurposeDraft,
  SourceCitation
} from "@/types/ai";
import type { Post, PostChunk } from "@/types/post";
import {
  addRepurposeDrafts,
  getPost,
  listGrammarIssues,
  replaceGrammarIssues,
  workspaceCorpus
} from "./store";
import { excerpt } from "./text";
import { AppError } from "./errors";

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

async function generateWithAnthropic(system: string, user: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      "x-api-key": apiKey
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5",
      max_tokens: 1800,
      temperature: 0.4,
      system,
      messages: [{ role: "user", content: user }]
    })
  });

  if (!response.ok) {
    console.error("Anthropic request failed", await response.text());
    return null;
  }

  const data = (await response.json()) as { content?: { type?: string; text?: string }[] };
  return data.content
    ?.filter((item) => item.type === "text" && item.text)
    .map((item) => item.text)
    .join("\n")
    .trim() ?? null;
}

async function generateWithOpenAI(system: string, user: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      temperature: 0.4,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    })
  });

  if (!response.ok) {
    console.error("OpenAI request failed", await response.text());
    return null;
  }

  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() ?? null;
}

async function generateText(system: string, user: string): Promise<string | null> {
  return (await generateWithAnthropic(system, user)) ?? (await generateWithOpenAI(system, user));
}

const editorialSystemPrompt = [
  "You are an editorial assistant for a Substack writer.",
  "Use only the provided public archive context.",
  "Do not invent subscriber data, open rates, clicks, traffic, revenue, or performance rankings.",
  "If private metrics are unavailable, say so plainly.",
  "Give specific, actionable feedback grounded in source posts.",
  "Preserve the writer's style and ambition.",
  "Avoid generic content marketing advice."
].join("\n");

export async function answerArchiveQuestion(token: string, message: string): Promise<AskResponse> {
  if (!message.trim()) throw new AppError("Ask a question about the archive.", 400);

  const { workspace, posts, chunks } = await workspaceCorpus(token);
  if (posts.length === 0) {
    throw new AppError("This workspace does not have any ingested posts yet.", 409);
  }

  const retrieved = retrieve(posts, chunks, message);
  const sources = toSources(retrieved);
  const context = retrieved
    .map(({ post, chunk }, index) => `[${index + 1}] ${post.title}\n${post.url}\n${excerpt(chunk.content, 1200)}`)
    .join("\n\n");

  const generated = await generateText(
    editorialSystemPrompt,
    `Publication: ${workspace.publicationName ?? workspace.publicationUrl}\nQuestion: ${message}\n\nArchive context:\n${context}\n\nAnswer with: Direct answer, What I am seeing in the archive, Specific examples, Recommendation, Suggested next step.`
  );

  return {
    answer:
      generated ??
      [
        `Based on the public archive, the strongest answer comes from ${sources.length} relevant post${sources.length === 1 ? "" : "s"}.`,
        "",
        "What I am seeing in your archive",
        sources.map((source) => `- "${source.title}" points to this pattern: ${source.snippet}`).join("\n"),
        "",
        "Recommendation",
        "Use these posts as the source material for the next editorial decision. I do not have private subscriber, open, click, or traffic data, so this is a qualitative archive read rather than a performance claim."
      ].join("\n"),
    sources
  };
}

export async function generateDraftFeedback(token: string, draft: string): Promise<DraftFeedbackResponse> {
  if (draft.trim().length < 80) throw new AppError("Paste a longer draft for meaningful feedback.", 400);

  const { posts, chunks } = await workspaceCorpus(token);
  if (posts.length === 0) throw new AppError("This workspace does not have any ingested posts yet.", 409);
  const retrieved = retrieve(posts, chunks, draft, 5);
  const sources = toSources(retrieved);
  const context = retrieved
    .map(({ post, chunk }, index) => `[${index + 1}] ${post.title}\n${excerpt(chunk.content, 1000)}`)
    .join("\n\n");

  const generated = await generateText(
    editorialSystemPrompt,
    `Evaluate this draft against the writer's archive. Do not rewrite the full draft by default.\n\nArchive context:\n${context}\n\nDraft:\n${draft}\n\nUse this format: Overall read, What feels most like your voice, What feels weakest, Structure feedback, Specific edits, Title/hook options.`
  );

  return {
    feedback:
      generated ??
      [
        "Overall read",
        "This draft has enough material for an editorial pass, but generated model feedback is not configured. Based on lexical overlap, compare it most closely with the cited archive posts.",
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

export async function generateIdeas(token: string): Promise<IdeasResponse> {
  const { workspace, posts, chunks } = await workspaceCorpus(token);
  if (posts.length === 0) throw new AppError("This workspace does not have any ingested posts yet.", 409);
  const latest = retrieve(posts, chunks, workspace.topThemes.join(" "), 6);
  const sources = toSources(latest);

  const ideas: Idea[] = (workspace.topThemes.length ? workspace.topThemes : ["your archive", "recent essays", "recurring argument"])
    .slice(0, 6)
    .map((theme, index) => ({
      title: `What ${theme} still does not explain`,
      thesis: `A sharper follow-up that revisits ${theme} through a more specific argument or lived example.`,
      whyItFits: `This fits because ${theme} appears repeatedly in the public archive, without claiming private performance data.`,
      relatedPosts: sources.slice(index % Math.max(sources.length, 1), index % Math.max(sources.length, 1) + 2)
    }));

  return {
    sections: [
      { name: "Natural sequels", ideas: ideas.slice(0, 2) },
      { name: "Underexplored themes", ideas: ideas.slice(2, 4) },
      { name: "Posts to revisit", ideas: ideas.slice(4, 6) }
    ]
  };
}

export async function generateDistributionDrafts(
  token: string,
  postId: string,
  platform: DistributionPlatform
): Promise<RepurposeDraft[]> {
  const post = await getPost(token, postId);
  const variants = distributionVariants(platform, post);
  return addRepurposeDrafts(
    token,
    variants.map((variant) => ({
      postId: post.id,
      platform,
      status: "generated",
      title: variant.title,
      content: variant.content,
      sourcePostTitle: post.title,
      sourcePostUrl: post.url
    }))
  );
}

function distributionVariants(platform: DistributionPlatform, post: Post): Pick<RepurposeDraft, "title" | "content">[] {
  const lead = excerpt(post.contentText, 220);
  if (platform === "twitter") {
    return [
      {
        title: "Single post",
        content: `${post.title}\n\n${lead}\n\n${post.url}`
      },
      {
        title: "Thread starter",
        content: `I wrote about ${post.title.toLowerCase()}.\n\nThe core idea: ${lead}\n\nA few notes from the piece:`
      }
    ];
  }

  if (platform === "linkedin") {
    return [
      {
        title: "Reflective post",
        content: `${post.title}\n\n${lead}\n\nThe part worth discussing is not just the conclusion, but the pattern underneath it.\n\n${post.url}`
      },
      {
        title: "Concise professional post",
        content: `New essay: ${post.title}\n\n${lead}\n\nCurious how others are thinking about this.`
      }
    ];
  }

  return [
    {
      title: "Discussion prompt",
      content: `I wrote about ${post.title.toLowerCase()}, but I am more interested in how other people are seeing the same pattern.\n\n${lead}\n\nHow would you frame the tradeoff here?`
    },
    {
      title: "Non-promotional summary",
      content: `Question for people who think about this area: ${post.title}\n\nMy argument, in short: ${lead}\n\nWhere do you think this breaks down?`
    }
  ];
}

export async function runGrammarAudit(token: string): Promise<GrammarAuditResponse> {
  const { posts } = await workspaceCorpus(token);
  if (posts.length === 0) throw new AppError("This workspace does not have any ingested posts yet.", 409);

  const issues = posts.flatMap((post) => detectPostIssues(post)).slice(0, 30);
  const saved = await replaceGrammarIssues(token, issues);

  return {
    summary:
      saved.length > 0
        ? "Based on the public archive, the most useful edits are style-preserving clarity passes rather than generic rewriting."
        : "No recurring grammar or style issues were detected by the heuristic pass.",
    issues: saved
  };
}

export async function getGrammarAudit(token: string): Promise<GrammarAuditResponse> {
  const issues = await listGrammarIssues(token);
  return {
    summary:
      issues.length > 0
        ? "Previously detected archive-wide grammar and style issues."
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
