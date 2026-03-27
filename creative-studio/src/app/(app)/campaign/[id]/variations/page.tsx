"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Campaign } from "@/types";
import CopyableId from "@/components/CopyableId";

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

const STATE_COLORS: Record<BannerState, { bg: string; text: string; dot: string }> = {
  scratch: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  win: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-400" },
  lose: { bg: "bg-red-50", text: "text-red-600", dot: "bg-red-400" },
  redeem: { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-400" },
  brand: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-400" },
};

const STATE_ORDER: BannerState[] = ["scratch", "win", "lose", "redeem", "brand"];

// Generate short display IDs from UUIDs
function shortId(uuid: string): string {
  return uuid.slice(0, 8).toUpperCase();
}

export default function VariationsPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [creatives, setCreatives] = useState<CreativeRow[]>([]);
  const [bannerStates, setBannerStates] = useState<Record<string, BannerStateRow[]>>({});
  const [currentTab, setCurrentTab] = useState<BannerState>("scratch");
  const [loading, setLoading] = useState(true);

  // Selection state for export
  const [selectedForExport, setSelectedForExport] = useState<Set<string>>(new Set());

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

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

      // Default: select all for export
      setSelectedForExport(new Set(rows.map((c) => c.id)));

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

  // Toggle export selection for a single creative
  const toggleExportSelection = (creativeId: string) => {
    setSelectedForExport((prev) => {
      const next = new Set(prev);
      if (next.has(creativeId)) {
        next.delete(creativeId);
      } else {
        next.add(creativeId);
      }
      return next;
    });
  };

  // Select/deselect all
  const toggleSelectAll = () => {
    if (selectedForExport.size === creatives.length) {
      setSelectedForExport(new Set());
    } else {
      setSelectedForExport(new Set(creatives.map((c) => c.id)));
    }
  };

  // Delete a creative and its banner states
  const handleDeleteCreative = async (creativeId: string) => {
    setDeleting(true);
    try {
      // Delete banner states first (child rows)
      await supabase.from("banner_states").delete().eq("creative_id", creativeId);
      // Delete creative
      await supabase.from("creatives").delete().eq("id", creativeId);

      // Update local state
      setCreatives((prev) => prev.filter((c) => c.id !== creativeId));
      setBannerStates((prev) => {
        const next = { ...prev };
        delete next[creativeId];
        return next;
      });
      setSelectedForExport((prev) => {
        const next = new Set(prev);
        next.delete(creativeId);
        return next;
      });
      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete creative:", err);
    } finally {
      setDeleting(false);
    }
  };

  const getStateCount = (stateType: BannerState): number => {
    let count = 0;
    for (const creative of creatives) {
      const states = bannerStates[creative.id] || [];
      if (states.some((s) => s.state_type === stateType && (s.preview_url || s.image_url || s.canvas_json))) {
        count++;
      }
    }
    return count;
  };

  const getCurrentTabStates = () => {
    const results: Array<{ creative: CreativeRow; state: BannerStateRow }> = [];
    for (const creative of creatives) {
      const states = bannerStates[creative.id] || [];
      const match = states.find((s) => s.state_type === currentTab);
      if (match && (match.preview_url || match.image_url || match.canvas_json)) {
        results.push({ creative, state: match });
      }
    }
    return results;
  };

  // Navigate to export with selected creative IDs as query param
  const handleExportSelected = () => {
    const ids = Array.from(selectedForExport).join(",");
    router.push(`/campaign/${campaignId}/export?selected=${encodeURIComponent(ids)}`);
  };

  const currentItems = getCurrentTabStates();
  const tabColor = STATE_COLORS[currentTab];
  const allSelected = creatives.length > 0 && selectedForExport.size === creatives.length;
  const someSelected = selectedForExport.size > 0;
  const multipleCreatives = creatives.length > 1;

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
                This will permanently delete <strong>{deleteTarget.label}</strong> and all its banner states. This cannot be undone.
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
        <div className="mb-8">
          <Link
            href={`/campaign/${campaignId}/editor`}
            className="text-sm text-indigo-500 hover:text-indigo-700 mb-3 inline-flex items-center gap-1 font-medium"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Editor
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Saved Creatives</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {campaign?.name}
                <CopyableId label={`Campaign ID: ${shortId(campaignId)}`} copyValue={campaignId} className="ml-2 text-xs text-gray-400 font-mono" />
              </p>
            </div>
            <div className="flex items-center gap-3">
              {multipleCreatives && (
                <span className="text-xs text-gray-400 font-medium">
                  {selectedForExport.size} of {creatives.length} selected
                </span>
              )}
              <button
                onClick={handleExportSelected}
                disabled={selectedForExport.size === 0}
                className={`px-5 py-2.5 font-semibold rounded-xl text-sm flex items-center gap-2 ${
                  selectedForExport.size === 0
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-indigo-500 hover:bg-indigo-600 text-white"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Export{selectedForExport.size > 0 && selectedForExport.size < creatives.length ? ` (${selectedForExport.size})` : ""}
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-200 border-t-indigo-500 mb-3" />
            <p className="text-sm text-gray-400">Loading saved creatives...</p>
          </div>
        ) : creatives.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">No creatives saved yet</h2>
            <p className="text-gray-400 mb-6 text-sm">Go to the editor to create and save your banner creatives.</p>
            <Link
              href={`/campaign/${campaignId}/editor`}
              className="inline-block bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-xl text-sm"
            >
              Open Editor
            </Link>
          </div>
        ) : (
          <>
            {/* Select All (only when multiple creatives) */}
            {multipleCreatives && (
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                    allSelected ? "bg-indigo-500 border-indigo-500" : someSelected ? "bg-indigo-200 border-indigo-300" : "border-gray-300"
                  }`}>
                    {allSelected && (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    )}
                    {!allSelected && someSelected && (
                      <span className="w-2.5 h-0.5 bg-white rounded-full" />
                    )}
                  </span>
                  {allSelected ? "Deselect All" : "Select All"} for Export
                </button>
              </div>
            )}

            {/* State Tabs */}
            <div className="flex gap-1.5 mb-8 bg-white rounded-xl border border-gray-100 p-1.5 w-fit" style={{ boxShadow: 'var(--shadow-card)' }}>
              {STATE_ORDER.map((tab) => {
                const count = getStateCount(tab);
                const colors = STATE_COLORS[tab];
                const active = currentTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setCurrentTab(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${
                      active
                        ? `${colors.bg} ${colors.text}`
                        : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {active && <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />}
                    {BANNER_STATE_LABELS[tab]}
                    {count > 0 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        active ? `${colors.bg} ${colors.text}` : "bg-gray-100 text-gray-500"
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
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100" style={{ boxShadow: 'var(--shadow-card)' }}>
                <p className="text-gray-400 text-sm">
                  No {BANNER_STATE_LABELS[currentTab]} state saved yet. Generate it in the editor.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
                {currentItems.map(({ creative, state }) => {
                  const isSelected = selectedForExport.has(creative.id);
                  const creativeIndex = creatives.findIndex((c) => c.id === creative.id) + 1;
                  return (
                    <div
                      key={`${creative.id}-${state.state_type}`}
                      className={`bg-white rounded-2xl border overflow-hidden transition-colors ${
                        isSelected ? "border-indigo-300 ring-2 ring-indigo-100" : "border-gray-100"
                      }`}
                      style={{ boxShadow: 'var(--shadow-card)' }}
                    >
                      {/* Card top bar with selection checkbox, IDs, and delete */}
                      <div className="px-5 py-2.5 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                        <div className="flex items-center gap-3">
                          {multipleCreatives && (
                            <button
                              onClick={() => toggleExportSelection(creative.id)}
                              className="flex items-center"
                              title={isSelected ? "Deselect for export" : "Select for export"}
                            >
                              <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                                isSelected ? "bg-indigo-500 border-indigo-500" : "border-gray-300 hover:border-indigo-300"
                              }`}>
                                {isSelected && (
                                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                )}
                              </span>
                            </button>
                          )}
                          <div className="flex items-center gap-2">
                            <CopyableId
                              label={`${shortId(campaignId)}-${String(creativeIndex).padStart(2, "0")}`}
                              copyValue={`${shortId(campaignId)}-${String(creativeIndex).padStart(2, "0")}`}
                              className="text-xs font-mono text-gray-400"
                            />
                            <span className="text-xs text-gray-300">|</span>
                            <CopyableId
                              label={`CRV-${shortId(creative.id)}`}
                              copyValue={creative.id}
                              className="text-xs font-mono text-gray-400"
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => setDeleteTarget({ id: creative.id, label: creative.variation_label })}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete creative"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>

                      <div
                        className="w-full bg-gray-900 overflow-hidden"
                        style={{
                          aspectRatio: `${creative.format_width}/${creative.format_height}`,
                          maxHeight: "400px",
                        }}
                      >
                        {(state.preview_url || state.image_url) ? (
                          <img
                            src={(state.preview_url || state.image_url)!}
                            alt={`${BANNER_STATE_LABELS[currentTab]} - ${creative.variation_label}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                            Preview not available. Re-save from the editor.
                          </div>
                        )}
                      </div>

                      <div className="px-5 py-3.5 flex items-center justify-between">
                        <div>
                          <span className="text-sm font-bold text-gray-900">
                            {creative.variation_label}
                          </span>
                          <span className="text-xs text-gray-400 ml-2">
                            {creative.format_name} ({creative.format_width}x{creative.format_height})
                          </span>
                        </div>
                        <Link
                          href={`/campaign/${campaignId}/editor`}
                          className="text-xs font-semibold text-indigo-500 hover:text-indigo-700"
                        >
                          Edit
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* All States Overview */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
              <h2 className="text-lg font-bold text-gray-900 mb-5">All States Overview</h2>
              {creatives.map((creative) => {
                const states = bannerStates[creative.id] || [];
                const isSelected = selectedForExport.has(creative.id);
                const creativeIndex = creatives.findIndex((c) => c.id === creative.id) + 1;
                return (
                  <div key={creative.id} className={`mb-6 last:mb-0 p-4 rounded-xl border ${isSelected ? "border-indigo-200 bg-indigo-50/30" : "border-transparent"}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {multipleCreatives && (
                          <button
                            onClick={() => toggleExportSelection(creative.id)}
                            className="flex items-center"
                          >
                            <span className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                              isSelected ? "bg-indigo-500 border-indigo-500" : "border-gray-300"
                            }`}>
                              {isSelected && (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                              )}
                            </span>
                          </button>
                        )}
                        <h3 className="text-sm font-bold text-gray-800">
                          {creative.variation_label}
                        </h3>
                        <span className="text-xs text-gray-400">
                          {creative.format_name} ({creative.format_width}x{creative.format_height})
                        </span>
                        <CopyableId
                          label={`${shortId(campaignId)}-${String(creativeIndex).padStart(2, "0")}`}
                          copyValue={`${shortId(campaignId)}-${String(creativeIndex).padStart(2, "0")}`}
                          className="text-xs font-mono text-gray-300"
                        />
                      </div>
                      <button
                        onClick={() => setDeleteTarget({ id: creative.id, label: creative.variation_label })}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete creative"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                    <div className="grid grid-cols-5 gap-3">
                      {STATE_ORDER.map((stateType) => {
                        const match = states.find((s) => s.state_type === stateType);
                        const hasPreview = match?.preview_url || match?.image_url;
                        const hasData = match?.canvas_json;
                        const previewSrc = match?.preview_url || match?.image_url;
                        const colors = STATE_COLORS[stateType];
                        return (
                          <div key={stateType} className="text-center">
                            <div
                              className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden flex items-center justify-center mb-2"
                              style={{
                                aspectRatio: `${creative.format_width}/${creative.format_height}`,
                                maxHeight: "120px",
                              }}
                            >
                              {previewSrc ? (
                                <img
                                  src={previewSrc}
                                  alt={BANNER_STATE_LABELS[stateType]}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-xs text-gray-300">
                                  {hasData ? "Re-save" : "Empty"}
                                </span>
                              )}
                            </div>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              hasData || hasPreview
                                ? `${colors.bg} ${colors.text}`
                                : "bg-gray-50 text-gray-400"
                            }`}>
                              <span className={`w-1 h-1 rounded-full ${hasData || hasPreview ? colors.dot : "bg-gray-300"}`} />
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
            <div className="flex justify-between items-center mt-8">
              <Link
                href={`/campaign/${campaignId}/editor`}
                className="px-5 py-2.5 border border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-white text-sm"
              >
                Back to Editor
              </Link>
              <button
                onClick={handleExportSelected}
                disabled={selectedForExport.size === 0}
                className={`px-6 py-2.5 font-semibold rounded-xl text-sm ${
                  selectedForExport.size === 0
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-indigo-500 hover:bg-indigo-600 text-white"
                }`}
              >
                Export{selectedForExport.size > 0 && selectedForExport.size < creatives.length ? ` ${selectedForExport.size} Creative${selectedForExport.size !== 1 ? "s" : ""}` : " Creatives"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
