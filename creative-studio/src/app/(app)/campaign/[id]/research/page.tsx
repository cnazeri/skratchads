"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Campaign } from "@/types";

interface TopicSentiment {
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

interface BrandSentimentItem {
  observation: string;
  polarity: number;
  confidence: "high" | "medium" | "low";
  platform: string;
  recency: string;
  sampleSize: string;
}

interface CompetitorInsight {
  name: string;
  sentimentScore: number;
  giveawayStrategy: string;
  audienceOverlap: string;
  differentiator: string;
}

interface GiveawayTrust {
  trustScore: number;
  skepticismSignals: string[];
  trustBuilders: string[];
  recommendedApproach: string;
}

interface TrendingMediaItem {
  platform: string;
  topic: string;
  description: string;
  engagement: string;
  velocity?: "rising" | "peaking" | "declining" | "stable";
}

interface InspirationImage {
  url: string;
  description: string;
  source: string;
}

interface RelevantWebsite {
  name: string;
  url: string;
  description: string;
  type: string;
}

interface ResearchResult {
  brandSentiment?: BrandSentimentItem[] | string[];
  painPoints?: string[]; // backward compat
  trendingTopics: string[];
  trendingMedia?: TrendingMediaItem[];
  prizeRecommendations: Array<{
    prize: string;
    relevanceScore: number;
    rationale: string;
    estimatedCost?: string;
    source?: string;
    sourceUrl?: string;
    winRate?: string;
    fulfillmentMethod?: string;
    urgencyFactor?: string;
    audienceMatch?: number;
  }>;
  copySuggestions: Array<{
    headline: string;
    cta: string;
  }>;
  sentimentSummary: {
    positive: number;
    negative: number;
    neutral: number;
    topicBreakdown?: TopicSentiment[];
    keyTakeaway?: string;
  };
  sources: Array<{
    title: string;
    url: string;
    platform?: string;
  }>;
  inspirationImages?: InspirationImage[];
  relevantWebsites?: RelevantWebsite[];
  competitorAnalysis?: CompetitorInsight[];
  giveawayTrust?: GiveawayTrust;
}

interface SelectedInsights {
  brandSentiment: number[];
  trendingTopics: number[];
  prizeRecommendations: number[];
  copySuggestions: number[];
}

export default function ResearchPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [research, setResearch] = useState<ResearchResult | null>(null);
  const [researchLoading, setResearchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInsights, setSelectedInsights] = useState<SelectedInsights>({
    brandSentiment: [],
    trendingTopics: [],
    prizeRecommendations: [],
    copySuggestions: [],
  });
  const [saving, setSaving] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [savingResearch, setSavingResearch] = useState(false);
  const [researchSaved, setResearchSaved] = useState(false);
  const [researchName, setResearchName] = useState("");
  const [showSaveResearch, setShowSaveResearch] = useState(false);
  const [expandedTopics, setExpandedTopics] = useState<number[]>([]);

  useEffect(() => {
    fetchCampaign();
  }, [campaignId]);

