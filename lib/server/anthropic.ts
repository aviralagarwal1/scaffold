import type { TokenUsageFeature } from "@/types/workspace";
import { assertWorkspaceTokenBudget, recordWorkspaceTokenUsage } from "./store";

// Anthropic gateway.
//
// The one place the product talks to a model. Every caller goes through
// generateText, so budget enforcement and usage recording cannot be skipped
// by a new feature that forgets to do it.

export interface GenerateOptions {
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

export function estimateTokens(value: string): number {
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

export async function generateText(system: string, user: string, options: GenerateOptions = {}): Promise<string | null> {
  const expectedTokens =
    options.usage?.expectedTokens ?? estimateTokens(system) + estimateTokens(user) + (options.maxTokens ?? 1800);
  if (options.usage) {
    await assertWorkspaceTokenBudget(options.usage.workspaceToken, expectedTokens);
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
