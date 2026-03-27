"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Canvas } from "fabric";
import JSZip from "jszip";
import { supabase } from "@/lib/supabase";
import type { Campaign } from "@/types";

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
    name: string;
    brand_name: string;
    created_at: string;
  };
  creatives: Array<{
    variation_label: string;
    format: {
      name: string;
      width: number;
      height: number;
    };
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

export default function ExportPage() {
  const params = useParams();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [creatives, setCreatives] = useState<CreativeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportState>({});
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());

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
        .select(
          `
          id,
          campaign_id,
          format_name,
          format_width,
          format_height,
          variation_label,
          selected,
          banner_states (
            id,
            creative_id,
            state_type,
            canvas_json,
            image_url,
            preview_url
          )
        `
        )
        .eq("campaign_id", campaignId);

      if (creativesError) throw creativesError;
      setCreatives(creativesData as CreativeData[]);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Parse canvas_json safely: handles both string (text column) and object (jsonb column)
  const parseCanvasJson = (raw: unknown): object | string => {
    if (!raw) return {};
    if (typeof raw === "object") return raw as object;
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    }
    return {};
  };

  const renderCanvasToDataUrl = async (
    canvasJson: string | object,
    width: number,
    height: number
  ): Promise<string> => {
    const parsed = typeof canvasJson === "string" ? parseCanvasJson(canvasJson) : canvasJson;

    const canvasEl = document.createElement("canvas");
    canvasEl.width = width;
    canvasEl.height = height;
    canvasEl.style.position = "fixed";
    canvasEl.style.left = "-9999px";
    canvasEl.style.top = "-9999px";
    canvasEl.style.pointerEvents = "none";
    canvasEl.style.opacity = "0";
    document.body.appendChild(canvasEl);

    const fabricCanvas = new Canvas(canvasEl, { width, height });

    await fabricCanvas.loadFromJSON(parsed);
    fabricCanvas.renderAll();
    await new Promise((r) => setTimeout(r, 100));
    fabricCanvas.renderAll();

    const dataUrl = fabricCanvas.toDataURL({ format: "png", multiplier: 1 });
    fabricCanvas.dispose();
    document.body.removeChild(canvasEl);
    return dataUrl;
  };

  const handleDownloadSinglePng = async (
    creative: CreativeData,
    state: BannerStateData
  ) => {
    const stateKey = `${creative.id}-${state.state_type}`;
    setExportProgress((prev) => ({
      ...prev,
      [creative.id]: { ...prev[creative.id], [state.state_type]: "processing" },
    }));

    try {
      let dataUrl: string;

      if (state.canvas_json) {
        dataUrl = await renderCanvasToDataUrl(
          state.canvas_json,
          creative.format_width,
          creative.format_height
        );
      } else if (state.image_url) {
        const response = await fetch(state.image_url);
        const blob = await response.blob();
        dataUrl = URL.createObjectURL(blob);
      } else {
        throw new Error("No canvas JSON or image URL available");
      }

      const link = document.createElement("a");
      link.href = dataUrl;
      const fileName = `${creative.variation_label}_${state.state_type}_${creative.format_width}x${creative.format_height}.png`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (!state.canvas_json) {
        URL.revokeObjectURL(dataUrl);
      }

      setExportProgress((prev) => ({
        ...prev,
        [creative.id]: { ...prev[creative.id], [state.state_type]: "done" },
      }));

      setTimeout(() => {
        setExportProgress((prev) => ({
          ...prev,
          [creative.id]: {
            ...prev[creative.id],
            [state.state_type]: "idle",
          },
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
      const allStates: BannerState[] = ["scratch", "win", "lose", "redeem", "brand"];

      const configCreatives: ConfigFile["creatives"] = [];

      for (const creative of creatives) {
        if (!creative.selected) continue;

        const creativeConfig: ConfigFile["creatives"][0] = {
          variation_label: creative.variation_label,
          format: {
            name: creative.format_name,
            width: creative.format_width,
            height: creative.format_height,
          },
          states: {},
        };

        for (const state of creative.banner_states) {
          const stateType = state.state_type as BannerState;
          let dataUrl: string | null = null;

          try {
            if (state.canvas_json) {
              dataUrl = await renderCanvasToDataUrl(
                state.canvas_json,
                creative.format_width,
                creative.format_height
              );
            } else if (state.image_url) {
              const response = await fetch(state.image_url);
              const blob = await response.blob();
              dataUrl = URL.createObjectURL(blob);
            }

            if (dataUrl) {
              const base64Data = dataUrl.split(",")[1];
              const fileName = `${creative.variation_label}_${stateType}_${creative.format_width}x${creative.format_height}.png`;
              zip.file(fileName, base64Data, { base64: true });

              (creativeConfig.states as Record<string, { file: string }>)[
                stateType
              ] = {
                file: fileName,
              };

              if (!state.canvas_json) {
                URL.revokeObjectURL(dataUrl);
              }
            }
          } catch (err) {
            console.error(
              `Failed to process ${stateType} for creative ${creative.id}:`,
              err
            );
          }
        }

        configCreatives.push(creativeConfig);
      }

      const config: ConfigFile = {
        campaign: {
          id: campaign!.id,
          name: campaign!.name,
          brand_name: campaign!.brand_name,
          created_at: campaign!.created_at,
        },
        creatives: configCreatives,
        export_date: new Date().toISOString(),
        version: "1.0",
      };

      zip.file("config.json", JSON.stringify(config, null, 2));

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${campaign?.name || "skratchads"}-creatives.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      await supabase
        .from("campaigns")
        .update({ status: "complete" })
        .eq("id", campaignId);

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
      <div className="min-h-[calc(100vh-180px)] bg-slate-100">
        <div className="max-w-[1100px] mx-auto px-8 py-12">
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        </div>
      </div>
    );
  }

  const selectedCreatives = creatives.filter((c) => c.selected);

  return (
    <div className="min-h-[calc(100vh-180px)] bg-slate-100">
      <div className="max-w-[1100px] mx-auto px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Export Creatives</h1>
          <p className="text-gray-700">{campaign?.name}</p>
        </div>

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-semibold">
              Your SkratchAds creatives are ready. Upload this ZIP bundle to
              the SkratchAds campaign manager.
            </p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Preview Grid
          </h2>

          {selectedCreatives.length === 0 ? (
            <p className="text-gray-600 text-center py-8">
              No creatives selected for export
            </p>
          ) : (
            <div className="space-y-8">
              {selectedCreatives.map((creative) => (
                <div
                  key={creative.id}
                  className="border border-gray-200 rounded-lg p-6"
                >
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Variation {creative.variation_label}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {creative.format_name} ({creative.format_width}x
                      {creative.format_height})
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {creative.banner_states.map((state) => {
                      const stateProgress =
                        exportProgress[creative.id]?.[state.state_type] ||
                        "idle";

                      return (
                        <div
                          key={state.id}
                          className="flex flex-col items-center gap-2"
                        >
                          <div className="w-full bg-gray-100 rounded border border-gray-200 flex items-center justify-center overflow-hidden"
                            style={{ aspectRatio: `${creative.format_width}/${creative.format_height}`, maxHeight: "120px" }}
                          >
                            {state.preview_url ? (
                              <img
                                src={state.preview_url}
                                alt={`${state.state_type} preview`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-gray-400 text-xs capitalize">
                                {state.state_type}
                              </span>
                            )}
                          </div>

                          <p className="text-sm font-medium text-gray-700 capitalize">
                            {state.state_type}
                          </p>

                          <button
                            onClick={() =>
                              handleDownloadSinglePng(creative, state)
                            }
                            disabled={stateProgress === "processing"}
                            className={`text-xs px-3 py-1 rounded transition-colors ${
                              stateProgress === "processing"
                                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                : stateProgress === "done"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                            }`}
                          >
                            {stateProgress === "processing"
                              ? "Processing..."
                              : stateProgress === "done"
                                ? "Downloaded"
                                : "Download PNG"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Bundle Contents
          </h2>
          <p className="text-gray-600 mb-4">Your ZIP file will include:</p>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold mt-1">.</span>
              <span>PNG images for all 5 banner states (scratch, win, lose, redeem, brand) from canvas data</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold mt-1">.</span>
              <span>config.json with campaign metadata and image references</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold mt-1">.</span>
              <span>Ready to upload to SkratchAds campaign manager</span>
            </li>
          </ul>
        </div>

        <div className="flex justify-end gap-4">
          <a
            href={`/campaign/${campaignId}/variations`}
            className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Back to Variations
          </a>

          <button
            onClick={handleExportZip}
            disabled={selectedCreatives.length === 0 || exporting}
            className={`px-8 py-3 rounded-lg font-semibold transition-colors ${
              selectedCreatives.length === 0
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            {exporting ? "Exporting..." : "Export ZIP"}
          </button>
        </div>
      </div>
    </div>
  );
}
