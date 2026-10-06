import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { getEnv } from "./env";
import { MODEL_FACING_SCHEMA } from "../schema";

export interface GeminiCallParams {
  systemInstruction: string;
  userPrompt: string;
  timeoutMs: number;
  modelOverride?: string;
}

export interface GeminiCallResult {
  text: string;
  finishReason?: string;
  tokenUsage?: {
    promptTokens?: number;
    candidatesTokens?: number;
    totalTokens?: number;
  };
}

/**
 * Calls Gemini via ai.models.generateContent with structured JSON schema.
 * Leaves temperature at default.
 * Handles timeouts with AbortSignal and httpOptions.
 */
export async function callGemini(params: GeminiCallParams): Promise<GeminiCallResult> {
  const env = getEnv();
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, params.timeoutMs);

  try {
    let thinkingLevel = ThinkingLevel.MEDIUM;
    if (env.GEMINI_THINKING_LEVEL === "low") {
      thinkingLevel = ThinkingLevel.LOW;
    } else if (env.GEMINI_THINKING_LEVEL === "high") {
      thinkingLevel = ThinkingLevel.HIGH;
    }

    const response = await ai.models.generateContent({
      model: params.modelOverride || env.GEMINI_MODEL,
      contents: params.userPrompt,
      config: {
        systemInstruction: params.systemInstruction,
        responseMimeType: "application/json",
        responseSchema: MODEL_FACING_SCHEMA,
        maxOutputTokens: 8192,
        thinkingConfig: {
          thinkingLevel,
        },
        abortSignal: abortController.signal,
        httpOptions: {
          timeout: params.timeoutMs,
        },
      },
    });

    const text = response.text || "";
    const candidate = response.candidates?.[0];
    const finishReason = candidate?.finishReason;

    const tokenUsage = response.usageMetadata
      ? {
          promptTokens: response.usageMetadata.promptTokenCount,
          candidatesTokens: response.usageMetadata.candidatesTokenCount,
          totalTokens: response.usageMetadata.totalTokenCount,
        }
      : undefined;

    return {
      text,
      finishReason,
      tokenUsage,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
