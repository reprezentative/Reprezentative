import { prisma } from "@/lib/prisma";

type DeepseekUsage = {
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
} | null | undefined;

/**
 * Records a DeepSeek API call in the ApiCall table for the "API Calls & Usage"
 * dashboard, estimating cost from token usage and the configured per-1M rates.
 * Best-effort: never throws into the caller.
 */
export async function logDeepseekCall(opts: {
  operation: string;
  usage: DeepseekUsage;
  source?: string;
  meta?: Record<string, unknown>;
}) {
  try {
    const promptTokens = opts.usage?.prompt_tokens ?? null;
    const completionTokens = opts.usage?.completion_tokens ?? null;
    const totalTokens = (promptTokens ?? 0) + (completionTokens ?? 0) || null;

    const inputPer1m = Number(process.env.DEEPSEEK_INPUT_PRICE_PER_1M_USD);
    const outputPer1m = Number(process.env.DEEPSEEK_OUTPUT_PRICE_PER_1M_USD);

    let estimatedCost: number | null = null;
    if (
      promptTokens != null &&
      completionTokens != null &&
      Number.isFinite(inputPer1m) &&
      Number.isFinite(outputPer1m)
    ) {
      estimatedCost =
        promptTokens * (inputPer1m / 1_000_000) +
        completionTokens * (outputPer1m / 1_000_000);
    }

    await prisma.apiCall.create({
      data: {
        service: "deepseek",
        platform: "AI",
        operation: opts.operation,
        units: totalTokens ?? undefined,
        unitType: "tokens",
        estimatedCost: estimatedCost ?? undefined,
        currency: "USD",
        meta: {
          source: opts.source ?? "admin",
          ...(opts.meta ?? {}),
        } as any,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Failed to log API call:", error);
    }
  }
}
