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

interface TrendingMediaItem {
  platform: string;
  topic: string;
  description: string;
  engagement: string;
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
  brandSentiment?: string[];
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

  // Helper: get brandSentiment from research (handles old painPoints format)
  const getSentimentItems = (r: ResearchResult): string[] => {
    return r.brandSentiment || r.painPoints || [];
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

      // Include giveaway in brief for research
      if (campaignData.giveaway) {
        brief = brief || {};
        brief.giveaway = campaignData.giveaway;
      }

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
              <p className="text-sm text-gray-500 mb-4">
                How people feel about the brand and similar prizes/giveaways online
              </p>
              <ul className="space-y-3">
                {sentimentItems.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedInsights.brandSentiment.includes(idx)}
                      onChange={() => toggleSentimentItem(idx)}
                      className="mt-1 w-5 h-5 text-blue-500 rounded cursor-pointer"
                    />
                    <span className="text-gray-700 flex-1">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

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
                    <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:border-blue-200 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${platformColor(item.platform)}`}>
                              {item.platform}
                            </span>
                            <span className="font-semibold text-gray-900 text-sm">{item.topic}</span>
                          </div>
                          <p className="text-gray-600 text-sm">{item.description}</p>
                        </div>
                        {item.engagement && (
                          <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full flex-shrink-0">
                            {item.engagement}
                          </span>
                        )}
                      </div>
                    </div>
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
                  Visual references and sample imagery relevant to your campaign
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {research.inspirationImages.map((img, idx) => (
                    <a
                      key={idx}
                      href={img.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group border border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 hover:shadow-md transition-all"
                    >
                      <div className="aspect-video bg-gray-100 relative overflow-hidden">
                        <img
                          src={img.url}
                          alt={img.description}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            const parent = target.parentElement;
                            if (parent) {
                              const fallback = document.createElement("div");
                              fallback.className = "w-full h-full flex items-center justify-center text-gray-400";
                              fallback.innerHTML = `<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`;
                              parent.appendChild(fallback);
                            }
                          }}
                        />
                      </div>
                      <div className="p-3">
                        <p className="text-sm text-gray-700 line-clamp-2">{img.description}</p>
                        <p className="text-xs text-gray-400 mt-1">{img.source}</p>
                      </div>
                    </a>
                  ))}
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
                  {research.relevantWebsites.map((site, idx) => (
                    <a
                      key={idx}
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-blue-600 text-sm hover:underline">{site.name}</span>
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">{site.type}</span>
                          </div>
                          <p className="text-gray-600 text-sm">{site.description}</p>
                          <p className="text-xs text-gray-400 mt-1 truncate">{site.url}</p>
                        </div>
                        <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Prize Recommendations */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Prize Recommendations
              </h2>
              <div className="space-y-4">
                {research.prizeRecommendations.map((prize, idx) => (
                  <div
                    key={idx}
                    className={`border rounded-lg p-4 transition-all ${
                      selectedInsights.prizeRecommendations.includes(idx)
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2 gap-3">
                      <input
                        type="checkbox"
                        checked={selectedInsights.prizeRecommendations.includes(idx)}
                        onChange={() => togglePrizeRecommendation(idx)}
                        className="mt-1 w-5 h-5 text-blue-500 rounded cursor-pointer flex-shrink-0"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{prize.prize}</h3>
                      </div>
                      <span className="text-sm font-semibold text-blue-500 flex-shrink-0">
                        {Math.round(prize.relevanceScore * 100)}% Relevance
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${prize.relevanceScore * 100}%` }}
                      />
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{prize.rationale}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      {prize.estimatedCost && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-full font-medium">
                          Est. cost: {prize.estimatedCost}
                        </span>
                      )}
                      {prize.source && (
                        <span className="text-gray-500">
                          Source:{" "}
                          {prize.sourceUrl ? (
                            <a href={prize.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{prize.source}</a>
                          ) : (
                            prize.source
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Copy Suggestions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Copy Suggestions
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

            {/* Sentiment Report */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Sentiment Analysis
              </h2>

              {research.sentimentSummary.keyTakeaway && (
                <div className="bg-slate-50 rounded-lg p-4 mb-6 border border-slate-200">
                  <p className="text-sm font-medium text-gray-900">
                    {research.sentimentSummary.keyTakeaway}
                  </p>
                </div>
              )}

              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-2">Overall Sentiment</p>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex h-8 rounded-lg overflow-hidden bg-gray-200">
                      <div
                        className="bg-green-500 transition-all"
                        style={{ width: `${research.sentimentSummary.positive}%` }}
                      />
                      <div
                        className="bg-yellow-500 transition-all"
                        style={{ width: `${research.sentimentSummary.neutral}%` }}
                      />
                      <div
                        className="bg-red-500 transition-all"
                        style={{ width: `${research.sentimentSummary.negative}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 flex-shrink-0">
                    <p>
                      <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-1 align-middle" />
                      Positive {research.sentimentSummary.positive}%
                    </p>
                    <p>
                      <span className="inline-block w-3 h-3 rounded-full bg-yellow-500 mr-1 align-middle" />
                      Neutral {research.sentimentSummary.neutral}%
                    </p>
                    <p>
                      <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-1 align-middle" />
                      Negative {research.sentimentSummary.negative}%
                    </p>
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
                {research.sources.map((source, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    {source.platform && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${platformColor(source.platform)}`}>
                        {source.platform}
                      </span>
                    )}
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600 underline text-sm"
                    >
                      {source.title}
                    </a>
                  </li>
                ))}
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
