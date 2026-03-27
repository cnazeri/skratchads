"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface CreativeRow {
  id: string;
  campaign_id: string;
  format_name: string;
  format_width: number;
  format_height: number;
  variation_label: string;
  selected: boolean;
  created_at: string;
  campaigns: {
    id: string;
    name: string;
    brand_name: string;
    status: string;
  };
}

interface BannerStateRow {
  id: string;
  creative_id: string;
  state_type: string;
  image_url: string | null;
  preview_url: string | null;
}

type FilterStatus = "all" | "selected" | "unselected";
type SortField = "newest" | "oldest" | "campaign" | "format";

export default function CreativesLibraryPage() {
  const [creatives, setCreatives] = useState<CreativeRow[]>([]);
  const [bannerStates, setBannerStates] = useState<Record<string, BannerStateRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterCampaign, setFilterCampaign] = useState<string>("all");
  const [filterFormat, setFilterFormat] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortField>("newest");
  const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    fetchCreatives();
  }, []);

  const fetchCreatives = async () => {
    try {
      // Fetch all creatives with campaign info
      const { data: creativesData, error: creativesError } = await supabase
        .from("creatives")
        .select(`
          *,
          campaigns (id, name, brand_name, status)
        `)
        .order("created_at", { ascending: false });

      if (creativesError) throw creativesError;

      const rows = (creativesData || []) as unknown as CreativeRow[];
      setCreatives(rows);

      // Extract unique campaigns for filter dropdown
      const uniqueCampaigns = Array.from(
        new Map(
          rows.map((c) => [c.campaigns.id, { id: c.campaigns.id, name: c.campaigns.name }])
        ).values()
      );
      setCampaigns(uniqueCampaigns);

      // Fetch all banner states for these creatives
      if (rows.length > 0) {
        const creativeIds = rows.map((c) => c.id);
        const { data: statesData, error: statesError } = await supabase
          .from("banner_states")
          .select("*")
          .in("creative_id", creativeIds);

        if (statesError) throw statesError;

        // Group by creative_id
        const grouped: Record<string, BannerStateRow[]> = {};
        (statesData || []).forEach((state: BannerStateRow) => {
          if (!grouped[state.creative_id]) grouped[state.creative_id] = [];
          grouped[state.creative_id].push(state);
        });
        setBannerStates(grouped);
      }
    } catch (err) {
      console.error("Failed to fetch creatives:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort
  const filteredCreatives = creatives
    .filter((c) => {
      if (filterStatus === "selected" && !c.selected) return false;
      if (filterStatus === "unselected" && c.selected) return false;
      if (filterCampaign !== "all" && c.campaigns.id !== filterCampaign) return false;
      if (filterFormat !== "all" && c.format_name !== filterFormat) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "campaign":
          return a.campaigns.name.localeCompare(b.campaigns.name);
        case "format":
          return a.format_name.localeCompare(b.format_name);
        default:
          return 0;
      }
    });

  // Unique formats for filter
  const uniqueFormats = Array.from(new Set(creatives.map((c) => c.format_name)));

  const stateLabels: Record<string, string> = {
    scratch: "Scratch-to-Win",
    win: "Win",
    lose: "Lose",
    redeem: "Redeem",
    brand: "Default",
  };

  const stateColors: Record<string, string> = {
    scratch: "bg-yellow-100 text-yellow-800",
    win: "bg-green-100 text-green-800",
    lose: "bg-red-100 text-red-800",
    redeem: "bg-purple-100 text-purple-800",
    brand: "bg-blue-100 text-blue-800",
  };

  return (
    <div className="min-h-[calc(100vh-180px)]">
      <div className="max-w-[1100px] mx-auto px-8 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Creative Library</h1>
            <p className="text-gray-600 mt-1">
              All creatives across campaigns. Browse, preview, and re-download.
            </p>
          </div>
          <div className="text-sm text-gray-500">
            {filteredCreatives.length} creative{filteredCreatives.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Campaign:</label>
            <select
              value={filterCampaign}
              onChange={(e) => setFilterCampaign(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 text-gray-700 bg-white"
            >
              <option value="all">All Campaigns</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Format:</label>
            <select
              value={filterFormat}
              onChange={(e) => setFilterFormat(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 text-gray-700 bg-white"
            >
              <option value="all">All Formats</option>
              {uniqueFormats.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 text-gray-700 bg-white"
            >
              <option value="all">All</option>
              <option value="selected">Selected Winners</option>
              <option value="unselected">Not Selected</option>
            </select>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <label className="text-sm font-medium text-gray-700">Sort:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 text-gray-700 bg-white"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="campaign">By Campaign</option>
              <option value="format">By Format</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : filteredCreatives.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No creatives yet</h2>
            <p className="text-gray-700 mb-6">
              Creatives will appear here once you generate them in a campaign.
            </p>
            <Link
              href="/campaign/new"
              className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
            >
              Create Campaign
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredCreatives.map((creative) => {
              const states = bannerStates[creative.id] || [];
              return (
                <div
                  key={creative.id}
                  className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900">
                          Variation {creative.variation_label}
                        </h3>
                        {creative.selected && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                            Winner
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">
                        {creative.campaigns.name} / {creative.campaigns.brand_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {creative.format_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {creative.format_width} x {creative.format_height}
                      </div>
                    </div>
                  </div>

                  {/* Banner State Previews */}
                  <div className="px-5 py-4">
                    <div className="grid grid-cols-5 gap-3">
                      {["scratch", "win", "lose", "redeem", "brand"].map((stateType) => {
                        const state = states.find((s) => s.state_type === stateType);
                        const previewUrl = state?.preview_url || state?.image_url;
                        return (
                          <div key={stateType} className="text-center">
                            <div className="aspect-square bg-gray-50 rounded-md border border-gray-200 flex items-center justify-center overflow-hidden mb-1.5">
                              {previewUrl ? (
                                <img
                                  src={previewUrl}
                                  alt={stateLabels[stateType]}
                                  className="object-contain w-full h-full"
                                />
                              ) : (
                                <span className="text-xs text-gray-400">No preview</span>
                              )}
                            </div>
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${stateColors[stateType]}`}
                            >
                              {stateLabels[stateType]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {new Date(creative.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex gap-3">
                      <Link
                        href={`/campaign/${creative.campaign_id}/variations`}
                        className="text-sm font-medium text-blue-500 hover:text-blue-600"
                      >
                        View Campaign
                      </Link>
                      <Link
                        href={`/campaign/${creative.campaign_id}/export`}
                        className="text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded-md transition-colors"
                      >
                        Download
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
