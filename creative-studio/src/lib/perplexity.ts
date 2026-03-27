// --- Structured Brand Sentiment ---
export interface BrandSentimentItem {
  observation: string;
  polarity: number; // -1.0 to +1.0
  confidence: "high" | "medium" | "low";
  platform: string;
  recency: string;
  sampleSize: string;
}

// --- Competitor Analysis ---
export interface CompetitorInsight {
  name: string;
  sentimentScore: number; // -1.0 to +1.0
  giveawayStrategy: string;
  audienceOverlap: string;
  differentiator: string;
}

// --- Giveaway Trust ---
export interface GiveawayTrust {
  trustScore: number; // 0-100
  skepticismSignals: string[];
  trustBuilders: string[];
  recommendedApproach: string;
}

// --- Prize Recommendations ---
export interface PrizeRecommendation {
  prize: string;
  relevanceScore: number;
  rationale: string;
  estimatedCost?: string;
  source?: string;
  sourceUrl?: string;
  winRate?: string; // e.g. "1 in 5"
  fulfillmentMethod?: string; // e.g. "digital code", "physical", "in-app credit"
  urgencyFactor?: string; // e.g. "seasonal", "trending", "evergreen"
  audienceMatch?: number; // 0-1
}

export interface CopySuggestion {
  headline: string;
  cta: string;
  context: string;
}

export interface TrendingMediaItem {
  platform: string;
  topic: string;
  description: string;
  engagement: string;
  velocity?: "rising" | "peaking" | "declining" | "stable";
}

export interface TopicSentiment {
  topic: string;
  positive: number;
  negative: number;
  neutral: number;
  sampleQuotes: Array<{
    text: string;
    source: string;
    sentiment: "positive" | "negative" | "neutral";
  }>;
}

export interface SentimentSummary {
  positive: number;
  negative: number;
  neutral: number;
  topicBreakdown: TopicSentiment[];
  keyTakeaway: string;
}

export interface Source {
  title: string;
  url: string;
  platform: string;
}

export interface InspirationImage {
  url: string;
  description: string;
  source: string;
}

export interface RelevantWebsite {
  name: string;
  url: string;
  description: string;
  type: string; // e.g. "competitor", "industry blog", "community", "news", "marketplace"
}

export interface ResearchReport {
  brandSentiment: BrandSentimentItem[];
  trendingTopics: string[];
  trendingMedia: TrendingMediaItem[];
  prizeRecommendations: PrizeRecommendation[];
  copySuggestions: CopySuggestion[];
  sentimentSummary: SentimentSummary;
  sources: Source[];
  inspirationImages?: InspirationImage[];
  relevantWebsites?: RelevantWebsite[];
  competitorAnalysis?: CompetitorInsight[];
  giveawayTrust?: GiveawayTrust;
  // Backward compat: old reports may have painPoints instead of brandSentiment
  painPoints?: string[];
}

export interface CampaignBrief {
  campaignGoal: string;
  productDescription: string;
  competitors?: string;
  researchQuestions?: string;
  giveaway?: string;
}

export interface ResearchParams {
  brandName: string;
  product: string;
  targetAudience: string;
  industry: string;
  brief?: CampaignBrief;
}

export async function runAudienceResearch(
  params: ResearchParams
): Promise<ResearchReport> {
  const response = await fetch("/api/research", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(
      `Research API failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}
