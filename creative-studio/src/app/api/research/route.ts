import { NextRequest, NextResponse } from "next/server";
import type {
  ResearchReport,
  ResearchParams,
  BrandSentimentItem,
} from "@/lib/perplexity";

// --- Retry helper with exponential backoff ---
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  delays = [1000, 2000, 4000]
): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const response = await fetch(url, options);
    if (response.ok) return response;

    // Don't retry on client errors (4xx), only server/network errors
    if (response.status >= 400 && response.status < 500) {
      return response;
    }

    if (attempt < retries - 1) {
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
    } else {
      return response; // Return last failed response
    }
  }
  // Fallback (shouldn't reach here)
  return fetch(url, options);
}

// --- Validation helpers ---
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeSentimentPercentages(summary: {
  positive: number;
  negative: number;
  neutral: number;
}): { positive: number; negative: number; neutral: number } {
  const total = summary.positive + summary.negative + summary.neutral;
  if (total === 0) return { positive: 33, negative: 33, neutral: 34 };
  if (Math.abs(total - 100) < 0.5) return summary; // Close enough
  // Normalize to 100
  const factor = 100 / total;
  return {
    positive: Math.round(summary.positive * factor),
    negative: Math.round(summary.negative * factor),
    neutral: Math.round(summary.neutral * factor),
  };
}

function convertLegacyBrandSentiment(
  raw: unknown
): BrandSentimentItem[] {
  if (!Array.isArray(raw)) return [];

  return raw.map((item) => {
    // Already structured
    if (typeof item === "object" && item !== null && "observation" in item) {
      const obj = item as Record<string, unknown>;
      return {
        observation: String(obj.observation || ""),
        polarity: clamp(Number(obj.polarity) || 0, -1, 1),
        confidence: (["high", "medium", "low"].includes(String(obj.confidence))
          ? String(obj.confidence)
          : "low") as "high" | "medium" | "low",
        platform: String(obj.platform || "unknown"),
        recency: String(obj.recency || "unknown"),
        sampleSize: String(obj.sampleSize || "unknown"),
      };
    }
    // Legacy flat string format
    return {
      observation: String(item),
      polarity: 0,
      confidence: "low" as const,
      platform: "unknown",
      recency: "unknown",
      sampleSize: "unknown",
    };
  });
}

function validateReport(report: ResearchReport): ResearchReport {
  // 1. Normalize sentiment percentages
  if (report.sentimentSummary) {
    const normalized = normalizeSentimentPercentages(report.sentimentSummary);
    report.sentimentSummary.positive = normalized.positive;
    report.sentimentSummary.negative = normalized.negative;
    report.sentimentSummary.neutral = normalized.neutral;
  }

  // 2. Clamp polarity scores on brandSentiment
  if (Array.isArray(report.brandSentiment)) {
    report.brandSentiment = report.brandSentiment.map((item) => ({
      ...item,
      polarity: clamp(item.polarity, -1, 1),
    }));
  }

  // 3. Clamp competitor sentiment scores
  if (Array.isArray(report.competitorAnalysis)) {
    report.competitorAnalysis = report.competitorAnalysis.map((c) => ({
      ...c,
      sentimentScore: clamp(c.sentimentScore, -1, 1),
    }));
  }

  // 4. Clamp giveaway trust score
  if (report.giveawayTrust) {
    report.giveawayTrust.trustScore = clamp(report.giveawayTrust.trustScore, 0, 100);
  }

  // 5. Clamp prize audienceMatch
  if (Array.isArray(report.prizeRecommendations)) {
    report.prizeRecommendations = report.prizeRecommendations.map((p) => ({
      ...p,
      audienceMatch: p.audienceMatch != null ? clamp(p.audienceMatch, 0, 1) : undefined,
    }));
  }

  // 6. Validate velocity values on trendingMedia
  const validVelocities = ["rising", "peaking", "declining", "stable"];
  if (Array.isArray(report.trendingMedia)) {
    report.trendingMedia = report.trendingMedia.map((m) => ({
      ...m,
      velocity: m.velocity && validVelocities.includes(m.velocity)
        ? m.velocity
        : undefined,
    }));
  }

  return report;
}

