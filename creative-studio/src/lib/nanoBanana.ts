export interface GeneratedBanner {
  id: string;
  imageUrl: string;
  variationLabel: string;
  prompt: string;
}

export interface BannerGenerationParams {
  prompt: string;
  width: number;
  height: number;
  count: number;
  referenceImages?: string[];
}

export async function generateBannerVariations(
  params: BannerGenerationParams
): Promise<GeneratedBanner[]> {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(
      `Banner generation API failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}
