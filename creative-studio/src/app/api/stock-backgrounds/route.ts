import { NextRequest, NextResponse } from "next/server";

const CATEGORIES: Record<string, string> = {
  abstract:
    "Create a vibrant abstract background with smooth gradients and geometric shapes. Modern, clean, suitable for a mobile ad banner. No text.",
  tech:
    "Create a sleek technology-themed background with circuit patterns, subtle glowing nodes, and dark blue tones. No text. Suitable for a mobile ad banner.",
  food:
    "Create an appetizing food-themed background with warm colors, soft bokeh, and a clean feel. No text. Suitable for a mobile ad banner.",
  fashion:
    "Create a stylish fashion-themed background with elegant textures, soft pastels or bold contrasts. No text. Suitable for a mobile ad banner.",
  nature:
    "Create a fresh nature-themed background with greenery, sunlight, and organic textures. No text. Suitable for a mobile ad banner.",
  sports:
    "Create an energetic sports-themed background with dynamic motion lines, bold colors. No text. Suitable for a mobile ad banner.",
  gaming:
    "Create a vibrant gaming-themed background with neon accents, dark tones, and futuristic elements. No text. Suitable for a mobile ad banner.",
  holiday:
    "Create a festive holiday-themed background with warm tones, subtle sparkles, and celebratory feel. No text. Suitable for a mobile ad banner.",
  finance:
    "Create a professional finance-themed background with clean blues, subtle chart patterns, and corporate feel. No text. Suitable for a mobile ad banner.",
  health:
    "Create a clean health and wellness background with soft greens and blues, organic shapes. No text. Suitable for a mobile ad banner.",
};

export async function POST(request: NextRequest) {
  try {
    const { category, width, height } = await request.json();

    if (!category || !CATEGORIES[category]) {
      return NextResponse.json(
        { error: "Invalid category", available: Object.keys(CATEGORIES) },
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

    const prompt = `${CATEGORIES[category]} Dimensions: ${width || 300}x${height || 250} pixels.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Stock background API error:", errorData);
      return NextResponse.json(
        { error: "Failed to generate background" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    let imageUrl: string | null = null;

    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith("image/")) {
        imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) {
      return NextResponse.json(
        { error: "No image generated" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { imageUrl, category },
      { status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: msg },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    categories: [
      { id: "abstract", label: "Abstract" },
      { id: "tech", label: "Tech" },
      { id: "food", label: "Food & Drink" },
      { id: "fashion", label: "Fashion" },
      { id: "nature", label: "Nature" },
      { id: "sports", label: "Sports" },
      { id: "gaming", label: "Gaming" },
      { id: "holiday", label: "Holiday" },
      { id: "finance", label: "Finance" },
      { id: "health", label: "Health" },
    ],
  });
}
