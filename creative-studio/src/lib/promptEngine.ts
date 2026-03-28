import type { BannerState } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PromptContext {
  brandName: string;
  industry?: string;
  audience?: string;
  prizeText?: string;
  researchContext?: string;
  selectedCopy?: { headline?: string; cta?: string };
  websiteUrl?: string;
  /** Primary brand color hex, e.g. "#4F46E5" */
  brandColor?: string;
  /** Data-URI of the brand logo */
  logoUrl?: string;
}

export type VariationLabel = "A" | "B" | "C" | "D" | "E";

export interface PromptResult {
  prompt: string;
  variationLabel: VariationLabel;
}

// ---------------------------------------------------------------------------
// Format hint — tells the model about aspect ratio and layout expectations
// ---------------------------------------------------------------------------

export function buildFormatHint(w: number, h: number): string {
  const ratio = w / h;
  const ar = ratio.toFixed(2);
  const arInv = (h / w).toFixed(2);

  if (ratio > 3)
    return `CRITICAL: Very wide, thin banner (${w}x${h}, ${ar}:1). Image MUST be a wide horizontal strip. Compose all elements in a single horizontal row across the full width. Do NOT create a square or tall image.`;
  if (ratio > 1.5)
    return `Wide banner (${w}x${h}, ${ar}:1). Lay out elements horizontally across the full width.`;
  if (ratio >= 0.67)
    return `Roughly square banner (${w}x${h}, ${ar}:1). Fill the entire frame evenly.`;
  if (ratio < 0.4)
    return `CRITICAL: Very tall, narrow banner (${w}x${h}, 1:${arInv}). Image MUST be a tall vertical strip. Stack all elements top-to-bottom. Do NOT create a square or wide image.`;
  return `Portrait banner (${w}x${h}, 1:${arInv}). Stack elements vertically.`;
}

// ---------------------------------------------------------------------------
// Per-state base prompts
// ---------------------------------------------------------------------------

function scratchPrompt(ctx: PromptContext, fmtHint: string): string {
  const prize = ctx.prizeText || "a prize";
  return [
    fmtHint,
    `Create a vibrant, eye-catching banner background for a scratch-to-win ad for "${ctx.brandName}".`,
    ctx.industry ? `Industry: ${ctx.industry}.` : "",
    ctx.audience ? `Target audience: ${ctx.audience}.` : "",
    `The image should be exciting and inviting, with bold colors and energy that says "scratch here to win ${prize}".`,
    ctx.brandColor ? `Use brand color ${ctx.brandColor} as an accent.` : "",
    "Style: bright, high-contrast, festive, gamified. Use direct, clear imagery (not abstract). No text on the image.",
  ].filter(Boolean).join(" ");
}

function winPrompt(ctx: PromptContext, fmtHint: string): string {
  const prize = ctx.prizeText || "a prize";
  return [
    fmtHint,
    `Create a celebratory banner for a "You Won!" screen for "${ctx.brandName}".`,
    ctx.industry ? `Industry: ${ctx.industry}.` : "",
    `The image MUST prominently feature a clear, direct depiction of the prize: ${prize}.`,
    "Show the actual prize item/product front and center with a celebratory background (confetti, sparkles, golden glow).",
    ctx.brandColor ? `Use brand color ${ctx.brandColor} as an accent.` : "",
    "Style: bright, joyful, celebratory. Direct product/prize photography style, not abstract. No text on the image.",
  ].filter(Boolean).join(" ");
}

function losePrompt(ctx: PromptContext, fmtHint: string): string {
  return [
    fmtHint,
    `Create a warm, encouraging "Play Again Soon" banner for "${ctx.brandName}".`,
    ctx.industry ? `Industry: ${ctx.industry}.` : "",
    'The mood should feel friendly, inviting, and optimistic, like "we\'d love to see you back."',
    "Use warm tones (soft oranges, warm yellows, gentle gradients) that keep the user feeling positive about the brand.",
    "Leave space for a logo and brand name overlay.",
    ctx.brandColor ? `Use brand color ${ctx.brandColor} as an accent.` : "",
    "Style: warm, friendly, hopeful, on-brand. Use direct, clear imagery (not abstract). No text on the image.",
  ].filter(Boolean).join(" ");
}

function redeemPrompt(ctx: PromptContext, fmtHint: string): string {
  const prize = ctx.prizeText || "a prize";
  return [
    fmtHint,
    `Create a bold, action-oriented banner for a prize redemption screen for "${ctx.brandName}".`,
    ctx.industry ? `Industry: ${ctx.industry}.` : "",
    'The image MUST include the bold text "Tap to Redeem!" prominently displayed as if integrated into the image itself, with a 3D pop-out or embossed effect.',
    `Show ${prize} alongside the text.`,
    "Use a bright, urgent, rewarding color palette with glow effects around the text.",
    ctx.brandColor ? `Use brand color ${ctx.brandColor} as an accent.` : "",
    'Style: vibrant, bold, inviting, CTA-focused. The "Tap to Redeem!" text MUST be part of the generated image.',
  ].filter(Boolean).join(" ");
}

