import type { BannerState } from "@/types";
import type { PromptContext } from "@/lib/promptEngine";

export interface GeneratedBanner {
  id: string;
  imageUrl: string;
  variationLabel: string;
  prompt: string;
}

export interface BannerGenerationParams {
  /** Raw prompt string (legacy / fallback). Ignored when bannerState + promptContext are set. */
  prompt?: string;
  width: number;
  height: number;
  /** Number of variations to generate (1-5) */
  count: number;
  /** Data-URI reference images for visual continuity */
  referenceImages?: string[];
  /** Banner state for the prompt engine */
  bannerState?: BannerState;
  /** Campaign context for the prompt engine */
  promptContext?: PromptContext;
}

export interface GenerationProgress {
  completed: number;
  total: number;
  currentLabel?: string;
}

/**
 * Generate banner variations via the /api/generate endpoint.
 *
 * When `bannerState` and `promptContext` are provided, the API route uses
 * the prompt engine to build state-specific, variation-aware prompts.
 * Otherwise falls back to the raw `prompt` string.
 */
export async function generateBannerVariations(
  params: BannerGenerationParams,
): Promise<GeneratedBanner[]> {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      body.error || `Banner generation API failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}
