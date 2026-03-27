"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Campaign } from "@/types";

type BannerState = "scratch" | "win" | "lose" | "redeem" | "brand";

interface BannerStateRow {
  id: string;
  creative_id: string;
  state_type: string;
  canvas_json: string | null;
  image_url: string | null;
  preview_url: string | null;
}

interface CreativeRow {
  id: string;
  campaign_id: string;
  format_name: string;
  format_width: number;
  format_height: number;
  variation_label: string;
  selected: boolean;
  created_at: string;
}

const BANNER_STATE_LABELS: Record<BannerState, string> = {
  scratch: "Scratch-to-Win",
  win: "Win",
  lose: "Lose",
  redeem: "Redeem",
  brand: "Default",
};

const STATE_ORDER: BannerState[] = ["scratch", "win", "lose", "redeem", "brand"];

export default function VariationsPage() {
  const params = useParams();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [creatives, setCreatives] = useState<CreativeRow[]>([]);
  const [bannerStates, setBannerStates] = useState<Record<string, BannerStateRow[]>>({});
  const [currentTab, setCurrentTab] = useState<BannerState>("scratch");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [campaignId]);

  const fetchData = async () => {
    try {
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();

      if (campaignError) throw campaignError;
      setCampaign(campaignData);

      const { data: creativesData, error: creativesError } = await supabase
        .from("creatives")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });

      if (creativesError) throw creativesError;
      const rows = (creativesData || []) as CreativeRow[];
      setCreatives(rows);

      if (rows.length > 0) {
        const creativeIds = rows.map((c) => c.id);
        const { data: statesData, error: statesError } = await supabase
          .from("banner_states")
          .select("*")
          .in("creative_id", creativeIds);

        if (statesError) throw statesError;

        const grouped: Record<string, BannerStateRow[]> = {};
        (statesData || []).forEach((state: BannerStateRow) => {
          if (!grouped[state.creative_id]) grouped[state.creative_id] = [];
          grouped[state.creative_id].push(state);
        });
        setBannerStates(grouped);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Count how many states have content
  const getStateCount = (stateType: BannerState): number => {
    let count = 0;
    for (const creative of creatives) {
      const states = bannerStates[creative.id] || [];
      if (states.some((s) => s.state_type === stateType && (s.preview_url || s.canvas_json))) {
        count++;
      }
    }
    return count;
  };

  // Get states for the currently selected tab
  const getCurrentTabStates = () => {
    const results: Array<{
      creative: CreativeRow;
      state: BannerStateRow;
    }> = [];

    for (const creative of creatives) {
      const states = bannerStates[creative.id] || [];
      const match = states.find((s) => s.state_type === currentTab);
      if (match && (match.preview_url || match.canvas_json)) {
        results.push({ creative, state: match });
      }
    }

    return results;
  };

  const currentItems = getCurrentTabStates();

  return (
    <div className="min-h-[calc(100vh-180px)] bg-slate-100">
      <div className="max-w-[1100px] mx-auto px-8 py-12">
        <div className="mb-8">
          <Link
            href={`/campaign/${campaignId}/editor`}
            className="text-sm text-blue-500 hover:text-blue-700 mb-2 inline-flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Editor
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Saved Creatives</h1>
              <p className="text-gray-700">{campaign?.name}</p>
            </div>
            <div className="flex gap-3">
              <Link
                href={`/campaign/${campaignId}/export`}
                className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                Export Creatives
              </Link>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4" />
            <p className="text-gray-700">Loading saved creatives...</p>
          </div>
        ) : creatives.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No creatives saved yet</h2>
            <p className="text-gray-600 mb-6">
              Go to the editor to create and save your banner creatives.
            </p>
            <Link
              href={`/campaign/${campaignId}/editor`}
              className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
            >
              Open Editor
            </Link>
          </div>
        ) : (
          <>
            {/* State Tabs */}
            <div className="flex gap-2 mb-6 bg-white rounded-lg shadow p-1 w-fit">
              {STATE_ORDER.map((tab) => {
                const count = getStateCount(tab);
                return (
                  <button
                    key={tab}
                    onClick={() => setCurrentTab(tab)}
                    className={`px-4 py-2 rounded text-sm font-semibold transition-colors flex items-center gap-2 ${
                      currentTab === tab
                        ? "bg-blue-500 text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {BANNER_STATE_LABELS[tab]}
                    {count > 0 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        currentTab === tab ? "bg-blue-400 text-white" : "bg-gray-200 text-gray-600"
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Creatives Grid */}
            {currentItems.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-500">
                  No {BANNER_STATE_LABELS[currentTab]} state saved yet. Generate it in the editor.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {currentItems.map(({ creative, state }) => (
                  <div
                    key={`${creative.id}-${state.state_type}`}
                    className="bg-white rounded-lg shadow overflow-hidden"
                  >
                    <div
                      className="w-full bg-gray-900 overflow-hidden"
                      style={{
                        aspectRatio: `${creative.format_width}/${creative.format_height}`,
                        maxHeight: "400px",
                      }}
                    >
                      {state.preview_url ? (
                        <img
                          src={state.preview_url}
                          alt={`${BANNER_STATE_LABELS[currentTab]} - ${creative.variation_label}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                          Preview not available. Re-save from the editor.
                        </div>
                      )}
                    </div>

                    <div className="px-4 py-3 flex items-center justify-between border-t border-gray-100">
                      <div>
                        <span className="text-sm font-semibold text-gray-900">
                          {creative.variation_label}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                          {creative.format_name} ({creative.format_width}x{creative.format_height})
                        </span>
                      </div>
                      <Link
                        href={`/campaign/${campaignId}/editor`}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* All States Overview */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">All States Overview</h2>
              {creatives.map((creative) => {
                const states = bannerStates[creative.id] || [];
                return (
                  <div key={creative.id} className="mb-6 last:mb-0">
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-sm font-bold text-gray-800">
                        {creative.variation_label}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {creative.format_name} ({creative.format_width}x{creative.format_height})
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-3">
                      {STATE_ORDER.map((stateType) => {
                        const match = states.find((s) => s.state_type === stateType);
                        const hasPreview = match?.preview_url;
                        const hasData = match?.canvas_json;
                        return (
                          <div key={stateType} className="text-center">
                            <div
                              className="bg-gray-100 rounded-md border border-gray-200 overflow-hidden flex items-center justify-center mb-1.5"
                              style={{
                                aspectRatio: `${creative.format_width}/${creative.format_height}`,
                                maxHeight: "120px",
                              }}
                            >
                              {hasPreview ? (
                                <img
                                  src={match!.preview_url!}
                                  alt={BANNER_STATE_LABELS[stateType]}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-xs text-gray-400">
                                  {hasData ? "Re-save to preview" : "Empty"}
                                </span>
                              )}
                            </div>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                              hasData || hasPreview
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-500"
                            }`}>
                              {BANNER_STATE_LABELS[stateType]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-between items-center mt-6">
              <Link
                href={`/campaign/${campaignId}/editor`}
                className="px-6 py-2.5 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-white transition-colors text-sm"
              >
                Back to Editor
              </Link>
              <Link
                href={`/campaign/${campaignId}/export`}
                className="px-8 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                Export Creatives
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
