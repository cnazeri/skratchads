"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import CopyableId from "@/components/CopyableId";

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
  canvas_json: string | null;
}

type FilterStatus = "all" | "selected" | "unselected";
type SortField = "newest" | "oldest" | "campaign" | "format";
type BannerState = "scratch" | "win" | "lose" | "redeem" | "brand";

const STATE_LABELS: Record<string, string> = {
  scratch: "Scratch-to-Win",
  win: "Win",
  lose: "Lose",
  redeem: "Redeem",
  brand: "Default",
};

const STATE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  scratch: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  win: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-400" },
  lose: { bg: "bg-red-50", text: "text-red-600", dot: "bg-red-400" },
  redeem: { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-400" },
  brand: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-400" },
};

function shortId(uuid: string): string {
  return uuid.slice(0, 8).toUpperCase();
}

export default function CreativesLibraryPage() {
  const [creatives, setCreatives] = useState<CreativeRow[]>([]);
  const [bannerStates, setBannerStates] = useState<Record<string, BannerStateRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterCampaign, setFilterCampaign] = useState<string>("all");
  const [filterFormat, setFilterFormat] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortField>("newest");
  const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string }>>([]);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string; campaignName: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchCreatives();
  }, []);

  const fetchCreatives = async () => {
    try {
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

      const uniqueCampaigns = Array.from(
        new Map(
          rows.map((c) => [c.campaigns.id, { id: c.campaigns.id, name: c.campaigns.name }])
        ).values()
      );
      setCampaigns(uniqueCampaigns);

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
      console.error("Failed to fetch creatives:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCreative = async (creativeId: string) => {
    setDeleting(true);
    try {
      await supabase.from("banner_states").delete().eq("creative_id", creativeId);
      await supabase.from("creatives").delete().eq("id", creativeId);

      setCreatives((prev) => prev.filter((c) => c.id !== creativeId));
      setBannerStates((prev) => {
        const next = { ...prev };
        delete next[creativeId];
        return next;
      });
      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete creative:", err);
    } finally {
      setDeleting(false);
    }
  };

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

  const uniqueFormats = Array.from(new Set(creatives.map((c) => c.format_name)));

  // Build a campaign-level index to derive sub-IDs
  const campaignCreativeIndex: Record<string, string[]> = {};
  creatives.forEach((c) => {
    if (!campaignCreativeIndex[c.campaign_id]) campaignCreativeIndex[c.campaign_id] = [];
    if (!campaignCreativeIndex[c.campaign_id].includes(c.id)) {
      campaignCreativeIndex[c.campaign_id].push(c.id);
    }
  });

  const getSubId = (creative: CreativeRow): string => {
    const list = campaignCreativeIndex[creative.campaign_id] || [];
    const idx = list.indexOf(creative.id) + 1;
    return `${shortId(creative.campaign_id)}-${String(idx).padStart(2, "0")}`;
  };

  return (
    <div className="min-h-[calc(100vh-180px)]">
      <div className="max-w-[1200px] mx-auto px-6 py-10">
        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4" style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
              <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Delete Creative?</h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                This will permanently delete <strong>{deleteTarget.label}</strong> from <strong>{deleteTarget.campaignName}</strong> and all its banner states. This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteCreative(deleteTarget.id)}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Deleting...
                    </>
                  ) : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Creative Library</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              All creatives across campaigns. Browse, preview, and re-download.
            </p>
          </div>
          <span className="text-sm text-gray-400 font-medium">
            {filteredCreatives.length} creative{filteredCreatives.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Filters Bar */}
        <div
          className="bg-white rounded-2xl border border-gray-100 p-4 mb-8 flex flex-wrap gap-4 items-center"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Campaign</label>
            <select
              value={filterCampaign}
              onChange={(e) => setFilterCampaign(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
            >
              <option value="all">All Campaigns</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Format</label>
            <select
              value={filterFormat}
              onChange={(e) => setFilterFormat(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
            >
              <option value="all">All Formats</option>
              {uniqueFormats.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
            >
              <option value="all">All</option>
              <option value="selected">Selected Winners</option>
              <option value="unselected">Not Selected</option>
            </select>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sort</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
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
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-200 border-t-indigo-500 mb-3" />
            <p className="text-sm text-gray-400">Loading creatives...</p>
          </div>
        ) : filteredCreatives.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">No creatives yet</h2>
            <p className="text-gray-400 mb-6 text-sm max-w-sm mx-auto">
              Creatives will appear here once you generate them in a campaign.
            </p>
            <Link
              href="/campaign/new"
              className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-xl text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Create Campaign
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredCreatives.map((creative) => {
              const states = bannerStates[creative.id] || [];
              const subId = getSubId(creative);
              return (
                <div
                  key={creative.id}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden group hover:border-indigo-200"
                  style={{ boxShadow: 'var(--shadow-card)', transition: 'box-shadow 200ms, border-color 200ms' }}
                  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-card)')}
                >
                  {/* Card Header */}
                  <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 text-sm">
                          {creative.variation_label}
                        </h3>
                        {creative.selected && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Winner
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-400">
                          {creative.campaigns.name} / {creative.campaigns.brand_name}
                        </p>
                        <CopyableId
                          label={subId}
                          copyValue={subId}
                          className="text-xs font-mono text-gray-300"
                        />
                        <span className="text-xs text-gray-200">|</span>
                        <CopyableId
                          label={`CRV-${shortId(creative.id)}`}
                          copyValue={creative.id}
                          className="text-xs font-mono text-gray-300"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          {creative.format_name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {creative.format_width}x{creative.format_height}
                        </div>
                      </div>
                      <button
                        onClick={() => setDeleteTarget({ id: creative.id, label: creative.variation_label, campaignName: creative.campaigns.name })}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete creative"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>

                  {/* Banner State Previews */}
                  <div className="px-5 py-4">
                    <div className="grid grid-cols-5 gap-3">
                      {(["scratch", "win", "lose", "redeem", "brand"] as BannerState[]).map((stateType) => {
                        const state = states.find((s) => s.state_type === stateType);
                        let previewUrl = state?.preview_url || state?.image_url;
                        if (!previewUrl && state?.canvas_json) {
                          try {
                            const parsed = typeof state.canvas_json === "string" ? JSON.parse(state.canvas_json) : state.canvas_json;
                            const objs = (parsed as { objects?: Array<{ type?: string; src?: string }> }).objects || [];
                            const bgObj = objs.find((o: { type?: string; src?: string }) => (o.type === "Image" || o.type === "image") && o.src);
                            if (bgObj?.src?.startsWith("http")) previewUrl = bgObj.src;
                          } catch { /* ignore */ }
                        }
                        const colors = STATE_COLORS[stateType];
                        return (
                          <div key={stateType} className="text-center">
                            <div className="aspect-square bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center overflow-hidden mb-2 relative">
                              {previewUrl ? (
                                <>
                                  <img
                                    src={previewUrl}
                                    alt={STATE_LABELS[stateType]}
                                    className="object-contain w-full h-full relative z-10"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = "none";
                                    }}
                                  />
                                  <span className="absolute inset-0 flex items-center justify-center text-xs text-gray-300 z-0">Preview</span>
                                </>
                              ) : (
                                <span className="text-xs text-gray-300">Empty</span>
                              )}
                            </div>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                previewUrl
                                  ? `${colors.bg} ${colors.text}`
                                  : "bg-gray-50 text-gray-400"
                              }`}
                            >
                              <span className={`w-1 h-1 rounded-full ${previewUrl ? colors.dot : "bg-gray-300"}`} />
                              {STATE_LABELS[stateType]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {new Date(creative.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex gap-2 items-center">
                      <Link
                        href={`/campaign/${creative.campaign_id}/editor`}
                        className="text-xs font-semibold text-indigo-500 hover:text-indigo-700"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/campaign/${creative.campaign_id}/research`}
                        className="text-xs font-semibold text-amber-500 hover:text-amber-700"
                      >
                        Research
                      </Link>
                      <Link
                        href={`/campaign/${creative.campaign_id}/variations`}
                        className="text-xs font-semibold text-emerald-500 hover:text-emerald-700"
                      >
                        View
                      </Link>
                      <Link
                        href={`/campaign/${creative.campaign_id}/export`}
                        className="text-xs font-semibold text-white bg-indigo-500 hover:bg-indigo-600 px-3 py-1 rounded-lg"
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
