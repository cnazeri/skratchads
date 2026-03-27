import { NextRequest, NextResponse } from "next/server";
import type {
  GeneratedBanner,
  BannerGenerationParams,
} from "@/lib/nanoBanana";

const VARIATION_LABELS = ["A", "B", "C", "D", "E"];

export async function POST(request: NextRequest) {
  try {
    const body: BannerGenerationParams = await request.json();
    const { prompt, width, height, count, referenceImages } = body;

    if (!prompt || !width || !height || !count || count < 1 || count > 5) {
      return NextResponse.json(
        {
          error: "Invalid parameters: prompt, width, height required; count must be 1-5",
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.NANO_BANANA_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Nano Banana API key not configured" },
        { status: 500 }
      );
    }

    const results: GeneratedBanner[] = [];

    for (let i = 0; i < count; i++) {
      const variationLabel = VARIATION_LABELS[i] || `Variation ${i + 1}`;
      const variationPrompt = `${prompt} Variation ${variationLabel}.`;

      try {
        // Build parts array: text prompt + optional reference images
        const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

        // Add reference images first so the model sees them before the prompt
        if (referenceImages && referenceImages.length > 0) {
          for (const refImg of referenceImages) {
            // Reference images come as data URIs: "data:image/png;base64,..."
            const match = refImg.match(/^data:(image\/[^;]+);base64,(.+)$/);
            if (match) {
              parts.push({
                inlineData: {
                  mimeType: match[1],
                  data: match[2],
                },
              });
            }
          }
        }

        parts.push({ text: variationPrompt });

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  parts,
                },
              ],
              generationConfig: {
                responseModalities: ["TEXT", "IMAGE"],
              },
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.text();
          console.error(
            `Nano Banana API error for variation ${variationLabel}:`,
            errorData
          );
          continue;
        }

        const data = await response.json();
        const candidates = data.candidates || [];

        if (candidates.length === 0) {
          console.error(`No candidates returned for variation ${variationLabel}`);
          continue;
        }

        const responseParts = candidates[0]?.content?.parts || [];
        let imageUrl: string | null = null;

        for (const rp of responseParts) {
          if (rp.inlineData?.mimeType?.startsWith("image/")) {
            const base64Data = rp.inlineData.data;
            const mimeType = rp.inlineData.mimeType;
            imageUrl = `data:${mimeType};base64,${base64Data}`;
            break;
          }
        }

        if (!imageUrl) {
          console.error(
            `No image data found in response for variation ${variationLabel}`
          );
          continue;
        }

        results.push({
          id: `banner-${Date.now()}-${i}`,
          imageUrl,
          variationLabel,
          prompt: variationPrompt,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error(
          `Error generating variation ${variationLabel}:`,
          errorMessage
        );
        continue;
      }
    }

    if (results.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate any banner variations" },
        { status: 500 }
      );
    }

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}