function brandPrompt(ctx: PromptContext, fmtHint: string): string {
  const prize = ctx.prizeText || "a prize";
  const imagery =
    prize !== "a prize"
      ? `the campaign giveaway: ${prize}`
      : `the ${ctx.industry || "brand"} industry and what the brand offers`;
  return [
    fmtHint,
    `Create a warm, inviting branded banner for "${ctx.brandName}" that will serve as a clickable redirect link.`,
    ctx.industry ? `Industry: ${ctx.industry}.` : "",
    `The image MUST include the company name "${ctx.brandName}" as stylish, prominent text integrated into the design.`,
    `Feature warm, welcoming imagery directly related to ${imagery}.`,
    "This is the default banner users see, so it must feel like a branded landing spot: warm lighting, premium feel.",
    "Leave space for a logo to be overlaid on top.",
    ctx.brandColor ? `Use brand color ${ctx.brandColor} as an accent.` : "",
    `Style: warm tones, soft gradients, welcoming, premium, brand-forward. Use direct, clear imagery (not abstract). The company name "${ctx.brandName}" MUST appear as text in the image.`,
  ].filter(Boolean).join(" ");
}

const STATE_PROMPT_BUILDERS: Record<BannerState, (ctx: PromptContext, fmtHint: string) => string> = {
  scratch: scratchPrompt,
  win: winPrompt,
  lose: losePrompt,
  redeem: redeemPrompt,
  brand: brandPrompt,
};

// ---------------------------------------------------------------------------
// Variation modifiers (A = control, B-E = strategic variants per the spec)
// ---------------------------------------------------------------------------

const VARIATION_MODIFIERS: Record<VariationLabel, string> = {
  A: "", // Control — use the base prompt as-is
  B: "VARIATION B (Copy Variant): Use a different headline approach and call-to-action style. Try a more emotional or urgency-driven tone compared to the base design.",
  C: "VARIATION C (Visual Variant): Use a distinctly different color scheme or visual treatment. Try a bolder palette, different gradient direction, or contrasting visual mood while keeping the same message.",
  D: "VARIATION D (Prize/Benefit Variant): Emphasize the benefit or prize differently. Shift the visual focus to highlight the value proposition from a new angle.",
  E: "VARIATION E (Layout Variant): Use a different composition and element placement. Try an alternative arrangement of key elements (image, text areas, focal point) while maintaining the same content.",
};

// ---------------------------------------------------------------------------
// Research context injection
// ---------------------------------------------------------------------------

function appendResearchContext(prompt: string, ctx: PromptContext): string {
  let result = prompt;
  if (ctx.researchContext) {
    result += ` Research insights: ${ctx.researchContext}`;
  }
  if (ctx.selectedCopy?.headline || ctx.selectedCopy?.cta) {
    const parts: string[] = [];
    if (ctx.selectedCopy.headline) parts.push(`Suggested headline: "${ctx.selectedCopy.headline}"`);
    if (ctx.selectedCopy.cta) parts.push(`CTA: "${ctx.selectedCopy.cta}"`);
    result += ` ${parts.join(". ")}.`;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Continuity hint (for multi-state generation: keep a cohesive campaign look)
// ---------------------------------------------------------------------------

export function buildContinuityHint(hasPreviousImages: boolean): string {
  if (!hasPreviousImages) return "";
  return " IMPORTANT: Match the visual style, color palette, and overall aesthetic of the reference image(s) provided. The entire banner sequence must look like a cohesive set from the same campaign.";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a fully-formed prompt for a single banner state + variation.
 */
export function buildPrompt(
  state: BannerState,
  variation: VariationLabel,
  ctx: PromptContext,
  width: number,
  height: number,
  options?: { continuityHint?: boolean },
): string {
  const fmtHint = buildFormatHint(width, height);
  let prompt = STATE_PROMPT_BUILDERS[state](ctx, fmtHint);
  prompt = appendResearchContext(prompt, ctx);

  const modifier = VARIATION_MODIFIERS[variation];
  if (modifier) {
    prompt += ` ${modifier}`;
  }

  if (options?.continuityHint) {
    prompt += buildContinuityHint(true);
  }

  return prompt;
}

/**
 * Build prompts for all requested variations of a single state.
 */
export function buildVariationPrompts(
  state: BannerState,
  count: number,
  ctx: PromptContext,
  width: number,
  height: number,
  options?: { continuityHint?: boolean },
): PromptResult[] {
  const labels: VariationLabel[] = ["A", "B", "C", "D", "E"];
  return labels.slice(0, Math.min(count, 5)).map((label) => ({
    prompt: buildPrompt(state, label, ctx, width, height, options),
    variationLabel: label,
  }));
}

/**
 * Build prompts for all 5 banner states (one variation each).
 * Used by the "Generate All States" flow.
 */
export function buildAllStatePrompts(
  ctx: PromptContext,
  width: number,
  height: number,
): { state: BannerState; label: string; prompt: string }[] {
  const stateLabels: Record<BannerState, string> = {
    scratch: "Scratch-to-Win",
    win: "Win",
    lose: "Lose",
    redeem: "Redeem",
    brand: "Default",
  };
  const states: BannerState[] = ["scratch", "win", "lose", "redeem", "brand"];
  return states.map((state) => ({
    state,
    label: stateLabels[state],
    prompt: buildPrompt(state, "A", ctx, width, height),
  }));
}
