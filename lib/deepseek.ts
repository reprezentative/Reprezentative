export type DeepSeekRole = "system" | "user" | "assistant";

export interface DeepSeekMessage {
  role: DeepSeekRole;
  content: string;
}

export interface DeepSeekChatRequest {
  model?: string;
  messages: DeepSeekMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
}

export interface DeepSeekChatChoice {
  index: number;
  message: {
    role: DeepSeekRole;
    content: string;
  };
  finish_reason: string;
}

export interface DeepSeekChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: DeepSeekChatChoice[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

const DEFAULT_MODEL = "deepseek-chat";

// Lazy-loaded, cached API key (DB-backed or env fallback).
// The cache has a short TTL so a key updated via the dashboard is picked up
// without a server restart, and clearDeepSeekKeyCache() forces an immediate
// refresh in the process that performed the update.
let cachedApiKey: string | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 60_000;

/** Invalidate the cached DeepSeek key (call after the key is changed). */
export function clearDeepSeekKeyCache() {
  cachedApiKey = null;
  cacheExpiresAt = 0;
}

// We import late to avoid circular issues for environments that never call chat.
async function getDeepSeekApiKey(): Promise<string | null> {
  const now = Date.now();
  if (cachedApiKey && now < cacheExpiresAt) {
    return cachedApiKey;
  }

  // Prefer a dashboard-managed key from the DB, falling back to the env var.
  try {
    const { prisma } = await import("./prisma");
    const { decryptSecret } = await import("./crypto");

    const record = await prisma.integrationSecret.findUnique({
      where: { service: "deepseek" },
    });

    if (record) {
      cachedApiKey = decryptSecret(record.secret);
      cacheExpiresAt = now + CACHE_TTL_MS;
      return cachedApiKey;
    }
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Failed to load DeepSeek key from IntegrationSecret:", error);
    }
  }

  const envKey = process.env.DEEPSEEK_API_KEY ?? null;
  if (!envKey && process.env.NODE_ENV === "development") {
    console.warn("DEEPSEEK_API_KEY is not set. AI features may be disabled.");
  }
  cachedApiKey = envKey;
  cacheExpiresAt = now + CACHE_TTL_MS;
  return cachedApiKey;
}

export class DeepSeekClient {
  private readonly apiUrl: string;

  constructor() {
    this.apiUrl = process.env.DEEPSEEK_API_URL ?? "https://api.deepseek.com/v1";
  }

  async chat(request: DeepSeekChatRequest): Promise<DeepSeekChatResponse> {
    const apiKey = await getDeepSeekApiKey();
    if (!apiKey) {
      throw new Error("DeepSeek API key is not configured.");
    }

    const body = {
      model: request.model ?? DEFAULT_MODEL,
      messages: request.messages,
      max_tokens: request.max_tokens ?? 500,
      temperature: request.temperature ?? 0.7,
      top_p: request.top_p ?? 0.95,
    };

    const response = await fetch(`${this.apiUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `DeepSeek API request failed with status ${response.status}: ${errorText}`,
      );
    }

    const json = (await response.json()) as DeepSeekChatResponse;
    return json;
  }
}

// Singleton instance to reuse across the app.
export const deepseek = new DeepSeekClient();


