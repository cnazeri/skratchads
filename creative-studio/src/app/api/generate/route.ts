import { NextRequest, NextResponse } from "next/server";
import type { GeneratedBanner, BannerGenerationParams } from "@/lib/nanoBanana";
import { buildPrompt, buildVariationPrompts } from "@/lib/promptEngine";
import type { VariationLabel } from "@/lib/promptEngine";
import type { BannerState } from "@/types";

const API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent";

// Rate-limit: max concurrent requests in a batch, with a pause between batches
const BATCH_SIZE = 3;
const BATCH_DELAY_MS = 2000;
const MAX_RETRIES = 2;
const REQUEST_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseDataUri(dataUri: string): { mimeType: string; data: string } | null {
  const match = dataUri.match(/^data:(image\/[^;]+);base64,(.+)$/);
  return match ? { mimeType: match[1], data: match[2] } : null;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function callGemini(
  apiKey: string,
  prompt: string,
  referenceImages?: string[],
): Promise<string | null> {
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  // Reference images first so the model sees them before the text prompt
  if (referenceImages) {
    for (const refImg of referenceImages) {
      const parsed = parseDataUri(refImg);
      if (parsed) {
        parts.push({ inlineData: parsed });
      }
    }
  }

  parts.push({ text: prompt });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      }),
      signal: controller.signal,
    });

    if (response.status === 429) {
      // Rate limited — let the caller handle retry with backoff
      throw new RateLimitError("Rate limited by Gemini API");
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const responseParts = data.candidates?.[0]?.content?.parts || [];

    for (const rp of responseParts) {
      if (rp.inlineData?.mimeType?.startsWith("image/")) {
        return `data:${rp.inlineData.mimeType};base64,${rp.inlineData.data}`;
      }
    }

    return null;
  } finally {
    clearTimeout(timeout);
  }
}

class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

/**
 * Generate a single image with retry logic and exponential backoff.
 */
async function generateWithRetry(
  apiKey: string,
  prompt: string,
  referenceImages?: string[],
): Promise<string | null> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const imageUrl = await callGemini(apiKey, prompt, referenceImages);
      if (imageUrl) return imageUrl;

      // No image returned — retry with simplified prompt on last attempt
      if (attempt === MAX_RETRIES) return null;
      console.warn(`No image in response, retrying (${attempt + 1}/${MAX_RETRIES})`);
    } catch (err) {
      if (err instanceof RateLimitError) {
        const backoff = BATCH_DELAY_MS * Math.pow(2, attempt);
        console.warn(`Rate limited, backing off ${backoff}ms`);
        await sleep(backoff);
        continue;
      }

      if (attempt === MAX_RETRIES) {
        console.error(`Failed after ${MAX_RETRIES + 1} attempts:`, err);
        return null;
      }

      const backoff = 1000 * Math.pow(2, attempt);
      console.warn(`Attempt ${attempt + 1} failed, retrying in ${backoff}ms:`, err);
      await sleep(backoff);
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body: BannerGenerationParams = await request.json();
    const { prompt, width, height, count, referenceImages, bannerState, promptContext } = body;

    if (!width || !height || !count || count < 1 || count > 5) {
      return NextResponse.json(
        { error: "Invalid parameters: width, height required; count must be 1-5" },
        { status: 400 },
      );
    }

    const apiKey = process.env.NANO_BANANA_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Nano Banana API key not configured" },
        { status: 500 },
      );
    }

    // Build prompts: use the prompt engine if state + context are provided,
    // otherwise fall back to the raw prompt string (backwards compatible).
    let prompts: { prompt: string; variationLabel: string }[];

    if (bannerState && promptContext) {
      prompts = buildVariationPrompts(
        bannerState as BannerState,
        count,
        promptContext,
        width,
        height,
        { continuityHint: (referenceImages?.length ?? 0) > 0 },
      );
    } else if (prompt) {
      const labels: VariationLabel[] = ["A", "B", "C", "D", "E"];
      prompts = labels.slice(0, count).map((label) => ({
        prompt: `${prompt} Variation ${label}.`,
        variationLabel: label,
      }));
    } else {
      return NextResponse.json(
        { error: "Either prompt or (bannerState + promptContext) is required" },
        { status: 400 },
      );
    }

    // Generate in batches of BATCH_SIZE to respect rate limits
    const results: GeneratedBanner[] = [];

    for (let batchStart = 0; batchStart < prompts.length; batchStart += BATCH_SIZE) {
      if (batchStart > 0) await sleep(BATCH_DELAY_MS);

      const batch = prompts.slice(batchStart, batchStart + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map(async (p) => {
          const imageUrl = await generateWithRetry(apiKey, p.prompt, referenceImages);
          if (!imageUrl) return null;
          return {
            id: `banner-${Date.now()}-${p.variationLabel}`,
            imageUrl,
            variationLabel: p.variationLabel,
            prompt: p.prompt,
          } satisfies GeneratedBanner;
        }),
      );

      for (const result of batchResults) {
        if (result.status === "fulfilled" && result.value) {
          results.push(result.value);
        }
      }
    }

    if (results.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate any banner variations" },
        { status: 500 },
      );
    }

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: msg },
      { status: 500 },
    );
  }
}