  // Helper: normalize brandSentiment to structured items (handles legacy string[] and new object[] format)
  const getNormalizedSentiment = (r: ResearchResult): BrandSentimentItem[] => {
    const raw = r.brandSentiment || r.painPoints || [];
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => {
      if (typeof item === "object" && item !== null && "observation" in item) {
        return item as BrandSentimentItem;
      }
      return {
        observation: String(item),
        polarity: 0,
        confidence: "low" as const,
        platform: "unknown",
        recency: "unknown",
        sampleSize: "unknown",
      };
    });
  };

  // For backward compat: get display strings from sentiment items
  const getSentimentItems = (r: ResearchResult): string[] => {
    return getNormalizedSentiment(r).map((s) => s.observation);
  };

  const fetchCampaign = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();

      if (fetchError) throw fetchError;

      setCampaign(data);

      if (!data.research_data) {
        runResearch(data);
      } else {
        const parsed = JSON.parse(data.research_data);
        setResearch(parsed);
        setResearchLoading(false);
      }
    } catch (err) {
      console.error("Failed to fetch campaign:", err);
      setError("Failed to load campaign");
      setResearchLoading(false);
    }
  };

  const runResearch = async (campaignData: Record<string, unknown>) => {
    setResearchLoading(true);
    setError(null);

    try {
      // Parse campaign brief if available
      let brief;
      if (campaignData.campaign_brief) {
        try {
          brief = typeof campaignData.campaign_brief === "string"
            ? JSON.parse(campaignData.campaign_brief as string)
            : campaignData.campaign_brief;
        } catch {
          brief = undefined;
        }
      }

      // giveaway is now stored inside campaign_brief, no separate column needed

      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: campaignData.brand_name,
          product: campaignData.name,
          targetAudience: campaignData.target_audience,
          industry: campaignData.industry,
          brief,
        }),
      });

      if (!response.ok) throw new Error("Research request failed");

      const data = await response.json();
      setResearch(data);

      await supabase
        .from("campaigns")
        .update({ research_data: JSON.stringify(data), status: "researching" })
        .eq("id", campaignId);
    } catch (err) {
      console.error("Research failed:", err);
      setError("Failed to run research. Please try again.");
    } finally {
      setResearchLoading(false);
    }
  };

  const toggleSentimentItem = (index: number) => {
    setSelectedInsights((prev) => ({
      ...prev,
      brandSentiment: prev.brandSentiment.includes(index)
        ? prev.brandSentiment.filter((i) => i !== index)
        : [...prev.brandSentiment, index],
    }));
  };

  const toggleTrendingTopic = (index: number) => {
    setSelectedInsights((prev) => ({
      ...prev,
      trendingTopics: prev.trendingTopics.includes(index)
        ? prev.trendingTopics.filter((i) => i !== index)
        : [...prev.trendingTopics, index],
    }));
  };

  const togglePrizeRecommendation = (index: number) => {
    setSelectedInsights((prev) => ({
      ...prev,
      prizeRecommendations: prev.prizeRecommendations.includes(index)
        ? prev.prizeRecommendations.filter((i) => i !== index)
        : [...prev.prizeRecommendations, index],
    }));
  };

  const toggleCopySuggestion = (index: number) => {
    setSelectedInsights((prev) => ({
      ...prev,
      copySuggestions: prev.copySuggestions.includes(index)
        ? prev.copySuggestions.filter((i) => i !== index)
        : [...prev.copySuggestions, index],
    }));
  };

  const toggleTopicExpand = (index: number) => {
    setExpandedTopics((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleSaveAndProceed = async () => {
    setSaving(true);
    try {
      const { data: researchData, error: researchError } = await supabase
        .from("research")
        .select("id")
        .eq("campaign_id", campaignId)
        .single();

      if (researchError && researchError.code !== "PGRST116") {
        throw researchError;
      }

      if (researchData) {
        const { error: updateError } = await supabase
          .from("research")
          .update({ selected_insights: selectedInsights })
          .eq("campaign_id", campaignId);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("research")
          .insert({
            campaign_id: campaignId,
            raw_response: JSON.stringify(research),
            structured_report: JSON.stringify(research),
            selected_insights: selectedInsights,
          });

        if (insertError) throw insertError;
      }

      // Save research prompt context for the editor
      const sentimentItems = research ? getSentimentItems(research) : [];
      const selectedSentiment = selectedInsights.brandSentiment.map((i) => sentimentItems[i]).filter(Boolean);
      const selectedTopics = research ? selectedInsights.trendingTopics.map((i) => research.trendingTopics[i]).filter(Boolean) : [];
      const selectedPrizes = research ? selectedInsights.prizeRecommendations.map((i) => research.prizeRecommendations[i]).filter(Boolean) : [];
      const selectedCopy = research ? selectedInsights.copySuggestions.map((i) => research.copySuggestions[i]).filter(Boolean) : [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const campaignAny = campaign as any;
      const brandName = campaignAny?.brand_name || campaignAny?.brandName || campaign?.name || "";
      const industryVal = campaignAny?.industry || "";
      const audience = campaignAny?.target_audience || campaignAny?.targetAudience || "";

      const researchContext = [
        selectedSentiment.length > 0 ? `Brand/giveaway sentiment: ${selectedSentiment.join("; ")}` : "",
        selectedTopics.length > 0 ? `Trending topics: ${selectedTopics.join("; ")}` : "",
        selectedPrizes.length > 0 ? `Prize ideas: ${selectedPrizes.map((p) => p.prize).join(", ")}` : "",
        selectedCopy.length > 0 ? `Copy ideas: ${selectedCopy.map((c) => `"${c.headline}" / "${c.cta}"`).join("; ")}` : "",
      ].filter(Boolean).join(". ");

      await supabase
        .from("campaigns")
        .update({
          research_prompt_context: JSON.stringify({
            brandName,
            industry: industryVal,
            audience,
            researchContext,
            selectedCopy: selectedCopy[0] || null,
            selectedPrize: selectedPrizes[0] || null,
          }),
          status: "creating",
        })
        .eq("id", campaignId);

      router.push(`/campaign/${campaignId}/editor`);
    } catch (err) {
      console.error("Failed to save insights:", err);
      setError("Failed to save insights. Please try again.");
      setSaving(false);
    }
  };

  // One-click: save research + go to editor
  const handleOneClickGenerate = async () => {
    if (!research || !campaign) return;
    setGeneratingAll(true);

    try {
      await handleSaveAndProceed();
    } catch (err) {
      console.error("One-click generation failed:", err);
      setError("Failed. You can still proceed to the editor manually.");
    } finally {
      setGeneratingAll(false);
    }
  };

  // Save research to a reusable library
  const handleSaveResearchToLibrary = async () => {
    if (!research || !researchName.trim()) return;
    setSavingResearch(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("saved_research").insert({
        user_id: user.id,
        name: researchName.trim(),
        campaign_id: campaignId,
        brand_name: (campaign as any)?.brand_name || (campaign as any)?.brandName || "",
        industry: (campaign as any)?.industry || "",
        research_data: JSON.stringify(research),
        selected_insights: selectedInsights,
      });

      setResearchSaved(true);
      setShowSaveResearch(false);
    } catch (err) {
      console.error("Failed to save research:", err);
    } finally {
      setSavingResearch(false);
    }
  };

  const sentimentColor = (sentiment: "positive" | "negative" | "neutral") => {
    switch (sentiment) {
      case "positive": return "border-green-300 bg-green-50";
      case "negative": return "border-red-300 bg-red-50";
      case "neutral": return "border-yellow-300 bg-yellow-50";
    }
  };

  const sentimentDot = (sentiment: "positive" | "negative" | "neutral") => {
    switch (sentiment) {
      case "positive": return "bg-green-500";
      case "negative": return "bg-red-500";
      case "neutral": return "bg-yellow-500";
    }
  };

  const platformColor = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes("reddit")) return "bg-orange-100 text-orange-700";
    if (p.includes("youtube")) return "bg-red-100 text-red-700";
    if (p.includes("tiktok")) return "bg-gray-900 text-white";
    if (p.includes("twitter") || p.includes("x")) return "bg-blue-100 text-blue-700";
    if (p.includes("instagram")) return "bg-pink-100 text-pink-700";
    return "bg-gray-100 text-gray-700";
  };

  const platformSearchUrl = (platform: string, topic: string) => {
    const q = encodeURIComponent(topic.replace(/#/g, ""));
    const p = platform.toLowerCase();
    if (p.includes("reddit")) return `https://www.reddit.com/search/?q=${q}`;
    if (p.includes("youtube")) return `https://www.youtube.com/results?search_query=${q}`;
    if (p.includes("tiktok")) return `https://www.tiktok.com/search?q=${q}`;
    if (p.includes("twitter") || p.includes("x")) return `https://x.com/search?q=${q}`;
    if (p.includes("instagram")) return `https://www.instagram.com/explore/tags/${q.replace(/%20/g, "")}`;
    return `https://www.google.com/search?q=${q}`;
  };

  if (researchLoading || !campaign) {
    return (
      <div className="min-h-[calc(100vh-180px)] bg-slate-100">
        <div className="max-w-[1100px] mx-auto px-8 py-12">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4" />
            <p className="text-gray-700">Scanning social media platforms...</p>
            <p className="text-gray-500 text-sm mt-2">Analyzing Reddit, YouTube, TikTok, X, and Instagram. This usually takes 15-30 seconds.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-180px)] bg-slate-100">
        <div className="max-w-[1100px] mx-auto px-8 py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={() => runResearch(campaign as unknown as Record<string, unknown>)}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const sentimentItems = research ? getSentimentItems(research) : [];
  const normalizedSentiment = research ? getNormalizedSentiment(research) : [];

  return (
    <div className="min-h-[calc(100vh-180px)] bg-slate-100">
      <div className="max-w-[1100px] mx-auto px-8 py-12">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-sm text-blue-500 hover:text-blue-700 mb-2 inline-flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Campaigns
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
              <p className="text-gray-700">{campaign.brandName}</p>
            </div>
            <Link
              href={`/campaign/${campaign.id}/editor`}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Open Editor
            </Link>
          </div>
        </div>

        {research && (
          <div className="space-y-8">
            {/* Brand & Giveaway Sentiment */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-1">
                Brand & Giveaway Sentiment
              </h2>
              <p className="text-sm text-gray-500 mb-3">
                How people feel about the brand and similar prizes/giveaways online
              </p>

              {/* Summary bar */}
              {normalizedSentiment.length > 0 && (() => {
                const positive = normalizedSentiment.filter(s => s.polarity > 0.2).length;
                const negative = normalizedSentiment.filter(s => s.polarity < -0.2).length;
                const neutral = normalizedSentiment.length - positive - negative;
                const avgPolarity = normalizedSentiment.reduce((sum, s) => sum + s.polarity, 0) / normalizedSentiment.length;
                const platforms = [...new Set(normalizedSentiment.map(s => s.platform).filter(p => p !== "unknown"))];
                return (
                  <div className="flex items-center gap-4 mb-4 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-3 h-3 rounded-full ${avgPolarity > 0.2 ? "bg-emerald-400" : avgPolarity < -0.2 ? "bg-red-400" : "bg-amber-400"}`} />
                      <span className="text-sm font-semibold text-gray-700">
                        {avgPolarity > 0.2 ? "Mostly Positive" : avgPolarity < -0.2 ? "Mostly Negative" : "Mixed Sentiment"}
                      </span>
                    </div>
                    <div className="flex gap-3 text-xs text-gray-500">
                      {positive > 0 && <span className="text-emerald-600">{positive} positive</span>}
                      {neutral > 0 && <span>{neutral} neutral</span>}
                      {negative > 0 && <span className="text-red-500">{negative} negative</span>}
                    </div>
                    {platforms.length > 0 && (
                      <span className="ml-auto text-xs text-gray-400">
                        via {platforms.slice(0, 3).join(", ")}
                      </span>
                    )}
                  </div>
                );
              })()}

              <div className="space-y-2.5">
                {normalizedSentiment.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => toggleSentimentItem(idx)}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedInsights.brandSentiment.includes(idx)
                        ? "border-indigo-200 bg-indigo-50/40"
                        : "border-gray-100 hover:border-gray-200 hover:bg-gray-50/50"
                    }`}
                  >
                    {/* Polarity indicator bar */}
                    <div className={`w-1 self-stretch rounded-full shrink-0 ${
                      item.polarity > 0.3 ? "bg-emerald-400" :
                      item.polarity < -0.3 ? "bg-red-400" :
                      "bg-amber-300"
                    }`} />
                    <input
                      type="checkbox"
                      checked={selectedInsights.brandSentiment.includes(idx)}
                      onChange={() => toggleSentimentItem(idx)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5 w-4 h-4 text-indigo-500 rounded cursor-pointer shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 leading-relaxed">{item.observation}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${
                          item.polarity > 0.3 ? "bg-emerald-50 text-emerald-700" :
                          item.polarity < -0.3 ? "bg-red-50 text-red-600" :
                          "bg-gray-50 text-gray-500"
                        }`}>
                          {item.polarity > 0 ? "+" : ""}{item.polarity.toFixed(1)}
                        </span>
                        {item.platform !== "unknown" && (
                          <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-600">
                            {item.platform}
                          </span>
                        )}
                        {item.confidence === "high" && (
                          <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-green-50 text-green-600">
                            high confidence
                          </span>
                        )}
                        {item.recency !== "unknown" && (
                          <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500">
                            {item.recency}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Competitor Analysis */}
            {research.competitorAnalysis && research.competitorAnalysis.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  Competitor Analysis
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  How competitors compare in sentiment and giveaway strategy
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {research.competitorAnalysis.map((comp, idx) => {
                    const score = comp.sentimentScore;
                    const isPositive = score > 0.3;
                    const isNegative = score < -0.3;
                    const barWidth = Math.round(((score + 1) / 2) * 100);
                    return (
                      <div key={idx} className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-gray-900 text-base">{comp.name}</h3>
                          <span className={`text-sm font-bold px-2.5 py-1 rounded-full ${
                            isPositive ? "bg-green-50 text-green-700" :
                            isNegative ? "bg-red-50 text-red-600" :
                            "bg-gray-100 text-gray-600"
                          }`}>
                            {score > 0 ? "+" : ""}{score.toFixed(1)}
                          </span>
                        </div>

                        {/* Sentiment bar */}
                        <div className="mb-3">
                          <div className="w-full bg-gray-100 rounded-full h-2 relative">
                            <div className="absolute top-0 left-1/2 w-px h-2 bg-gray-300" />
                            <div
                              className={`h-2 rounded-full transition-all ${
                                isPositive ? "bg-green-500" : isNegative ? "bg-red-400" : "bg-gray-400"
                              }`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                            <span>Negative</span>
                            <span>Positive</span>
                          </div>
                        </div>

                        {/* Strategy */}
                        <p className="text-sm text-gray-600 mb-3">{comp.giveawayStrategy}</p>

                        {/* Strength / Weakness indicator */}
                        <div className="space-y-1.5 mb-3">
                          {isPositive && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="w-5 h-5 rounded-full bg-red-50 text-red-500 flex items-center justify-center font-bold text-[10px]">!</span>
                              <span className="text-red-600 font-medium">Stronger than your brand here</span>
                            </div>
                          )}
                          {isNegative && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="w-5 h-5 rounded-full bg-green-50 text-green-600 flex items-center justify-center font-bold text-[10px]">&#10003;</span>
                              <span className="text-green-700 font-medium">Your brand is stronger here</span>
                            </div>
                          )}
                          {!isPositive && !isNegative && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-bold text-[10px]">=</span>
                              <span className="text-gray-500 font-medium">Similar positioning</span>
                            </div>
                          )}
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">
                            {comp.audienceOverlap} overlap
                          </span>
                        </div>

                        {/* Differentiator */}
                        <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100 leading-relaxed">{comp.differentiator}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Giveaway Trust Score */}
            {research.giveawayTrust && (() => {
              const ts = research.giveawayTrust.trustScore;
              const gaugeColor = ts >= 70 ? "#22c55e" : ts >= 40 ? "#eab308" : "#ef4444";
              const gaugeLabel = ts >= 70 ? "High Trust" : ts >= 40 ? "Moderate" : "Low Trust";
              const circumference = 2 * Math.PI * 54;
              const dashOffset = circumference - (ts / 100) * circumference;
              return (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  Giveaway Trust Score
                </h2>
                <p className="text-sm text-gray-500 mb-5">
                  How receptive this audience is to prize promotions
                </p>
                <div className="flex flex-col md:flex-row items-center gap-8">
                  {/* Circular SVG Gauge */}
                  <div className="relative flex-shrink-0" style={{ width: 140, height: 140 }}>
                    <svg width="140" height="140" viewBox="0 0 140 140">
                      {/* Background circle */}
                      <circle cx="70" cy="70" r="54" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                      {/* Score arc */}
                      <circle
                        cx="70" cy="70" r="54" fill="none"
                        stroke={gaugeColor}
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        transform="rotate(-90 70 70)"
                        style={{ transition: "stroke-dashoffset 0.6s ease" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold" style={{ color: gaugeColor }}>{ts}</span>
                      <span className="text-xs text-gray-500 font-medium">{gaugeLabel}</span>
                    </div>
                  </div>

                  {/* Signals */}
                  <div className="flex-1 space-y-4">
                    {research.giveawayTrust.skepticismSignals.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1.5">Skepticism Signals</p>
                        <div className="flex flex-wrap gap-2">
                          {research.giveawayTrust.skepticismSignals.map((signal, idx) => (
                            <span key={idx} className="px-2.5 py-1 text-xs font-medium rounded-full bg-red-50 text-red-600 border border-red-100">
                              {signal}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {research.giveawayTrust.trustBuilders.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1.5">Trust Builders</p>
                        <div className="flex flex-wrap gap-2">
                          {research.giveawayTrust.trustBuilders.map((builder, idx) => (
                            <span key={idx} className="px-2.5 py-1 text-xs font-medium rounded-full bg-green-50 text-green-600 border border-green-100">
                              {builder}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {research.giveawayTrust.recommendedApproach && (
                  <div className="mt-5 p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-sm font-semibold text-blue-800">Recommended Approach</p>
                    <p className="text-sm text-blue-700 mt-1 leading-relaxed">{research.giveawayTrust.recommendedApproach}</p>
                  </div>
                )}
              </div>
              );
            })()}

            {/* Trending Topics */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Trending Topics
              </h2>
              <div className="flex flex-wrap gap-2">
                {research.trendingTopics.map((topic, idx) => (
                  <button
                    key={idx}
                    onClick={() => toggleTrendingTopic(idx)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all cursor-pointer ${
                      selectedInsights.trendingTopics.includes(idx)
                        ? "bg-blue-500 text-white border-2 border-blue-600"
                        : "bg-blue-100 text-blue-700 border-2 border-blue-100 hover:border-blue-300"
                    }`}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>

            {/* Trending Social Media */}
            {research.trendingMedia && research.trendingMedia.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  Trending Social Media
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  Viral content and discussions your audience is engaging with right now
                </p>
                <div className="space-y-3">
                  {research.trendingMedia.map((item, idx) => (
                    <a
                      key={idx}
                      href={platformSearchUrl(item.platform, item.topic)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${platformColor(item.platform)}`}>
                              {item.platform}
                            </span>
                            <span className="font-semibold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors">{item.topic}</span>
                            <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          </div>
                          <p className="text-gray-600 text-sm">{item.description}</p>
                        </div>
                        <div className="flex flex-col gap-1 items-end flex-shrink-0">
                          {item.engagement && (
                            <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                              {item.engagement}
                            </span>
                          )}
                          {item.velocity && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              item.velocity === "rising" ? "bg-green-50 text-green-700" :
                              item.velocity === "peaking" ? "bg-yellow-50 text-yellow-700" :
                              item.velocity === "declining" ? "bg-red-50 text-red-600" :
                              "bg-gray-100 text-gray-500"
                            }`}>
                              {item.velocity === "rising" ? "Rising" :
                               item.velocity === "peaking" ? "Peaking" :
                               item.velocity === "declining" ? "Declining" : "Stable"}
                            </span>
                          )}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Inspiration Images */}
            {research.inspirationImages && research.inspirationImages.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  Inspiration Images
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  Visual references and sample imagery relevant to your campaign. Click to view on Google Images.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {research.inspirationImages.map((img, idx) => {
                    const searchQuery = img.description || "ad creative inspiration";
                    const searchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(searchQuery)}`;
                    // Try to render any http(s) URL as an image. The onError
                    // handler hides it and reveals the fallback if it fails.
                    const hasUrl = img.url && /^https?:\/\//i.test(img.url);
                    const gradients = [
                      "from-indigo-100 to-blue-50",
                      "from-purple-100 to-pink-50",
                      "from-emerald-100 to-teal-50",
                      "from-amber-100 to-orange-50",
                      "from-rose-100 to-red-50",
                      "from-cyan-100 to-sky-50",
                    ];
                    const gradient = gradients[idx % gradients.length];

                    return (
                      <a
                        key={idx}
                        href={hasUrl ? img.url : searchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group border border-gray-200 rounded-lg overflow-hidden hover:border-indigo-300 hover:shadow-md transition-all"
                      >
                        <div className={`aspect-video bg-gradient-to-br ${gradient} relative overflow-hidden`}>
                          {hasUrl ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={img.url}
                                alt={img.description}
                                className="w-full h-full object-cover relative z-10"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = "none";
                                }}
                              />
                              {/* Fallback behind the image (shows if img fails to load) */}
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 z-0 p-3">
                                <svg className="w-8 h-8 mb-1 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <span className="text-xs font-medium text-center line-clamp-2">{img.description}</span>
                                <span className="text-[10px] text-gray-400 mt-1">Click to view</span>
                              </div>
                            </>
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                              <svg className="w-10 h-10 mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                              <p className="text-xs font-semibold text-gray-500 line-clamp-3 leading-relaxed">{img.description}</p>
                              <span className="text-[10px] text-gray-400 mt-1.5 group-hover:text-indigo-500 transition-colors">Click to search images</span>
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="text-sm text-gray-700 line-clamp-2 group-hover:text-indigo-600 transition-colors">{img.description}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <p className="text-xs text-gray-400">{img.source}</p>
                            <svg className="w-3 h-3 text-gray-400 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Relevant Websites & Collateral */}
            {research.relevantWebsites && research.relevantWebsites.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  Relevant Websites & Collateral
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  Useful sites for research, competitive analysis, and campaign inspiration
                </p>
                <div className="space-y-3">
                  {research.relevantWebsites.map((site, idx) => {
                    // Validate URL: must start with http:// or https://
                    const isValidUrl = site.url && /^https?:\/\/.+/i.test(site.url);
                    const href = isValidUrl ? site.url : `https://www.google.com/search?q=${encodeURIComponent(site.name)}`;
                    const displayUrl = isValidUrl ? site.url : `Search: ${site.name}`;
                    // Extract domain for favicon
                    let faviconUrl = "";
                    try {
                      if (isValidUrl) {
                        const domain = new URL(site.url).origin;
                        faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
                      }
                    } catch { /* ignore */ }

                    return (
                      <a
                        key={idx}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {faviconUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={faviconUrl} alt="" className="w-4 h-4 rounded-sm flex-shrink-0" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                              )}
                              <span className="font-semibold text-blue-600 text-sm hover:underline">{site.name}</span>
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">{site.type}</span>
                              {!isValidUrl && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">search link</span>
                              )}
                            </div>
                            <p className="text-gray-600 text-sm">{site.description}</p>
                            <p className="text-xs text-gray-400 mt-1 truncate">{displayUrl}</p>
                          </div>
                          <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Prize Recommendations */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-1">
                Prize Recommendations
              </h2>
              <p className="text-sm text-gray-500 mb-4">Click a card to select it for your campaign brief</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {research.prizeRecommendations.map((prize, idx) => {
                  const selected = selectedInsights.prizeRecommendations.includes(idx);
                  const matchPct = prize.audienceMatch != null ? Math.round(prize.audienceMatch * 100) : null;
                  const fulfillIcon: Record<string, string> = {
                    "digital code": "\u{1F4E7}",
                    "physical": "\u{1F4E6}",
                    "in-app credit": "\u{1F4B3}",
                    "gift card": "\u{1F381}",
                    "subscription": "\u{1F504}",
                  };
                  const fIcon = prize.fulfillmentMethod ? (fulfillIcon[prize.fulfillmentMethod.toLowerCase()] || "\u{1F4E6}") : null;
                  return (
                    <div
                      key={idx}
                      onClick={() => togglePrizeRecommendation(idx)}
                      className={`relative border-2 rounded-xl p-5 cursor-pointer transition-all hover:shadow-md ${
                        selected
                          ? "border-blue-500 bg-blue-50/50 shadow-sm"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {/* Selection indicator */}
                      <div className={`absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        selected ? "border-blue-500 bg-blue-500" : "border-gray-300"
                      }`}>
                        {selected && (
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M3 7l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>

                      {/* Prize name + cost */}
                      <h3 className="font-semibold text-gray-900 text-base pr-8 mb-1">{prize.prize}</h3>
                      {prize.estimatedCost && (
                        <p className="text-sm font-medium text-green-700 mb-3">{prize.estimatedCost}</p>
                      )}

                      {/* Audience match bar */}
                      {matchPct != null && (
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Audience Match</span>
                            <span className="font-semibold text-gray-700">{matchPct}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                matchPct >= 70 ? "bg-green-500" : matchPct >= 40 ? "bg-yellow-500" : "bg-red-400"
                              }`}
                              style={{ width: `${matchPct}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Rationale */}
                      <p className="text-gray-600 text-sm mb-3 leading-relaxed">{prize.rationale}</p>

                      {/* Badge row */}
                      <div className="flex flex-wrap gap-1.5">
                        {prize.winRate && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium border border-amber-100">
                            {"\uD83C\uDFB2"} {prize.winRate}
                          </span>
                        )}
                        {fIcon && prize.fulfillmentMethod && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium border border-indigo-100">
                            {fIcon} {prize.fulfillmentMethod}
                          </span>
                        )}
                        {prize.urgencyFactor && (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border ${
                            prize.urgencyFactor === "trending" ? "bg-pink-50 text-pink-700 border-pink-100" :
                            prize.urgencyFactor === "seasonal" ? "bg-orange-50 text-orange-700 border-orange-100" :
                            prize.urgencyFactor === "limited-time" ? "bg-red-50 text-red-700 border-red-100" :
                            "bg-gray-50 text-gray-600 border-gray-200"
                          }`}>
                            {prize.urgencyFactor === "trending" ? "\u{1F525}" :
                             prize.urgencyFactor === "seasonal" ? "\u{1F343}" :
                             prize.urgencyFactor === "limited-time" ? "\u23F3" : "\u{2705}"} {prize.urgencyFactor}
                          </span>
                        )}
                      </div>

                      {/* Source link */}
                      {prize.source && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <span className="text-xs text-gray-400">
                            Source:{" "}
                            {prize.sourceUrl && /^https?:\/\/.+/i.test(prize.sourceUrl) ? (
                              <a href={prize.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline" onClick={(e) => e.stopPropagation()}>{prize.source}</a>
                            ) : (
                              <a href={`https://www.google.com/search?q=${encodeURIComponent(prize.source)}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline" onClick={(e) => e.stopPropagation()}>{prize.source}</a>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Copy Suggestions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Scratch-to-Win Copy Suggestions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {research.copySuggestions.map((copy, idx) => (
                  <div
                    key={idx}
                    className={`border rounded-lg p-4 transition-all ${
                      selectedInsights.copySuggestions.includes(idx)
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={selectedInsights.copySuggestions.includes(idx)}
                        onChange={() => toggleCopySuggestion(idx)}
                        className="mt-1 w-5 h-5 text-blue-500 rounded cursor-pointer flex-shrink-0"
                      />
                      <div className="flex-1">
                        <p className="text-gray-600 text-sm mb-1">Headline</p>
                        <p className="font-semibold text-gray-900 mb-3">{copy.headline}</p>
                        <p className="text-gray-600 text-sm mb-1">CTA</p>
                        <p className="text-blue-500 font-semibold">{copy.cta}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sentiment Dashboard */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Sentiment Dashboard
              </h2>

              {research.sentimentSummary.keyTakeaway && (
                <div className="bg-slate-50 rounded-lg p-4 mb-6 border border-slate-200">
                  <p className="text-sm font-medium text-gray-900">
                    {research.sentimentSummary.keyTakeaway}
                  </p>
                </div>
              )}

              {/* Donut Chart + Legend */}
              <div className="flex flex-col md:flex-row items-center gap-8 mb-6">
                {/* CSS Conic Gradient Donut */}
                <div className="relative w-44 h-44 flex-shrink-0">
                  <div
                    className="w-full h-full rounded-full"
                    style={{
                      background: `conic-gradient(
                        #22c55e 0% ${research.sentimentSummary.positive}%,
                        #eab308 ${research.sentimentSummary.positive}% ${research.sentimentSummary.positive + research.sentimentSummary.neutral}%,
                        #ef4444 ${research.sentimentSummary.positive + research.sentimentSummary.neutral}% 100%
                      )`,
                    }}
                  />
                  {/* White center to make it a donut */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full bg-white flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-gray-900">{research.sentimentSummary.positive}%</span>
                      <span className="text-[10px] text-gray-500 font-medium">Positive</span>
                    </div>
                  </div>
                </div>

                {/* Legend + Stats */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-green-500 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Positive</span>
                        <span className="text-sm font-bold text-green-600">{research.sentimentSummary.positive}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: `${research.sentimentSummary.positive}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-yellow-500 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Neutral</span>
                        <span className="text-sm font-bold text-yellow-600">{research.sentimentSummary.neutral}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
                        <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${research.sentimentSummary.neutral}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-red-500 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Negative</span>
                        <span className="text-sm font-bold text-red-600">{research.sentimentSummary.negative}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
                        <div className="bg-red-500 h-2 rounded-full" style={{ width: `${research.sentimentSummary.negative}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {research.sentimentSummary.topicBreakdown &&
                research.sentimentSummary.topicBreakdown.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Sentiment by Topic</p>
                  <div className="space-y-3">
                    {research.sentimentSummary.topicBreakdown.map((topic, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleTopicExpand(idx)}
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                          <span className="font-medium text-gray-900 text-sm">{topic.topic}</span>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 text-xs">
                              <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                              <span className="text-gray-600">{topic.positive}%</span>
                              <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 ml-2" />
                              <span className="text-gray-600">{topic.neutral}%</span>
                              <span className="inline-block w-2 h-2 rounded-full bg-red-500 ml-2" />
                              <span className="text-gray-600">{topic.negative}%</span>
                            </div>
                            <svg
                              className={`w-4 h-4 text-gray-500 transition-transform ${
                                expandedTopics.includes(idx) ? "rotate-180" : ""
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>

                        <div className="px-4 pb-1">
                          <div className="flex h-2 rounded-full overflow-hidden bg-gray-200">
                            <div className="bg-green-500" style={{ width: `${topic.positive}%` }} />
                            <div className="bg-yellow-500" style={{ width: `${topic.neutral}%` }} />
                            <div className="bg-red-500" style={{ width: `${topic.negative}%` }} />
                          </div>
                        </div>

                        {expandedTopics.includes(idx) && topic.sampleQuotes && (
                          <div className="px-4 pb-4 pt-2 space-y-2">
                            {topic.sampleQuotes.map((quote, qIdx) => (
                              <div
                                key={qIdx}
                                className={`border rounded-md p-3 text-sm ${sentimentColor(quote.sentiment)}`}
                              >
                                <div className="flex items-start gap-2">
                                  <span className={`inline-block w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${sentimentDot(quote.sentiment)}`} />
                                  <div className="flex-1">
                                    <p className="text-gray-800 italic">&ldquo;{quote.text}&rdquo;</p>
                                    <p className="text-gray-500 text-xs mt-1">{quote.source}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sources */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Sources</h2>
              <ul className="space-y-2">
                {research.sources.map((source, idx) => {
                  const isValidUrl = source.url && /^https?:\/\/.+/i.test(source.url);
                  const href = isValidUrl ? source.url : `https://www.google.com/search?q=${encodeURIComponent(source.title)}`;

                  return (
                    <li key={idx} className="flex items-center gap-2">
                      {source.platform && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${platformColor(source.platform)}`}>
                          {source.platform}
                        </span>
                      )}
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-600 underline text-sm"
                      >
                        {source.title}
                      </a>
                      {!isValidUrl && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">search</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Selected Insights Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Selected Insights</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-50 rounded p-3">
                  <p className="text-xs text-gray-600 mb-1">Sentiment</p>
                  <p className="text-2xl font-bold text-blue-500">{selectedInsights.brandSentiment.length}</p>
                </div>
                <div className="bg-slate-50 rounded p-3">
                  <p className="text-xs text-gray-600 mb-1">Trending Topics</p>
                  <p className="text-2xl font-bold text-blue-500">{selectedInsights.trendingTopics.length}</p>
                </div>
                <div className="bg-slate-50 rounded p-3">
                  <p className="text-xs text-gray-600 mb-1">Prize Ideas</p>
                  <p className="text-2xl font-bold text-blue-500">{selectedInsights.prizeRecommendations.length}</p>
                </div>
                <div className="bg-slate-50 rounded p-3">
                  <p className="text-xs text-gray-600 mb-1">Copy Variants</p>
                  <p className="text-2xl font-bold text-blue-500">{selectedInsights.copySuggestions.length}</p>
                </div>
              </div>

              {(selectedInsights.brandSentiment.length > 0 ||
                selectedInsights.trendingTopics.length > 0 ||
                selectedInsights.prizeRecommendations.length > 0 ||
                selectedInsights.copySuggestions.length > 0) && (
                <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold text-blue-700">
                      {selectedInsights.brandSentiment.length +
                        selectedInsights.trendingTopics.length +
                        selectedInsights.prizeRecommendations.length +
                        selectedInsights.copySuggestions.length}{" "}
                      insights selected
                    </span>
                    . Ready to proceed to the banner editor.
                  </p>
                </div>
              )}
            </div>

            {/* Save Research to Library */}
            {!researchSaved && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
                {showSaveResearch ? (
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={researchName}
                      onChange={(e) => setResearchName(e.target.value)}
                      placeholder="Name this research (e.g. 'Q2 Fitness Campaign')"
                      className="flex-1 px-3 py-2 border border-indigo-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={handleSaveResearchToLibrary}
                      disabled={savingResearch || !researchName.trim()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      {savingResearch ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => setShowSaveResearch(false)}
                      className="text-gray-400 hover:text-gray-600 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-indigo-700">
                      Save this research to reuse with future campaigns.
                    </p>
                    <button
                      onClick={() => {
                        setResearchName(`${(campaign as any)?.brand_name || campaign?.name || ""} Research`);
                        setShowSaveResearch(true);
                      }}
                      className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      Save to Library
                    </button>
                  </div>
                )}
              </div>
            )}
            {researchSaved && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6 text-sm text-green-700 font-medium">
                Research saved to your library.
              </div>
            )}

            {/* CTA Buttons */}
            <div className="flex flex-col gap-4">
              <button
                onClick={handleOneClickGenerate}
                disabled={generatingAll || saving || (
                  selectedInsights.brandSentiment.length === 0 &&
                  selectedInsights.trendingTopics.length === 0 &&
                  selectedInsights.prizeRecommendations.length === 0 &&
                  selectedInsights.copySuggestions.length === 0
                )}
                className={`w-full font-bold py-4 rounded-lg transition-colors text-base ${
                  generatingAll || saving || (
                    selectedInsights.brandSentiment.length === 0 &&
                    selectedInsights.trendingTopics.length === 0 &&
                    selectedInsights.prizeRecommendations.length === 0 &&
                    selectedInsights.copySuggestions.length === 0
                  )
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "text-white shadow-lg"
                }`}
                style={!(generatingAll || saving || (
                  selectedInsights.brandSentiment.length === 0 &&
                  selectedInsights.trendingTopics.length === 0 &&
                  selectedInsights.prizeRecommendations.length === 0 &&
                  selectedInsights.copySuggestions.length === 0
                )) ? { background: "linear-gradient(135deg, #7c3aed, #4f46e5)" } : {}}
              >
                {generatingAll || saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    Saving insights and opening editor...
                  </span>
                ) : (
                  "Save Insights & Open Editor"
                )}
              </button>
              <p className="text-xs text-gray-500 text-center -mt-2">
                Your selected insights will be used to guide AI banner generation in the editor
              </p>

              <div className="flex justify-end gap-4 mt-2">
                <button
                  onClick={() => router.back()}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold px-6 py-3 rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSaveAndProceed}
                  disabled={saving}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
                >
                  {saving ? "Saving..." : "Save & Continue to Editor"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
