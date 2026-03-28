"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Canvas } from "fabric";
import JSZip from "jszip";
import { supabase } from "@/lib/supabase";
import type { Campaign } from "@/types";
import CopyableId from "@/components/CopyableId";

type BannerState = "scratch" | "win" | "lose" | "redeem" | "brand";

interface BannerStateData {
  id: string;
  creative_id: string;
  state_type: BannerState;
  canvas_json: string | null;
  image_url: string | null;
  preview_url: string | null;
}

interface CreativeData {
  id: string;
  campaign_id: string;
  format_name: string;
  format_width: number;
  format_height: number;
  variation_label: string;
  selected: boolean;
  banner_states: BannerStateData[];
}

interface CampaignData {
  id: string;
  name: string;
  brand_name: string;
  status: string;
  created_at: string;
}

interface ExportState {
  [creativeId: string]: {
    [state: string]: "idle" | "processing" | "done" | "error";
  };
}

interface ConfigFile {
  campaign: {
    id: string;
    campaign_short_id: string;
    name: string;
    brand_name: string;
    created_at: string;
  };
  creatives: Array<{
    creative_id: string;
    creative_short_id: string;
    campaign_sub_id: string;
    variation_label: string;
    format: { name: string; width: number; height: number };
    states: {
      scratch?: { file: string };
      win?: { file: string };
      lose?: { file: string };
      redeem?: { file: string };
      brand?: { file: string };
    };
  }>;
  export_date: string;
  version: string;
}

function shortId(uuid: string): string {
  return uuid.slice(0, 8).toUpperCase();
}

