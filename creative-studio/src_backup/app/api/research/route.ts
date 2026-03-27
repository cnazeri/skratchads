import { NextRequest, NextResponse } from "next/server";
import type {
  ResearchReport,
  ResearchParams,
} from "@/lib/perplexity";

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
  "brandSentiment": ["string (observations about how people feel about the brand and/or its giveaway/prizes online)"],
  "trendingTopics": ["string (trending social media topics, hashtags, memes, and discussions relevant to this audience and industry)"],
  "trendingMedia": [{"platform": "string", "topic": "string", "description": "string", "engagement": "string (e.g. 2.3M views, 15K comments)"}],
  "prizeRecommendations": [{"prize": "string (be VERY specific: name exact products, dollar amounts, brand names, and redemption details, e.g. '$10 Starbucks Gift Card' not 'Gift Card')", "relevanceScore": number (0-1), "rationale": "string (explain WHY this specific prize works for THIS campaign's audience, industry, and goal, referencing real data or trends)", "estimatedCost": "string (estimated cost per unit to the advertiser, e.g. '$5-10', 'Free / digital', '$0.50-1.00')", "source": "string (where you found evidence this type of prize works, e.g. a study, article, or real campaign example)", "sourceUrl": "string (URL to the source if available, empty string if not)"}],
  "copySuggestions": [{"headline": "string", "cta": "string", "context": "string"}],
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
  "sources": [{"title": "string", "url": "string", "platform": "reddit|youtube|tiktok|twitter|instagram"}],
  "inspirationImages": [{"url": "string (direct URL to a relevant image, ad creative, or visual reference)", "description": "string (what the image shows and why it is relevant)", "source": "string (where the image was found)"}],
  "relevantWebsites": [{"name": "string", "url": "string", "description": "string (why this site is useful for the campaign)", "type": "string (competitor|industry blog|community|news|marketplace|tool|reference)"}]
}

Focus on:
1. Brand & giveaway sentiment: How people feel about the brand online, and what kind of prizes/giveaways generate excitement vs. skepticism in this space
2. Trending social media content: Viral posts, hashtags, memes, challenges, and discussions that this audience is engaging with RIGHT NOW
3. Prize/incentive optimization: Recommend VERY SPECIFIC prizes tailored to this exact campaign. Name real products, brands, dollar amounts, and redemption mechanics. For example, instead of "Gift Card" say "$15 Amazon Gift Card" or "Free month of Spotify Premium". Reference real campaigns, studies, or data showing why each prize works for this audience. Include estimated cost per unit for the advertiser.
4. Copy that converts: Headlines and CTAs tuned to current social media language and trends
5. Provide real quotes and specific examples with engagement metrics where possible
6. Inspiration images: Find real image URLs (product photos, ad creatives, campaign visuals, social posts with images) that could inspire the banner design. Provide at least 4-6 image URLs.
7. Relevant websites: List websites that would be useful for the advertiser (competitor sites, industry blogs, communities, marketplaces, tools). Provide at least 5-8 websites.`;

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
1. Brand & giveaway sentiment: How does this audience feel about the brand? What are people saying about similar prizes/giveaways? (at least 5 observations)
2. Trending social media content: What's trending RIGHT NOW that this audience cares about? Include specific posts, hashtags, challenges, memes with engagement metrics (at least 5 trending items with platform and engagement data)
3. Prize recommendations: Suggest at least 5 HIGHLY SPECIFIC prizes tailored to "${brandName}" in the ${industry} industry targeting ${targetAudience}. Each prize must name exact products, brands, or dollar amounts (e.g. "$10 DoorDash credit", "Free pair of Nike Dunk Lows", "1-year Spotify Premium subscription"). Explain why each prize resonates with THIS specific audience using real data, campaign examples, or studies. Include estimated advertiser cost per unit and cite your sources with URLs.
4. Copy and messaging suggestions that use current social media language and trends (at least 3 headline/CTA pairs)
5. Detailed sentiment analysis broken down by topic, with real quotes from social media
6. Key sources with URLs
7. Inspiration images: Find at least 4-6 real, publicly accessible image URLs that could inspire the banner creative (product shots, competitor ads, relevant social media visuals, campaign imagery). Use direct image URLs ending in .jpg, .png, .webp, or from image hosting platforms.
8. Relevant websites: List 5-8 websites useful for the campaign (competitor sites, industry blogs, forums, communities, tools, marketplaces, news sites)

Return only valid JSON in the exact format specified.`;

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
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
    });

    if (!response.ok) {
      const errorData = await response.text();
      return NextResponse.json(
        { error: `Perplexity API error: ${response.statusText}`, details: errorData },
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

      // Ensure backward compatibility
      if (!parsedReport.sentimentSummary?.topicBreakdown) {
        parsedReport.sentimentSummary = parsedReport.sentimentSummary || { positive: 0, negative: 0, neutral: 0, topicBreakdown: [], keyTakeaway: "" };
        parsedReport.sentimentSummary.topicBreakdown = [];
      }
      if (!parsedReport.sentimentSummary.keyTakeaway) {
        parsedReport.sentimentSummary.keyTakeaway = "";
      }
      // Map old painPoints to brandSentiment for backward compat
      if (!parsedReport.brandSentiment && (parsedReport as any).painPoints) {
        parsedReport.brandSentiment = (parsedReport as any).painPoints;
      }
      if (!parsedReport.brandSentiment) {
        parsedReport.brandSentiment = [];
      }
      if (!parsedReport.trendingMedia) {
        parsedReport.trendingMedia = [];
      }
      if (!parsedReport.inspirationImages) {
        parsedReport.inspirationImages = [];
      }
      if (!parsedReport.relevantWebsites) {
        parsedReport.relevantWebsites = [];
      }
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
