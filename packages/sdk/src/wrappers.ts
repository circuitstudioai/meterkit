import { getDefaultMeterKit, type MeterKit } from "./meter";

export type TokenUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

function tokenUnits(usage?: TokenUsage): number {
  if (!usage) {
    return 1;
  }
  if (usage.totalTokens && usage.totalTokens > 0) {
    return usage.totalTokens;
  }
  return (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0) || 1;
}

/**
 * Wrap an OpenAI-compatible `chat.completions.create` (or similar) so each
 * call is metered by token usage. The LLM never decides the price.
 */
export function wrapOpenAI<
  T extends {
    chat?: {
      completions?: {
        create: (...args: never[]) => Promise<{ usage?: TokenUsage & { total_tokens?: number } }>;
      };
    };
  },
>(
  client: T,
  opts: { userId: string; featureKey?: string; kit?: MeterKit }
): T {
  const kit = opts.kit ?? getDefaultMeterKit();
  const featureKey = opts.featureKey ?? "openai.tokens";
  const create = client.chat?.completions?.create?.bind(client.chat?.completions);
  if (!create) {
    return client;
  }
  client.chat!.completions!.create = (async (...args: never[]) => {
    const result = await create(...args);
    const usage = result.usage;
    await kit.meter(featureKey, {
      userId: opts.userId,
      units: tokenUnits({
        inputTokens: (usage as { prompt_tokens?: number } | undefined)?.prompt_tokens,
        outputTokens: (usage as { completion_tokens?: number } | undefined)
          ?.completion_tokens,
        totalTokens: usage?.total_tokens ?? usage?.totalTokens,
      }),
    });
    return result;
  }) as typeof create;
  return client;
}

type GeminiLike = {
  models: {
    generateContent: (...args: never[]) => Promise<{
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
    }>;
  };
};

/** Wrap `@google/genai` `models.generateContent` and meter by token counts. */
export function wrapGemini<T extends GeminiLike>(
  client: T,
  opts: { userId: string; featureKey?: string; kit?: MeterKit }
): T {
  const kit = opts.kit ?? getDefaultMeterKit();
  const featureKey = opts.featureKey ?? "gemini.tokens";
  const original = client.models.generateContent.bind(client.models);
  client.models.generateContent = (async (...args: never[]) => {
    const result = await original(...args);
    const usage = result.usageMetadata;
    await kit.meter(featureKey, {
      userId: opts.userId,
      units: tokenUnits({
        inputTokens: usage?.promptTokenCount,
        outputTokens: usage?.candidatesTokenCount,
        totalTokens: usage?.totalTokenCount,
      }),
    });
    return result;
  }) as T["models"]["generateContent"];
  return client;
}