export default function ExportPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [creatives, setCreatives] = useState<CreativeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportState>({});

  // Selection state: initialized from query param or defaults to all
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
      setCampaign(campaignData as CampaignData);

      const { data: creativesData, error: creativesError } = await supabase
        .from("creatives")
        .select(`
          id, campaign_id, format_name, format_width, format_height, variation_label, selected,
          banner_states ( id, creative_id, state_type, canvas_json, image_url, preview_url )
        `)
        .eq("campaign_id", campaignId);

      if (creativesError) throw creativesError;
      const allCreatives = creativesData as CreativeData[];
      setCreatives(allCreatives);

      // Initialize selection from query param or select all
      const selectedParam = searchParams.get("selected");
      if (selectedParam) {
        const ids = selectedParam.split(",").filter(Boolean);
        setSelectedIds(new Set(ids));
      } else {
        setSelectedIds(new Set(allCreatives.map((c) => c.id)));
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === creatives.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(creatives.map((c) => c.id)));
    }
  };

  const parseCanvasJson = (raw: unknown): object | string => {
    if (!raw) return {};
    if (typeof raw === "object") return raw as object;
    if (typeof raw === "string") {
      try { return JSON.parse(raw); } catch { return raw; }
    }
    return {};
  };

  const renderCanvasToDataUrl = async (canvasJson: string | object, width: number, height: number): Promise<string> => {
    const parsed = typeof canvasJson === "string" ? parseCanvasJson(canvasJson) : canvasJson;
    const canvasEl = document.createElement("canvas");
    canvasEl.width = width;
    canvasEl.height = height;
    canvasEl.style.cssText = "position:fixed;left:-9999px;top:-9999px;pointer-events:none;opacity:0";
    document.body.appendChild(canvasEl);
    try {
      const fabricCanvas = new Canvas(canvasEl, { width, height });
      await fabricCanvas.loadFromJSON(parsed);
      fabricCanvas.renderAll();
      await new Promise((r) => setTimeout(r, 200));
      fabricCanvas.renderAll();
      const dataUrl = fabricCanvas.toDataURL({ format: "png", multiplier: 1 });
      fabricCanvas.dispose();
      document.body.removeChild(canvasEl);
      return dataUrl;
    } catch (err) {
      document.body.removeChild(canvasEl);
      throw err;
    }
  };

  const extractBgImageUrl = (canvasJson: string | object | null): string | null => {
    if (!canvasJson) return null;
    try {
      const parsed = typeof canvasJson === "string" ? JSON.parse(canvasJson) : canvasJson;
      const objects = (parsed as { objects?: Array<{ type?: string; src?: string }> }).objects || [];
      for (const obj of objects) {
        if ((obj.type === "Image" || obj.type === "image") && obj.src) {
          return obj.src;
        }
      }
    } catch { /* skip */ }
    return null;
  };

  const imageUrlToDataUrl = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url, { mode: "cors" });
      if (response.ok) {
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    } catch { /* CORS failed */ }
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext("2d");
        if (!ctx) { reject(new Error("No canvas context")); return; }
        ctx.drawImage(img, 0, 0);
        try { resolve(c.toDataURL("image/png")); } catch (e) { reject(e); }
      };
      img.onerror = () => reject(new Error(`Image load failed: ${url}`));
      img.src = url;
    });
  };

  const getStateDataUrl = async (state: BannerStateData, width: number, height: number): Promise<string | null> => {
    if (state.canvas_json) {
      try { return await renderCanvasToDataUrl(state.canvas_json, width, height); }
      catch (err) { console.warn(`Canvas render failed for ${state.state_type}, trying fallbacks:`, err); }
    }
    if (state.preview_url) {
      try {
        if (state.preview_url.startsWith("data:")) return state.preview_url;
        return await imageUrlToDataUrl(state.preview_url);
      } catch (err) { console.warn(`Preview URL fetch failed for ${state.state_type}:`, err); }
    }
    if (state.image_url) {
      try { return await imageUrlToDataUrl(state.image_url); }
      catch (err) { console.warn(`Image URL fetch failed for ${state.state_type}:`, err); }
    }
    if (state.canvas_json) {
      const bgUrl = extractBgImageUrl(state.canvas_json);
      if (bgUrl && bgUrl.startsWith("http")) {
        try { return await imageUrlToDataUrl(bgUrl); }
        catch (err) { console.warn(`BG image extract failed for ${state.state_type}:`, err); }
      }
    }
    return null;
  };

  const getDateStamp = (): string => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // Map internal state_type names to user-friendly download filenames.
  // Numeric prefix ensures correct sort order when unzipped.
  const stateFileLabel: Record<string, string> = {
    scratch: "1-Scratch-to-Win",
    win: "2-Win",
    lose: "3-Lose",
    redeem: "4-Redeem",
    brand: "5-Default",
  };

  const handleDownloadSinglePng = async (creative: CreativeData, state: BannerStateData) => {
    setExportProgress((prev) => ({
      ...prev,
      [creative.id]: { ...prev[creative.id], [state.state_type]: "processing" },
    }));
    try {
      const dataUrl = await getStateDataUrl(state, creative.format_width, creative.format_height);
      if (!dataUrl) throw new Error("No renderable content available");
      let blobUrl: string;
      if (dataUrl.startsWith("data:")) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        blobUrl = URL.createObjectURL(blob);
      } else {
        blobUrl = dataUrl;
      }
      const dateStamp = getDateStamp();
      const link = document.createElement("a");
      link.href = blobUrl;
      const friendlyState = stateFileLabel[state.state_type] || state.state_type;
      link.download = `${shortId(campaignId)}_${creative.variation_label}_${friendlyState}_${creative.format_width}x${creative.format_height}_${dateStamp}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (blobUrl.startsWith("blob:")) URL.revokeObjectURL(blobUrl);
      setExportProgress((prev) => ({
        ...prev,
        [creative.id]: { ...prev[creative.id], [state.state_type]: "done" },
      }));
      setTimeout(() => {
        setExportProgress((prev) => ({
          ...prev,
          [creative.id]: { ...prev[creative.id], [state.state_type]: "idle" },
        }));
      }, 2000);
    } catch (err) {
      console.error("Failed to download PNG:", err);
      setExportProgress((prev) => ({
        ...prev,
        [creative.id]: { ...prev[creative.id], [state.state_type]: "error" },
      }));
    }
  };

  const handleExportZip = async () => {
    setExporting(true);
    try {
      const zip = new JSZip();
      const configCreatives: ConfigFile["creatives"] = [];
      const creativesToExport = creatives.filter((c) => selectedIds.has(c.id));

      for (let idx = 0; idx < creativesToExport.length; idx++) {
        const creative = creativesToExport[idx];
        if (!creative.selected && creative.banner_states.length === 0) continue;

        const creativeIndex = creatives.indexOf(creative) + 1;
        const creativeConfig: ConfigFile["creatives"][0] = {
          creative_id: creative.id,
          creative_short_id: `CRV-${shortId(creative.id)}`,
          campaign_sub_id: `${shortId(campaignId)}-${String(creativeIndex).padStart(2, "0")}`,
          variation_label: creative.variation_label,
          format: { name: creative.format_name, width: creative.format_width, height: creative.format_height },
          states: {},
        };

        for (const state of creative.banner_states) {
          const stateType = state.state_type as BannerState;
          try {
            const dataUrl = await getStateDataUrl(state, creative.format_width, creative.format_height);
            if (dataUrl) {
              let base64Data: string;
              if (dataUrl.startsWith("data:")) {
                base64Data = dataUrl.split(",")[1];
              } else {
                const fetched = await imageUrlToDataUrl(dataUrl);
                base64Data = fetched.split(",")[1];
              }
              const friendlyState = stateFileLabel[stateType] || stateType;
              const fileName = `${shortId(campaignId)}_${creative.variation_label}_${friendlyState}_${creative.format_width}x${creative.format_height}_${getDateStamp()}.png`;
              zip.file(fileName, base64Data, { base64: true });
              (creativeConfig.states as Record<string, { file: string }>)[stateType] = { file: fileName };
            }
          } catch (err) {
            console.error(`Failed to process ${stateType} for creative ${creative.id}:`, err);
          }
        }
        configCreatives.push(creativeConfig);
      }

      const config: ConfigFile = {
        campaign: {
          id: campaign!.id,
          campaign_short_id: shortId(campaign!.id),
          name: campaign!.name,
          brand_name: campaign!.brand_name,
          created_at: campaign!.created_at,
        },
        creatives: configCreatives,
        export_date: new Date().toISOString(),
        version: "1.1",
      };
      zip.file("config.json", JSON.stringify(config, null, 2));

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${campaign?.name || "skratchads"}-creatives_${getDateStamp()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      await supabase.from("campaigns").update({ status: "complete" }).eq("id", campaignId);
      setSuccessMessage(true);
      setTimeout(() => setSuccessMessage(false), 5000);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-180px)]">
        <div className="max-w-[1200px] mx-auto px-6 py-10">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-200 border-t-indigo-500 mb-3" />
            <p className="text-sm text-gray-400">Loading export data...</p>
          </div>
        </div>
      </div>
    );
  }

  const exportableCreatives = creatives.filter((c) => c.selected || c.banner_states.length > 0);
  const selectedCreatives = exportableCreatives.filter((c) => selectedIds.has(c.id));
  const multipleCreatives = exportableCreatives.length > 1;
  const allSelected = exportableCreatives.length > 0 && selectedIds.size === exportableCreatives.length;

  return (
    <div className="min-h-[calc(100vh-180px)]">
      <div className="max-w-[1200px] mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <a
            href={`/campaign/${campaignId}/variations`}
            className="text-sm text-indigo-500 hover:text-indigo-700 mb-3 inline-flex items-center gap-1 font-medium"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Saved Creatives
          </a>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Export Creatives</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {campaign?.name}
                <CopyableId label={`Campaign ID: ${shortId(campaignId)}`} copyValue={campaignId} className="ml-2 text-xs text-gray-400 font-mono" />
              </p>
            </div>
            {multipleCreatives && (
              <span className="text-sm text-gray-400 font-medium">
                {selectedCreatives.length} of {exportableCreatives.length} selected for export
              </span>
            )}
          </div>
        </div>

        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <p className="text-emerald-700 font-medium text-sm">
              Your SkratchAds&trade; creatives are ready. Upload this ZIP bundle to the SkratchAds&trade; campaign manager.
            </p>
          </div>
        )}

        {/* Select All (only for multiple creatives) */}
        {multipleCreatives && (
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                allSelected ? "bg-indigo-500 border-indigo-500" : selectedIds.size > 0 ? "bg-indigo-200 border-indigo-300" : "border-gray-300"
              }`}>
                {allSelected && (
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                )}
                {!allSelected && selectedIds.size > 0 && (
                  <span className="w-2.5 h-0.5 bg-white rounded-full" />
                )}
              </span>
              {allSelected ? "Deselect All" : "Select All"}
            </button>
          </div>
        )}

        {/* Preview Grid */}
        <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-lg font-bold text-gray-900 mb-6">Preview Grid</h2>

          {exportableCreatives.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-sm">No creatives available for export</p>
            </div>
          ) : (
            <div className="space-y-8">
              {exportableCreatives.map((creative) => {
                const isSelected = selectedIds.has(creative.id);
                const creativeIndex = creatives.indexOf(creative) + 1;
                const subId = `${shortId(campaignId)}-${String(creativeIndex).padStart(2, "0")}`;
                return (
                  <div
                    key={creative.id}
                    className={`border rounded-xl p-6 transition-colors ${
                      isSelected ? "border-indigo-200 bg-indigo-50/20" : "border-gray-100 opacity-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {multipleCreatives && (
                          <button
                            onClick={() => toggleSelection(creative.id)}
                            className="flex items-center"
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
                        <div>
                          <h3 className="text-base font-bold text-gray-900">{creative.variation_label}</h3>
                          <p className="text-sm text-gray-400">
                            {creative.format_name} ({creative.format_width}x{creative.format_height})
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <CopyableId label={subId} copyValue={subId} className="text-xs font-mono text-gray-400 block" />
                        <CopyableId label={`CRV-${shortId(creative.id)}`} copyValue={creative.id} className="text-xs font-mono text-gray-300" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {(["scratch", "win", "lose", "redeem", "brand"] as BannerState[])
                        .map((stateType) => creative.banner_states.find((s) => s.state_type === stateType))
                        .filter((state): state is BannerStateData => !!state)
                        .map((state) => {
                        const stateProgress = exportProgress[creative.id]?.[state.state_type] || "idle";
                        const stateLabel: Record<string, string> = { scratch: "Scratch-to-Win", win: "Win", lose: "Lose", redeem: "Redeem", brand: "Default" };
                        return (
                          <div key={state.id} className="flex flex-col items-center gap-2">
                            <div
                              className="w-full bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center overflow-hidden"
                              style={{ aspectRatio: `${creative.format_width}/${creative.format_height}`, maxHeight: "120px" }}
                            >
                              {(state.preview_url || state.image_url) ? (
                                <img src={state.preview_url || state.image_url || ""} alt={`${stateLabel[state.state_type] || state.state_type} preview`} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-gray-300 text-xs">{stateLabel[state.state_type] || state.state_type}</span>
                              )}
                            </div>
                            <p className="text-sm font-medium text-gray-600">{stateLabel[state.state_type] || state.state_type}</p>
                            <button
                              onClick={() => handleDownloadSinglePng(creative, state)}
                              disabled={stateProgress === "processing"}
                              className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
                                stateProgress === "processing"
                                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                  : stateProgress === "done"
                                    ? "bg-emerald-50 text-emerald-600"
                                    : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                              }`}
                            >
                              {stateProgress === "processing" ? "Processing..." : stateProgress === "done" ? "Downloaded" : "Download PNG"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bundle Info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Bundle Contents</h2>
          <p className="text-gray-500 text-sm mb-4">Your ZIP file will include:</p>
          <div className="space-y-2.5">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <div className="w-6 h-6 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              PNG images for {selectedCreatives.length} creative{selectedCreatives.length !== 1 ? "s" : ""} across 5 banner states
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <div className="w-6 h-6 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              config.json with campaign ID, creative IDs, and image references
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <div className="w-6 h-6 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              Ready to upload to SkratchAds&trade; campaign manager
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <a
            href={`/campaign/${campaignId}/variations`}
            className="px-5 py-2.5 border border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 text-sm"
          >
            Back to Variations
          </a>

          <button
            onClick={handleExportZip}
            disabled={selectedCreatives.length === 0 || exporting}
            className={`px-6 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 ${
              selectedCreatives.length === 0
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-indigo-500 hover:bg-indigo-600 text-white"
            }`}
          >
            {exporting ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Exporting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Export ZIP{selectedCreatives.length < exportableCreatives.length ? ` (${selectedCreatives.length})` : ""}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