export async function POST(request: NextRequest) {
  try {
    const body: ResearchParams = await request.json();
    const { brandName, product, targetAudience, industry, brief } = body;

    if (!brandName || !product || !targetAudience || !industry) {
      return NextResponse.json(
        {
          error: "Missing required fields: brandName, product, targetAudience, industry",
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Perplexity API key not configured" },
        { status: 500 }
      );
    }

    // Extract giveaway info from brief if available
    const giveawayInfo = brief?.giveaway || "";

    const systemPrompt = `You are a social media research expert analyzing trending content across platforms (Reddit, YouTube, TikTok, X/Twitter, Instagram) to provide comprehensive insights for scratch-to-win mobile ad campaigns. Your task is to return structured JSON data with the following format:
{
  "brandSentiment": [
    {
      "observation": "string (what people are saying about the brand or its giveaways)",
      "polarity": number (-1.0 to +1.0, negative to positive),
      "confidence": "high|medium|low",
      "platform": "string (reddit, tiktok, youtube, twitter, instagram, or general)",
      "recency": "string (e.g. 'last 7 days', 'last month', 'last 3 months')",
      "sampleSize": "string (e.g. '50+ posts', '2.3K mentions', '100+ comments')"
    }
  ],
  "trendingTopics": ["string (trending social media topics, hashtags, memes, and discussions relevant to this audience and industry)"],
  "trendingMedia": [
    {
      "platform": "string",
      "topic": "string",
      "description": "string",
      "engagement": "string (e.g. 2.3M views, 15K comments)",
      "velocity": "rising|peaking|declining|stable"
    }
  ],
  "prizeRecommendations": [
    {
      "prize": "string (be VERY specific: name exact products, dollar amounts, brand names, e.g. '$10 Starbucks Gift Card')",
      "relevanceScore": number (0-1),
      "rationale": "string (explain WHY this prize works for THIS audience using real data or trends)",
      "estimatedCost": "string (cost per unit to advertiser, e.g. '$5-10', 'Free / digital')",
      "source": "string (where you found evidence this prize works)",
      "sourceUrl": "string (URL to the source, empty string if not available)",
      "winRate": "string (suggested frequency, e.g. '1 in 5', '1 in 10', '1 in 50')",
      "fulfillmentMethod": "string (how to deliver: 'digital code', 'physical shipment', 'in-app credit', 'email delivery')",
      "urgencyFactor": "string ('seasonal', 'trending', 'evergreen', 'limited-time')",
      "audienceMatch": number (0-1, how well this prize matches the specific target audience)
    }
  ],
  "copySuggestions": [
    {
      "headline": "string (must reference scratch-off / scratch card / scratch-to-win experience)",
      "cta": "string (action-oriented, tied to the scratch interaction)",
      "context": "string (why this copy works for a scratch-off ad format)"
    }
  ],
  "sentimentSummary": {
    "positive": number (percentage, 0-100),
    "negative": number (percentage, 0-100),
    "neutral": number (percentage, 0-100),
    "topicBreakdown": [
      {
        "topic": "string",
        "positive": number (percentage),
        "negative": number (percentage),
        "neutral": number (percentage),
        "sampleQuotes": [
          {"text": "string (actual quote from social media)", "source": "string (subreddit, channel, or platform)", "sentiment": "positive|negative|neutral"}
        ]
      }
    ],
    "keyTakeaway": "string (one sentence summary of overall audience sentiment)"
  },
  "competitorAnalysis": [
    {
      "name": "string (competitor brand name)",
      "sentimentScore": number (-1.0 to +1.0),
      "giveawayStrategy": "string (their recent promo/giveaway approach)",
      "audienceOverlap": "string (how much their audience overlaps, e.g. 'high', 'moderate', 'low')",
      "differentiator": "string (what sets them apart, good or bad)"
    }
  ],
  "giveawayTrust": {
    "trustScore": number (0-100, how trusting this audience is of giveaway offers),
    "skepticismSignals": ["string (red flags found, e.g. 'high spam association', 'data harvesting concerns')"],
    "trustBuilders": ["string (what builds trust, e.g. 'transparent rules', 'brand reputation', 'social proof')"],
    "recommendedApproach": "string (how to frame the giveaway for maximum trust)"
  },
  "sources": [{"title": "string", "url": "string", "platform": "reddit|youtube|tiktok|twitter|instagram"}],
  "inspirationImages": [{"url": "string (direct URL to a relevant image)", "description": "string", "source": "string"}],
  "relevantWebsites": [{"name": "string", "url": "string", "description": "string", "type": "string (competitor|industry blog|community|news|marketplace|tool|reference)"}]
}

IMPORTANT: The positive, negative, and neutral percentages in sentimentSummary MUST sum to exactly 100. All polarity scores must be between -1.0 and +1.0. All relevanceScore and audienceMatch values must be between 0 and 1.

Focus on:
1. Brand & giveaway sentiment: Provide scored observations with polarity, confidence, platform source, recency, and approximate sample size. How people feel about the brand online, and what kind of prizes/giveaways generate excitement vs. skepticism in this space
2. Trending social media content: What's trending RIGHT NOW that this audience cares about? Include velocity indicators (rising, peaking, declining, stable) for each item
3. Prize/incentive optimization: Recommend VERY SPECIFIC prizes with exact products, brands, dollar amounts. Include win-rate suggestions, fulfillment methods, urgency factors, and audience match scores
4. Copy that converts: Headlines and CTAs specifically designed for scratch-to-win / scratch-off ticket style mobile ads
5. Competitor analysis: Identify 2-3 direct competitors, compare sentiment, giveaway strategies, and audience overlap
6. Giveaway trust: Assess audience skepticism toward prize promotions and recommend trust-building approaches
7. Provide real quotes and specific examples with engagement metrics where possible
8. Inspiration images: Find real image URLs that could inspire banner design (at least 4-6)
9. Relevant websites: List 5-8 useful websites for the campaign`;

    // Build a context-rich user prompt using the campaign brief if available
    let briefContext = "";
    if (brief) {
      const parts: string[] = [];
      if (brief.campaignGoal) parts.push(`Campaign Goal: ${brief.campaignGoal}`);
      if (brief.productDescription) parts.push(`Product/Service Description: ${brief.productDescription}`);
      if (brief.competitors) parts.push(`Key Competitors: ${brief.competitors}`);
      if (brief.researchQuestions) parts.push(`Specific Research Questions: ${brief.researchQuestions}`);
      if (parts.length > 0) {
        briefContext = `\n\nAdditional Campaign Context:\n${parts.join("\n")}`;
      }
    }

    const giveawayContext = giveawayInfo
      ? `\nPlanned Giveaway/Prize: ${giveawayInfo}. Analyze sentiment around this type of prize and suggest improvements.`
      : "\nNo specific giveaway decided yet. Suggest prizes that would resonate most with this audience.";

    const userPrompt = `Analyze social media platforms (Reddit, YouTube, TikTok, X/Twitter, Instagram) to research the target audience for a scratch-to-win mobile ad campaign:

Brand: ${brandName}
Product: ${product}
Target Audience: ${targetAudience}
Industry: ${industry}${giveawayContext}${briefContext}

Provide a comprehensive report covering:
1. Brand & giveaway sentiment: How does this audience feel about the brand? What are people saying about similar prizes/giveaways? Provide at least 5 scored observations, each with a polarity score (-1 to +1), confidence level, platform source, recency, and approximate sample size.
2. Trending social media content: What's trending RIGHT NOW that this audience cares about? Include specific posts, hashtags, challenges, memes with engagement metrics (at least 5 trending items). For each item, indicate its velocity: is it rising, peaking, declining, or stable?
3. Prize recommendations: Suggest at least 5 HIGHLY SPECIFIC prizes tailored to "${brandName}" in the ${industry} industry targeting ${targetAudience}. Each prize must name exact products, brands, or dollar amounts. Include win-rate suggestions (e.g. "1 in 5"), fulfillment method (digital code, physical, etc.), urgency factor (seasonal, trending, evergreen), and audience match score (0-1).
4. Copy and messaging suggestions specifically for scratch-to-win / scratch-off ticket style mobile ads (at least 3 headline/CTA pairs)
5. Detailed sentiment analysis broken down by topic, with real quotes from social media. Percentages must sum to 100.
6. Competitor benchmarking: Identify 2-3 direct competitors of "${brandName}" in the ${industry} space. Compare how their audience perceives them vs. "${brandName}". What giveaway or promotional strategies have competitors used recently? Include competitor names, sentiment scores (-1 to +1), audience overlap, and differentiators.
7. Giveaway trust assessment: Detect any giveaway fatigue or skepticism in this audience. Are there discussions about brands using prizes as clickbait, data harvesting, or bait-and-switch tactics? Provide a trust score (0-100), list skepticism signals, list trust builders, and recommend how to frame the giveaway for maximum trust.
8. Key sources with URLs
9. Inspiration images: Find at least 4-6 real image URLs that could inspire the banner creative
10. Relevant websites: List 5-8 websites useful for the campaign

Return only valid JSON in the exact format specified.`;

    // --- Call Perplexity with retry ---
    const response = await fetchWithRetry(
      "https://api.perplexity.ai/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "sonar",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      },
      3,
      [1000, 2000, 4000]
    );

    if (!response.ok) {
      const errorData = await response.text();
      return NextResponse.json(
        { error: `Perplexity API error after 3 attempts: ${response.statusText}`, details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "No content returned from Perplexity API" },
        { status: 500 }
      );
    }

    let parsedReport: ResearchReport;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return NextResponse.json(
          { error: "No valid JSON found in Perplexity response" },
          { status: 500 }
        );
      }
      parsedReport = JSON.parse(jsonMatch[0]);

      // --- Backward compatibility ---

      // Ensure sentimentSummary structure
      if (!parsedReport.sentimentSummary?.topicBreakdown) {
        parsedReport.sentimentSummary = parsedReport.sentimentSummary || { positive: 0, negative: 0, neutral: 0, topicBreakdown: [], keyTakeaway: "" };
        parsedReport.sentimentSummary.topicBreakdown = [];
      }
      if (!parsedReport.sentimentSummary.keyTakeaway) {
        parsedReport.sentimentSummary.keyTakeaway = "";
      }

      // Map old painPoints to brandSentiment
      if (!parsedReport.brandSentiment && (parsedReport as any).painPoints) {
        (parsedReport as any).brandSentiment = (parsedReport as any).painPoints;
      }

      // Convert brandSentiment: handle both string[] (legacy) and object[] (new)
      parsedReport.brandSentiment = convertLegacyBrandSentiment(
        parsedReport.brandSentiment || []
      );

      // Ensure arrays exist
      if (!parsedReport.trendingMedia) parsedReport.trendingMedia = [];
      if (!parsedReport.inspirationImages) parsedReport.inspirationImages = [];
      if (!parsedReport.relevantWebsites) parsedReport.relevantWebsites = [];
      if (!parsedReport.competitorAnalysis) parsedReport.competitorAnalysis = [];
      if (!parsedReport.prizeRecommendations) parsedReport.prizeRecommendations = [];
      if (!parsedReport.trendingTopics) parsedReport.trendingTopics = [];
      if (!parsedReport.copySuggestions) parsedReport.copySuggestions = [];
      if (!parsedReport.sources) parsedReport.sources = [];

      // Ensure giveawayTrust structure
      if (!parsedReport.giveawayTrust) {
        parsedReport.giveawayTrust = {
          trustScore: 50,
          skepticismSignals: [],
          trustBuilders: [],
          recommendedApproach: "",
        };
      }

      // --- Validate and clamp values ---
      parsedReport = validateReport(parsedReport);

    } catch (parseError) {
      return NextResponse.json(
        { error: "Failed to parse Perplexity response as JSON", details: content },
        { status: 500 }
      );
    }

    return NextResponse.json(parsedReport, { status: 200 });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}
