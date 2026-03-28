"use client";

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Canvas, Textbox, FabricImage, FabricObject, Shadow } from "fabric";
import { supabase } from "@/lib/supabase";
import { BANNER_FORMATS } from "@/types";
import type { Campaign, BannerState } from "@/types";
import { generateBannerVariations } from "@/lib/nanoBanana";
import type { GeneratedBanner } from "@/lib/nanoBanana";
import { buildAllStatePrompts } from "@/lib/promptEngine";
import type { PromptContext } from "@/lib/promptEngine";
import { trackGenerationStarted, trackGenerationCompleted, trackGenerationFailed, trackDraftSaved, trackBannerStateSwitch } from "@/lib/analytics";
import { TEMPLATES, TEMPLATE_CATEGORIES } from "@/lib/templates";
import type { BannerTemplate } from "@/lib/templates";

type CanvasState = Record<BannerState, string | null>;

interface CustomFont {
  name: string;
  url: string;
}

interface StateCustomization {
  brandColor: string;
  backgroundColor: string;
  headline: string;
  cta: string;
  prizeText: string;
  fontFamily: string;
  fontSize: number;
}

const DEFAULT_STATE_CUSTOMIZATIONS: Record<BannerState, StateCustomization> = {
  scratch: { brandColor: "#3B82F6", backgroundColor: "#FFFFFF", headline: "Scratch Now", cta: "Scratch Now", prizeText: "Grand Prize", fontFamily: "Arial", fontSize: 16 },
  win: { brandColor: "#10B981", backgroundColor: "#FFFFFF", headline: "Claim Prize", cta: "Claim Prize", prizeText: "Grand Prize", fontFamily: "Arial", fontSize: 16 },
  lose: { brandColor: "#F59E0B", backgroundColor: "#FFFFFF", headline: "Try Again", cta: "Try Again", prizeText: "", fontFamily: "Arial", fontSize: 16 },
  redeem: { brandColor: "#8B5CF6", backgroundColor: "#FFFFFF", headline: "Redeem Now", cta: "Redeem Now", prizeText: "Your Prize", fontFamily: "Arial", fontSize: 16 },
  brand: { brandColor: "#3B82F6", backgroundColor: "#FFFFFF", headline: "Learn More", cta: "Learn More", prizeText: "", fontFamily: "Arial", fontSize: 16 },
};

interface EditorSettings {
  format: (typeof BANNER_FORMATS)[number] | null;
  customWidth: number;
  customHeight: number;
  brandColor: string;
  backgroundColor: string;
  headline: string;
  cta: string;
  prizeText: string;
  logoUrl: string;
  bgImageUrl: string;
  fontFamily: string;
  fontSize: number;
}

const DEFAULT_FONTS = [
  "Arial",
  "Helvetica",
  "Georgia",
  "Times New Roman",
  "Courier New",
  "Verdana",
  "Impact",
  "Comic Sans MS",
  "Trebuchet MS",
  "Palatino",
];

const BANNER_STATES: BannerState[] = ["scratch", "win", "lose", "redeem", "brand"];
const BANNER_STATE_LABELS: Record<BannerState, string> = {
  scratch: "Scratch-to-Win",
  win: "Win",
  lose: "Lose",
  redeem: "Redeem",
  brand: "Default",
};

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const [maxDisplayWidth, setMaxDisplayWidth] = useState(400);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  // Multi-variation support: track which creative we're editing
  const [activeCreativeId, setActiveCreativeId] = useState<string | null>(null);
  const [campaignCreatives, setCampaignCreatives] = useState<Array<{ id: string; variation_label: string; format_name: string; format_width: number; format_height: number }>>([]);
  const [currentTab, setCurrentTab] = useState<BannerState>("scratch");
  // Incrementing this counter forces the canvas init useEffect to re-run
  // (e.g. after AI generation when currentTab hasn't changed).
  const [canvasRefreshKey, setCanvasRefreshKey] = useState(0);
  const [formatType, setFormatType] = useState<string>("Mobile Banner");
  const [isCustom, setIsCustom] = useState(false);
  const [canvasStates, setCanvasStates] = useState<CanvasState>({
    scratch: null,
    win: null,
    lose: null,
    redeem: null,
    brand: null,
  });
  // Ref mirror of canvasStates so save functions always read the latest values
  // (React's async setState can cause stale reads in getLatestCanvasStates)
  const canvasStatesRef = useRef<CanvasState>(canvasStates);
  useEffect(() => {
    canvasStatesRef.current = canvasStates;
  }, [canvasStates]);
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [customFonts, setCustomFonts] = useState<CustomFont[]>([]);
  const [isUploadingFont, setIsUploadingFont] = useState(false);
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);
  const [dragOverLogo, setDragOverLogo] = useState(false);
  const [dragOverBg, setDragOverBg] = useState(false);
  const [bgEditMode, setBgEditMode] = useState(false);
  const [bgOpacity, setBgOpacity] = useState(100);
  const [aiSuggestions, setAiSuggestions] = useState<GeneratedBanner[]>([]);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [selectedFormats, setSelectedFormats] = useState<string[]>(["Mobile Banner"]);
  const [generatingAllStates, setGeneratingAllStates] = useState(false);
  const [generatingStatesProgress, setGeneratingStatesProgress] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };
  const [researchPromptContext, setResearchPromptContext] = useState<{
    brandName?: string;
    industry?: string;
    audience?: string;
    researchContext?: string;
    selectedCopy?: { headline: string; cta: string } | null;
    selectedPrize?: { prize: string; relevanceScore: number; rationale: string } | null;
  } | null>(null);
  const [showCampaignSettings, setShowCampaignSettings] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateFilter, setTemplateFilter] = useState("all");

  const applyTemplate = (template: BannerTemplate) => {
    setSettings((prev) => ({
      ...prev,
      backgroundColor: template.backgroundColor,
      fontFamily: template.fontFamily,
      fontSize: template.fontSize,
      brandColor: template.states[currentTab].brandColor,
      headline: template.states[currentTab].cta,
      cta: template.states[currentTab].cta,
      prizeText: template.states[currentTab].prizeText,
    }));
    setStateCustomizations((prev) => {
      const next = { ...prev };
      for (const state of Object.keys(template.states) as BannerState[]) {
        next[state] = { ...template.states[state] };
      }
      return next;
    });
    setShowTemplates(false);
    showToast(`Applied "${template.name}" template.`, "success");
  };
  const [campaignEdits, setCampaignEdits] = useState({ name: "", brandName: "", targetAudience: "", industry: "", websiteUrl: "" });
  const [isSavingCampaign, setIsSavingCampaign] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Cache preview data URLs captured during generation (avoids CORS issues with offscreen re-render)
  const previewCacheRef = useRef<Record<BannerState, string | null>>({
    scratch: null, win: null, lose: null, redeem: null, brand: null,
  });
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [previewSnapshots, setPreviewSnapshots] = useState<Record<BannerState, string | null>>({
    scratch: null,
    win: null,
    lose: null,
    redeem: null,
    brand: null,
  });
  const [previewPhase, setPreviewPhase] = useState<BannerState>("scratch");
  const previewIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [savedBannerStates, setSavedBannerStates] = useState<Record<BannerState, boolean>>({
    scratch: false, win: false, lose: false, redeem: false, brand: false,
  });
  // phaseTimerRef removed - no longer auto-cycling
  // Guard flag to prevent re-entrant canvas snapshot captures (avoids infinite loops)
  const isCapturingRef = useRef(false);
  // Flag to suppress canvas change events during bulk operations (loadFromJSON, generation)
  const suppressCanvasEventsRef = useRef(false);

  // Per-state customizations (headline, CTA, colors, font per banner type)
  const [stateCustomizations, setStateCustomizations] = useState<Record<BannerState, StateCustomization>>(
    () => JSON.parse(JSON.stringify(DEFAULT_STATE_CUSTOMIZATIONS))
  );

  const [settings, setSettings] = useState<EditorSettings>({
    format: BANNER_FORMATS[0],
    customWidth: 320,
    customHeight: 50,
    brandColor: DEFAULT_STATE_CUSTOMIZATIONS.scratch.brandColor,
    backgroundColor: DEFAULT_STATE_CUSTOMIZATIONS.scratch.backgroundColor,
    headline: DEFAULT_STATE_CUSTOMIZATIONS.scratch.headline,
    cta: DEFAULT_STATE_CUSTOMIZATIONS.scratch.cta,
    prizeText: DEFAULT_STATE_CUSTOMIZATIONS.scratch.prizeText,
    logoUrl: "",
    bgImageUrl: "",
    fontFamily: DEFAULT_STATE_CUSTOMIZATIONS.scratch.fontFamily,
    fontSize: DEFAULT_STATE_CUSTOMIZATIONS.scratch.fontSize,
  });

  // Get canvas dimensions
  const getCanvasWidth = useCallback(() => {
    if (isCustom) return settings.customWidth;
    return settings.format?.width || 320;
  }, [isCustom, settings.customWidth, settings.format]);

  const getCanvasHeight = useCallback(() => {
    if (isCustom) return settings.customHeight;
    return settings.format?.height || 50;
  }, [isCustom, settings.customHeight, settings.format]);

  const canvasWidth = getCanvasWidth();
  const canvasHeight = getCanvasHeight();

  // Synchronous initial measurement so the very first render uses the real
  // container width instead of the 600px fallback.  useLayoutEffect fires
  // before the browser paints, guaranteeing `scale` is correct before the
  // canvas-init useEffect runs.
  const measureContainer = useCallback(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    const cs = getComputedStyle(el);
    const padL = parseFloat(cs.paddingLeft) || 0;
    const padR = parseFloat(cs.paddingRight) || 0;
    const available = el.clientWidth - padL - padR;
    if (available > 0) setMaxDisplayWidth(available);
  }, []);

  useLayoutEffect(() => {
    measureContainer();
  }, [measureContainer]);

  // Keep tracking size changes after mount (window resize, sidebar toggle, etc.)
  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => measureContainer());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureContainer]);

  const scale = Math.min(maxDisplayWidth / canvasWidth, 400 / canvasHeight);

  // Fetch campaign and load existing creative if available
  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const { data, error } = await supabase
          .from("campaigns")
          .select("*")
          .eq("id", campaignId)
          .single();

        if (error) throw error;
        setCampaign(data);
        // Extract websiteUrl from campaign_brief JSON if available
        let websiteUrl = data.website_url || "";
        if (!websiteUrl && data.campaign_brief) {
          try {
            const brief = typeof data.campaign_brief === "string" ? JSON.parse(data.campaign_brief) : data.campaign_brief;
            websiteUrl = brief.websiteUrl || "";
          } catch { /* ignore */ }
        }
        setCampaignEdits({
          name: data.name || "",
          brandName: data.brandName || data.brand_name || "",
          targetAudience: data.targetAudience || data.target_audience || "",
          industry: data.industry || "",
          websiteUrl,
        });

        // Load research prompt context if available (from research phase)
        if (data.research_prompt_context) {
          try {
            const ctx = typeof data.research_prompt_context === "string"
              ? JSON.parse(data.research_prompt_context)
              : data.research_prompt_context;
            setResearchPromptContext(ctx);
          } catch {
            // ignore parse errors
          }
        }

        // Parse campaign_brief for bannerDescription to use in AI prompts
        if (data.campaign_brief) {
          try {
            const brief = typeof data.campaign_brief === "string"
              ? JSON.parse(data.campaign_brief)
              : data.campaign_brief;
            if (brief.bannerDescription) {
              setResearchPromptContext((prev) => ({
                ...prev,
                researchContext: [prev?.researchContext, `Banner style direction: ${brief.bannerDescription}`].filter(Boolean).join(". "),
              }));
            }
          } catch {
            // ignore
          }
        }

        // Load ALL creatives for this campaign (multi-variation support)
        const { data: creatives } = await supabase
          .from("creatives")
          .select("*")
          .eq("campaign_id", campaignId)
          .order("created_at", { ascending: true });

        if (creatives && creatives.length > 0) {
          setCampaignCreatives(creatives.map((c: any) => ({
            id: c.id,
            variation_label: c.variation_label,
            format_name: c.format_name,
            format_width: c.format_width,
            format_height: c.format_height,
          })));
          // Load the most recently created creative by default
          const creative = creatives[creatives.length - 1];
          setActiveCreativeId(creative.id);

          // Restore format settings
          const matchedFormat = BANNER_FORMATS.find(
            (f) => f.name === creative.format_name
          );
          if (matchedFormat) {
            setFormatType(matchedFormat.name);
            setSettings((prev) => ({ ...prev, format: matchedFormat }));
            setIsCustom(false);
          } else if (creative.format_width && creative.format_height) {
            setIsCustom(true);
            setSettings((prev) => ({
              ...prev,
              customWidth: creative.format_width,
              customHeight: creative.format_height,
            }));
          }

          // Load banner states from DB
          const { data: bannerStates } = await supabase
            .from("banner_states")
            .select("*")
            .eq("creative_id", creative.id);

          if (bannerStates && bannerStates.length > 0) {
            const loadedStates: CanvasState = {
              scratch: null,
              win: null,
              lose: null,
              redeem: null,
              brand: null,
            };
            const loadedSaved: Record<BannerState, boolean> = {
              scratch: false, win: false, lose: false, redeem: false, brand: false,
            };
            for (const bs of bannerStates) {
              if (bs.state_type in loadedStates) {
                loadedStates[bs.state_type as BannerState] = bs.canvas_json;
                // Only show checkmark if canvas JSON actually contains a background image
                loadedSaved[bs.state_type as BannerState] = canvasJsonHasBgImage(bs.canvas_json);
              }
            }
            setCanvasStates(loadedStates);
            canvasStatesRef.current = loadedStates;
            setSavedBannerStates(loadedSaved);
            // Force canvas re-init now that DB states are loaded.
            // The canvas init useEffect excludes canvasStates from its deps
            // (to avoid destroy/recreate on every edit), so we bump the
            // refresh key to make it pick up the newly loaded JSON.
            setCanvasRefreshKey((k) => k + 1);
          }
        }
      } catch (err) {
        console.error("Failed to fetch campaign:", err);
      }
    };

    fetchCampaign();
  }, [campaignId]);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const fabricCanvas = new Canvas(canvasRef.current, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: settings.backgroundColor,
    });

    // Set display (CSS) dimensions to the scaled size so Fabric.js correctly
    // maps pointer events. This replaces the CSS transform: scale() approach
    // which broke all mouse interactions (drag, click, resize).
    fabricCanvas.setDimensions(
      { width: canvasWidth * scale, height: canvasHeight * scale },
      { cssOnly: true }
    );

    fabricCanvasRef.current = fabricCanvas;

    // Load saved state if exists — prefer ref (always up-to-date) over React state (may be stale)
    const savedState = canvasStatesRef.current[currentTab] || canvasStates[currentTab];
    if (savedState) {
      // Suppress canvas change events during initial load to prevent freeze loops
      suppressCanvasEventsRef.current = true;
      try {
        // Sync bgImageUrl and bgOpacity from the JSON BEFORE loading into canvas
        // This is more reliable than inspecting live canvas objects after loadFromJSON
        const bgInJson = findBgImageInJson(savedState);
        if (bgInJson) {
          const src = bgInJson.src || "loaded";
          setSettings((prev) => ({ ...prev, bgImageUrl: src }));
          setBgOpacity(Math.round((bgInJson.opacity ?? 1) * 100));
        } else {
          setSettings((prev) => ({ ...prev, bgImageUrl: "" }));
          setBgOpacity(100);
        }

        fabricCanvas.loadFromJSON(JSON.parse(savedState)).then(() => {
          // Re-tag bg image with _isBg after load (custom props may not survive
          // Fabric.js v6 deserialization). Also re-apply cover-fit via
          // centerBgOnCanvas to guarantee correct alignment regardless of what
          // origin/position values were serialized.
          const objects = fabricCanvas.getObjects();
          let bgObj = objects.find(
            (obj: FabricObject) =>
              obj instanceof FabricImage &&
              ((obj as any)._isBg === true || (!obj.selectable && !obj.evented))
          );
          if (!bgObj && objects.length > 0 && objects[0] instanceof FabricImage) {
            bgObj = objects[0];
          }
          if (bgObj && bgObj instanceof FabricImage) {
            centerBgOnCanvas(bgObj, fabricCanvas);
          }
          fabricCanvas.renderAll();
          // Re-enable events and take initial snapshot
          suppressCanvasEventsRef.current = false;
          try {
            const mult = Math.max(2, Math.ceil(600 / canvasWidth));
            const dataUrl = fabricCanvas.toDataURL({ format: "png", multiplier: mult });
            setPreviewSnapshots((prev) => ({ ...prev, [currentTab]: dataUrl }));
          } catch { /* CORS / tainted canvas */ }
        });
      } catch (e) {
        console.error("Failed to load canvas state:", e);
        suppressCanvasEventsRef.current = false;
      }
    } else {
      // No saved state for this tab, clear bg preview
      setSettings((prev) => ({ ...prev, bgImageUrl: "" }));
      setBgOpacity(100);
    }

    // Selection change handler
    const handleSelectionChange = () => {
      const active = fabricCanvas.getActiveObject();
      setSelectedObject(active || null);
    };

    fabricCanvas.on("selection:created", handleSelectionChange);
    fabricCanvas.on("selection:updated", handleSelectionChange);
    fabricCanvas.on("selection:cleared", () => setSelectedObject(null));

    // Real-time preview sync: update the preview snapshot whenever an object is
    // moved, scaled, rotated, or otherwise modified on the canvas.
    // Uses guard flags to prevent re-entrant calls (which caused page freeze).
    let changeDebounce: ReturnType<typeof setTimeout> | null = null;
    let lastLiveCapture = 0;
    const LIVE_THROTTLE_MS = 60; // ~16fps during drag for smooth preview sync

    // Shared capture logic
    const captureSnapshot = () => {
      if (!fabricCanvasRef.current) return;
      if (suppressCanvasEventsRef.current) return;
      if (isCapturingRef.current) return;
      isCapturingRef.current = true;
      try {
        const mult = Math.max(2, Math.ceil(600 / canvasWidth));
        const dataUrl = fabricCanvasRef.current.toDataURL({ format: "png", multiplier: mult });
        setPreviewSnapshots((prev) => ({ ...prev, [currentTab]: dataUrl }));
      } catch {
        // Ignore CORS / tainted canvas errors for preview capture
      } finally {
        isCapturingRef.current = false;
      }
    };

    // Debounced handler for add/remove/final-modify (bulk operations like loadFromJSON)
    const handleCanvasChange = () => {
      if (!fabricCanvasRef.current) return;
      if (suppressCanvasEventsRef.current) return;
      if (isCapturingRef.current) return;
      if (changeDebounce) clearTimeout(changeDebounce);
      changeDebounce = setTimeout(captureSnapshot, 150);
    };

    // Throttled handler for continuous events (moving, scaling, rotating)
    // so the Live Preview tracks the editor in real time during drag
    const handleLiveChange = () => {
      if (!fabricCanvasRef.current) return;
      if (suppressCanvasEventsRef.current) return;
      if (isCapturingRef.current) return;
      const now = Date.now();
      if (now - lastLiveCapture < LIVE_THROTTLE_MS) return;
      lastLiveCapture = now;
      captureSnapshot();
    };

    fabricCanvas.on("object:modified", handleCanvasChange);
    fabricCanvas.on("object:added", handleCanvasChange);
    fabricCanvas.on("object:removed", handleCanvasChange);
    // Continuous events for real-time preview alignment during drag/scale/rotate
    fabricCanvas.on("object:moving", handleLiveChange);
    fabricCanvas.on("object:scaling", handleLiveChange);
    fabricCanvas.on("object:rotating", handleLiveChange);

    return () => {
      if (changeDebounce) clearTimeout(changeDebounce);
      fabricCanvas.off("selection:created", handleSelectionChange);
      fabricCanvas.off("selection:updated", handleSelectionChange);
      fabricCanvas.off("selection:cleared");
      fabricCanvas.off("object:modified", handleCanvasChange);
      fabricCanvas.off("object:added", handleCanvasChange);
      fabricCanvas.off("object:removed", handleCanvasChange);
      fabricCanvas.off("object:moving", handleLiveChange);
      fabricCanvas.off("object:scaling", handleLiveChange);
      fabricCanvas.off("object:rotating", handleLiveChange);
      fabricCanvas.dispose();
      fabricCanvasRef.current = null;
    };
  // NOTE: canvasStates intentionally omitted — reading from canvasStatesRef.current instead
  // to prevent canvas destruction/recreation on every state update (which breaks controls).
  // canvasRefreshKey is included so we can force a re-init (e.g. after AI generation).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasWidth, canvasHeight, currentTab, canvasRefreshKey]);

  // Keep Fabric's CSS dimensions in sync when the container is measured or
  // resized.  This runs AFTER the canvas init effect and updates only the CSS
  // (display) size without destroying/recreating the Fabric canvas.
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    fabricCanvasRef.current.setDimensions(
      { width: canvasWidth * scale, height: canvasHeight * scale },
      { cssOnly: true },
    );
  }, [canvasWidth, canvasHeight, scale]);

  // Update canvas background color
  useEffect(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.backgroundColor = settings.backgroundColor;
      fabricCanvasRef.current.renderAll();
    }
  }, [settings.backgroundColor]);

  // Save canvas state before switching tabs
  const saveCurrentState = useCallback(() => {
    if (fabricCanvasRef.current) {
      const json = JSON.stringify((fabricCanvasRef.current as any).toJSON(["_isBg", "selectable", "evented"]));
      // Update ref immediately so the next tab load reads fresh data
      canvasStatesRef.current = { ...canvasStatesRef.current, [currentTab]: json };
      setCanvasStates((prev) => ({
        ...prev,
        [currentTab]: json,
      }));
    }
  }, [currentTab]);

  const handleTabChange = (tab: BannerState) => {
    saveCurrentState();
    // Save current tab's customization settings before switching
    setStateCustomizations((prev) => ({
      ...prev,
      [currentTab]: {
        brandColor: settings.brandColor,
        backgroundColor: settings.backgroundColor,
        headline: settings.headline,
        cta: settings.cta,
        prizeText: settings.prizeText,
        fontFamily: settings.fontFamily,
        fontSize: settings.fontSize,
      },
    }));
    // Load new tab's customization settings
    const newTabSettings = stateCustomizations[tab] || DEFAULT_STATE_CUSTOMIZATIONS[tab];

    // Sync bgImageUrl from the target tab's saved canvas JSON so the sidebar
    // "Adjust Background" thumbnail always matches the active banner state.
    const targetJson = canvasStatesRef.current[tab];
    const targetBg = findBgImageInJson(targetJson);
    const targetBgUrl = targetBg?.src || "";
    const targetBgOpacity = targetBg ? Math.round((targetBg.opacity ?? 1) * 100) : 100;

    setSettings((prev) => ({
      ...prev,
      brandColor: newTabSettings.brandColor,
      backgroundColor: newTabSettings.backgroundColor,
      headline: newTabSettings.cta,
      cta: newTabSettings.cta,
      prizeText: newTabSettings.prizeText,
      fontFamily: newTabSettings.fontFamily,
      fontSize: newTabSettings.fontSize,
      bgImageUrl: targetBgUrl,
    }));
    setBgOpacity(targetBgOpacity);
    setCurrentTab(tab);
    setPreviewPhase(tab);
  };

  // Capture current canvas as a snapshot for the active tab
  // Use a higher multiplier for crisp preview snapshots, especially on small banners
  const snapshotMultiplier = Math.max(2, Math.ceil(600 / canvasWidth));

  const captureCurrentTabSnapshot = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    try {
      fabricCanvasRef.current.discardActiveObject();
      fabricCanvasRef.current.renderAll();
      const dataUrl = fabricCanvasRef.current.toDataURL({ format: "png", multiplier: snapshotMultiplier });
      setPreviewSnapshots((prev) => ({ ...prev, [currentTab]: dataUrl }));
    } catch (e) {
      console.error("Failed to capture preview:", e);
    }
  }, [currentTab, snapshotMultiplier]);

  // Build snapshots for all tabs from saved canvas states
  const captureAllSnapshots = useCallback(() => {
    // Always capture the current tab live
    captureCurrentTabSnapshot();

    // For other tabs, render from saved JSON into an offscreen canvas
    const otherTabs = BANNER_STATES.filter((t) => t !== currentTab);
    for (const tab of otherTabs) {
      const json = canvasStates[tab];
      if (json) {
        try {
          const offscreen = document.createElement("canvas");
          offscreen.width = canvasWidth;
          offscreen.height = canvasHeight;
          const offFabric = new Canvas(offscreen, {
            width: canvasWidth,
            height: canvasHeight,
            backgroundColor: settings.backgroundColor,
          });
          offFabric.loadFromJSON(JSON.parse(json)).then(() => {
            // Re-center any background image after deserialization
            // (Fabric v6 can lose originX/originY during loadFromJSON)
            const objs = offFabric.getObjects();
            for (const obj of objs) {
              if ((obj as any)._isBg && obj instanceof FabricImage) {
                centerBgOnCanvas(obj, offFabric);
              }
            }
            offFabric.renderAll();
            const dataUrl = offFabric.toDataURL({ format: "png", multiplier: snapshotMultiplier });
            setPreviewSnapshots((prev) => ({ ...prev, [tab]: dataUrl }));
            offFabric.dispose();
          });
        } catch (e) {
          console.error(`Failed to render ${tab} preview:`, e);
        }
      }
    }
  }, [currentTab, canvasStates, canvasWidth, canvasHeight, settings.backgroundColor, captureCurrentTabSnapshot, snapshotMultiplier]);

  // Live preview: shows the current tab only, no auto-cycling
  // User clicks phase pills to switch. Scratch tab shows "Scratch Here" overlay.
  const toggleLivePreview = useCallback(() => {
    if (showLivePreview) {
      setShowLivePreview(false);
      if (previewIntervalRef.current) {
        clearInterval(previewIntervalRef.current);
        previewIntervalRef.current = null;
      }
    } else {
      captureAllSnapshots();
      setPreviewPhase(currentTab);
      setShowLivePreview(true);
      // Refresh snapshot periodically to pick up canvas edits
      previewIntervalRef.current = setInterval(() => {
        captureAllSnapshots();
      }, 1500);
    }
  }, [showLivePreview, captureAllSnapshots, currentTab]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (previewIntervalRef.current) clearInterval(previewIntervalRef.current);
    };
  }, []);

  const handleFormatChange = (formatName: string) => {
    if (formatName === "Custom") {
      setIsCustom(true);
      setFormatType("Custom");
      setSettings((prev) => ({
        ...prev,
        format: null,
      }));
    } else {
      setIsCustom(false);
      setFormatType(formatName);
      const selected = BANNER_FORMATS.find((f) => f.name === formatName);
      setSettings((prev) => ({
        ...prev,
        format: selected || prev.format,
      }));
    }
  };

  // Add text to canvas
  const addText = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    const text = new Textbox("New Text", {
      left: 10,
      top: 10,
      fontSize: settings.fontSize,
      fontFamily: settings.fontFamily,
      fill: settings.brandColor,
      editable: true,
    });

    fabricCanvasRef.current.add(text);
    fabricCanvasRef.current.setActiveObject(text);
    fabricCanvasRef.current.renderAll();
  }, [settings.fontSize, settings.fontFamily, settings.brandColor]);

  // Emoji categories for the picker
  const EMOJI_CATEGORIES = [
    {
      label: "Popular",
      emojis: ["🎉", "🔥", "⭐", "💰", "🎁", "🏆", "💎", "👑", "🎯", "💥", "✨", "🚀", "❤️", "👍", "🎊", "💫"],
    },
    {
      label: "Celebration",
      emojis: ["🎉", "🎊", "🥳", "🎈", "🎆", "🎇", "🪩", "🎀", "🎗️", "🎟️", "🧧", "🎋", "🎍", "🎄"],
    },
    {
      label: "Money & Shopping",
      emojis: ["💰", "💵", "💸", "💲", "🤑", "💳", "🛍️", "🛒", "🏷️", "🎫", "🎟️", "💎", "📦", "🎁"],
    },
    {
      label: "Hands & Gestures",
      emojis: ["👆", "☝️", "👇", "👈", "👉", "👍", "👏", "🙌", "🤝", "✌️", "🤞", "💪", "🫵", "👋"],
    },
    {
      label: "Symbols & Arrows",
      emojis: ["⬆️", "⬇️", "➡️", "⬅️", "↗️", "↘️", "⚡", "💥", "✅", "❌", "⭕", "❗", "❓", "🔔"],
    },
    {
      label: "Food & Drink",
      emojis: ["🍕", "🍔", "🌮", "🍟", "🍩", "🎂", "🍰", "🧁", "☕", "🍺", "🍷", "🧃", "🍿", "🍫"],
    },
    {
      label: "Faces & Emotions",
      emojis: ["😍", "🤩", "😎", "🥰", "😱", "🤯", "😜", "🥹", "😈", "💀", "🤖", "👻", "😻", "🫡"],
    },
  ];

  // Add emoji to canvas as a text object
  const addEmoji = useCallback((emoji: string) => {
    if (!fabricCanvasRef.current) return;

    const emojiText = new Textbox(emoji, {
      left: 20,
      top: 20,
      fontSize: Math.max(32, Math.min(canvasWidth * 0.15, 64)),
      fontFamily: "Arial",
      width: Math.max(40, Math.min(canvasWidth * 0.2, 80)),
      textAlign: "center",
    });

    fabricCanvasRef.current.add(emojiText);
    fabricCanvasRef.current.setActiveObject(emojiText);
    fabricCanvasRef.current.renderAll();
  }, [canvasWidth]);

  // Text formatting helpers
  const toggleBold = useCallback(() => {
    if (!fabricCanvasRef.current || !selectedObject || !(selectedObject instanceof Textbox)) return;
    selectedObject.set("fontWeight", selectedObject.fontWeight === "bold" ? "normal" : "bold");
    fabricCanvasRef.current.renderAll();
  }, [selectedObject]);

  const toggleItalic = useCallback(() => {
    if (!fabricCanvasRef.current || !selectedObject || !(selectedObject instanceof Textbox)) return;
    selectedObject.set("fontStyle", selectedObject.fontStyle === "italic" ? "normal" : "italic");
    fabricCanvasRef.current.renderAll();
  }, [selectedObject]);

  const toggleUnderline = useCallback(() => {
    if (!fabricCanvasRef.current || !selectedObject || !(selectedObject instanceof Textbox)) return;
    selectedObject.set("underline", !selectedObject.underline);
    fabricCanvasRef.current.renderAll();
  }, [selectedObject]);

  const setTextAlign = useCallback((align: "left" | "center" | "right") => {
    if (!fabricCanvasRef.current || !selectedObject || !(selectedObject instanceof Textbox)) return;
    selectedObject.set("textAlign", align);
    fabricCanvasRef.current.renderAll();
  }, [selectedObject]);

  const setTextColor = useCallback((color: string) => {
    if (!fabricCanvasRef.current || !selectedObject || !(selectedObject instanceof Textbox)) return;
    selectedObject.set("fill", color);
    fabricCanvasRef.current.renderAll();
  }, [selectedObject]);

  const setTextFontSize = useCallback((size: number) => {
    if (!fabricCanvasRef.current || !selectedObject || !(selectedObject instanceof Textbox)) return;
    selectedObject.set("fontSize", size);
    fabricCanvasRef.current.renderAll();
  }, [selectedObject]);

  const setTextFontFamily = useCallback((font: string) => {
    if (!fabricCanvasRef.current || !selectedObject || !(selectedObject instanceof Textbox)) return;
    selectedObject.set("fontFamily", font);
    fabricCanvasRef.current.renderAll();
  }, [selectedObject]);

  // Delete selected object
  const deleteSelected = useCallback(() => {
    if (!fabricCanvasRef.current || !selectedObject) return;

    fabricCanvasRef.current.remove(selectedObject);
    fabricCanvasRef.current.renderAll();
    setSelectedObject(null);
  }, [selectedObject]);

  // Duplicate selected object
  const duplicateSelected = useCallback(async () => {
    if (!fabricCanvasRef.current || !selectedObject) return;

    const cloned = await selectedObject.clone();
    cloned.set({ left: (selectedObject.left || 0) + 20, top: (selectedObject.top || 0) + 20 });
    fabricCanvasRef.current.add(cloned);
    fabricCanvasRef.current.setActiveObject(cloned);
    fabricCanvasRef.current.renderAll();
  }, [selectedObject]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        deleteSelected();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteSelected]);

  // Upload custom font
  const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];
    const validExtensions = [".ttf", ".woff", ".woff2", ".otf"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

    if (!validExtensions.includes(ext)) {
      alert("Please upload a .ttf, .woff, .woff2, or .otf font file");
      return;
    }

    setIsUploadingFont(true);
    try {
      const url = await uploadToSupabase(file, "fonts");
      if (!url) return;

      // Derive a clean font name from filename
      const fontName = file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      // Load the font into the browser via FontFace API
      const fontFace = new FontFace(fontName, `url(${url})`);
      await fontFace.load();
      document.fonts.add(fontFace);

      const newFont: CustomFont = { name: fontName, url };
      setCustomFonts((prev) => [...prev, newFont]);
      setSettings((prev) => ({ ...prev, fontFamily: fontName }));
    } catch (err) {
      console.error("Font upload failed:", err);
      alert("Failed to upload font. Please try a different file.");
    } finally {
      setIsUploadingFont(false);
    }
  };

  // Upload file to Supabase
  const uploadToSupabase = async (
    file: File,
    folder: "logos" | "images" | "fonts"
  ): Promise<string | null> => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        alert("You must be logged in to upload files");
        return null;
      }

      const filename = `${Date.now()}_${file.name}`;
      const path = `${user.id}/${folder}/${filename}`;

      const { data, error } = await supabase.storage
        .from("assets")
        .upload(path, file);

      if (error) throw error;

      const { data: publicUrl } = supabase.storage
        .from("assets")
        .getPublicUrl(data.path);

      return publicUrl.publicUrl;
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Failed to upload file");
      return null;
    }
  };

  // Read a file as a data URL (base64) to avoid CORS issues
  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Process logo file: auto-fit to ~25% of banner width, centered at top
  const processLogoFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setSettings((prev) => ({ ...prev, logoUrl: dataUrl }));

      // Also upload to Supabase in the background for persistence
      uploadToSupabase(file, "logos");

      if (fabricCanvasRef.current) {
        const img = await FabricImage.fromURL(dataUrl);
        const imgW = img.width || 1;
        const imgH = img.height || 1;

        // Size the logo to fit comfortably in the banner: cap at 20% width, 40% height
        const maxW = canvasWidth * 0.2;
        const maxH = canvasHeight * 0.4;
        const fitScale = Math.min(maxW / imgW, maxH / imgH, 1);

        // Position on the right side of the banner, vertically centered, with padding
        const padding = Math.max(6, canvasWidth * 0.03);
        const scaledW = imgW * fitScale;
        const scaledH = imgH * fitScale;

        img.set({
          scaleX: fitScale,
          scaleY: fitScale,
          left: canvasWidth - scaledW - padding,
          top: (canvasHeight - scaledH) / 2,
        });
        fabricCanvasRef.current.add(img);
        fabricCanvasRef.current.setActiveObject(img);
        fabricCanvasRef.current.renderAll();
      }
    } catch (err) {
      console.error("Failed to add logo to canvas:", err);
    }
  };

  // Process background image: cover the entire canvas, maintain aspect ratio
  // Shared helper: remove existing background image (non-selectable, non-evented) before adding a new one
  const removeExistingBackground = () => {
    if (!fabricCanvasRef.current) return;
    const objects = fabricCanvasRef.current.getObjects();
    // Find bg images by marker, by being non-selectable, or as bottom-most image
    const bgObjects = objects.filter(
      (obj) => obj instanceof FabricImage && ((obj as any)._isBg === true || (!obj.selectable && !obj.evented))
    );
    if (bgObjects.length === 0) {
      // Fallback: remove bottom-most FabricImage (bg is always at back)
      const firstImg = objects.find((obj) => obj instanceof FabricImage);
      if (firstImg) fabricCanvasRef.current.remove(firstImg);
    } else {
      bgObjects.forEach((obj) => fabricCanvasRef.current!.remove(obj));
    }
    setBgEditMode(false);
  };

  // Shared helper: centre a background image on the Fabric canvas using cover-fit.
  // Reads the ACTUAL canvas pixel dimensions from the Fabric Canvas object
  // (not React state) and sets left/top so the image is centred.
  const centerBgOnCanvas = (img: InstanceType<typeof FabricImage>, fc: InstanceType<typeof Canvas>) => {
    const cw = fc.getWidth();
    const ch = fc.getHeight();
    const imgW = img.width || 1;
    const imgH = img.height || 1;
    const coverScale = Math.max(cw / imgW, ch / imgH);

    // Always use center origin + canvas midpoint.  This is the simplest
    // formula: put the image centre exactly on the canvas centre.
    img.set({
      scaleX: coverScale,
      scaleY: coverScale,
      originX: "center",
      originY: "center",
      left: cw / 2,
      top: ch / 2,
      selectable: false,
      evented: false,
    });
    (img as any)._isBg = true;

    // Ensure image is on the canvas, then push to back
    if (!img.canvas) fc.add(img);
    img.setCoords();
    fc.sendObjectToBack(img);
  };

  // Shared helper: add an image URL as canvas background (cover-fit, centered, behind everything)
  const applyBackgroundToCanvas = async (imageUrl: string) => {
    const fc = fabricCanvasRef.current;
    if (!fc) return;

    // Ensure suppress flag is cleared so the canvas isn't stuck from a prior operation
    suppressCanvasEventsRef.current = false;

    try {
      removeExistingBackground();

      // Pre-load the image in a plain HTMLImageElement so we get guaranteed
      // naturalWidth/naturalHeight before touching Fabric at all.
      const isDataUrl = imageUrl.startsWith("data:");
      await new Promise<void>((resolve, reject) => {
        const tmp = new Image();
        if (!isDataUrl) tmp.crossOrigin = "anonymous";
        tmp.onload = () => resolve();
        tmp.onerror = () => reject(new Error("Image pre-load failed"));
        tmp.src = imageUrl;
      });

      const img = await FabricImage.fromURL(
        imageUrl,
        isDataUrl ? {} : { crossOrigin: "anonymous" }
      );
      if (!img || !img.width || !img.height) {
        console.error("FabricImage.fromURL returned empty image");
        return;
      }

      centerBgOnCanvas(img, fc);
      fc.renderAll();
      setSettings((prev) => ({ ...prev, bgImageUrl: imageUrl }));
      setBgOpacity(100);
    } catch (err) {
      console.error("Failed to apply background image:", err);
    }
  };

  // Helper: find the background image object in a canvas JSON string.
  // Returns the object (with src, opacity, etc.) or null.
  // Fabric.js serializes type as "Image" (capital I). We also check lowercase for safety.
  // Detection: _isBg marker OR (selectable===false AND evented===false) OR first image at index 0
  const findBgImageInJson = (json: string | null): any | null => {
    if (!json) return null;
    try {
      const parsed = JSON.parse(json);
      const objects = parsed.objects || [];
      // First try explicit markers
      const marked = objects.find(
        (obj: any) =>
          (obj.type === "Image" || obj.type === "image") &&
          (obj._isBg === true || (obj.selectable === false && obj.evented === false))
      );
      if (marked) return marked;
      // Fallback: first image object at position 0 (bg images are always sent to back)
      if (objects.length > 0 && (objects[0].type === "Image" || objects[0].type === "image")) {
        return objects[0];
      }
      return null;
    } catch {
      return null;
    }
  };

  // Shorthand: does this canvas JSON have a bg image?
  const canvasJsonHasBgImage = (json: string | null): boolean => {
    return findBgImageInJson(json) !== null;
  };

  // Helper to find the background image object on canvas.
  // Multiple detection strategies since custom props (_isBg) may not survive
  // Fabric.js v6 loadFromJSON roundtrip:
  // Force-load a specific tab's canvas JSON into the live Fabric canvas.
  // Used after AI generation to ensure the canvas displays the newly generated state
  // even when currentTab hasn't changed (so the init useEffect wouldn't re-run).
  const loadStateIntoCanvas = useCallback((stateJson: string | null) => {
    if (!fabricCanvasRef.current || !stateJson) return;
    // Suppress canvas change events during bulk load to avoid freeze loops
    suppressCanvasEventsRef.current = true;
    try {
      const bgInJson = findBgImageInJson(stateJson);
      if (bgInJson) {
        const src = bgInJson.src || "loaded";
        setSettings((prev) => ({ ...prev, bgImageUrl: src }));
        setBgOpacity(Math.round((bgInJson.opacity ?? 1) * 100));
      }
      fabricCanvasRef.current.loadFromJSON(JSON.parse(stateJson)).then(() => {
        const fc = fabricCanvasRef.current;
        if (!fc) {
          suppressCanvasEventsRef.current = false;
          return;
        }
        const objects = fc.getObjects();
        let bgObj = objects.find(
          (obj: FabricObject) =>
            obj instanceof FabricImage &&
            ((obj as any)._isBg === true || (!obj.selectable && !obj.evented))
        );
        if (!bgObj && objects.length > 0 && objects[0] instanceof FabricImage) {
          bgObj = objects[0];
        }
        if (bgObj && bgObj instanceof FabricImage) {
          centerBgOnCanvas(bgObj, fc);
        }
        fc.renderAll();
        // Re-enable events after load completes, then take one snapshot
        suppressCanvasEventsRef.current = false;
        try {
          const mult = Math.max(2, Math.ceil(600 / (fc.width || 320)));
          const dataUrl = fc.toDataURL({ format: "png", multiplier: mult });
          setPreviewSnapshots((prev) => ({ ...prev, [currentTab]: dataUrl }));
        } catch { /* CORS / tainted canvas */ }
      });
    } catch (e) {
      console.error("Failed to load state into canvas:", e);
      suppressCanvasEventsRef.current = false;
    }
  }, [currentTab, settings.format]);

  // Sync CTA text to the canvas. Creates a textbox if none exists, updates it if one does.
  const syncHeadlineToCanvas = useCallback((newText: string) => {
    const fc = fabricCanvasRef.current;
    if (!fc) return;
    const objects = fc.getObjects();
    const textbox = objects.find(
      (obj) => obj instanceof Textbox && obj.editable !== false
    ) as InstanceType<typeof Textbox> | undefined;

    if (textbox) {
      textbox.set("text", newText);
      fc.renderAll();
    } else if (newText.trim()) {
      // No textbox exists yet — create one centered on the canvas
      const cw = fc.getWidth();
      const ch = fc.getHeight();
      const fontSize = Math.max(14, Math.min(cw * 0.06, 36));
      const tb = new Textbox(newText, {
        left: cw * 0.05,
        top: ch * 0.4,
        width: cw * 0.9,
        fontSize,
        fontFamily: settings.fontFamily || "Arial",
        fontWeight: "bold",
        fill: "#ffffff",
        textAlign: "center",
        editable: true,
        shadow: new Shadow({ color: "rgba(0,0,0,0.7)", blur: 8, offsetX: 0, offsetY: 2 }),
      });
      fc.add(tb);
      fc.renderAll();
    }
  }, [settings.fontFamily]);

  //   1. Explicit _isBg marker (set when we create the bg)
  //   2. Non-selectable, non-evented FabricImage (locked bg)
  //   3. Bottom-most FabricImage on the canvas (bg is always sent to back)
  const findBgImage = (): FabricImage | null => {
    if (!fabricCanvasRef.current) return null;
    const objects = fabricCanvasRef.current.getObjects();

    // Strategy 1: _isBg marker
    const byMarker = objects.find(
      (obj) => obj instanceof FabricImage && (obj as any)._isBg === true
    );
    if (byMarker) return byMarker as FabricImage;

    // Strategy 2: locked (non-selectable + non-evented) FabricImage
    const byLocked = objects.find(
      (obj) => obj instanceof FabricImage && !obj.selectable && !obj.evented
    );
    if (byLocked) return byLocked as FabricImage;

    // Strategy 3: first (bottom-most) FabricImage
    const firstImage = objects.find((obj) => obj instanceof FabricImage);
    if (firstImage) return firstImage as FabricImage;

    return null;
  };

  // Toggle background edit mode: make bg selectable so user can drag/resize it
  const toggleBgEditMode = () => {
    if (!fabricCanvasRef.current) return;
    const bg = findBgImage();
    if (!bg) return;

    if (bgEditMode) {
      // Lock it back down
      bg.set({ selectable: false, evented: false, hasControls: false, hasBorders: false });
      fabricCanvasRef.current.discardActiveObject();
      fabricCanvasRef.current.sendObjectToBack(bg);
      fabricCanvasRef.current.renderAll();
      setBgEditMode(false);
    } else {
      // Make it movable/resizable
      bg.set({
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
        lockRotation: true,
        cornerSize: 10,
        cornerColor: "#3B82F6",
        borderColor: "#3B82F6",
        transparentCorners: false,
      });
      fabricCanvasRef.current.setActiveObject(bg);
      fabricCanvasRef.current.renderAll();
      setBgEditMode(true);
    }
  };

  // Nudge background position (works in both locked and edit modes)
  const nudgeBg = (dx: number, dy: number) => {
    if (!fabricCanvasRef.current) return;
    const bg = findBgImage();
    if (!bg) {
      console.warn("No background image found to nudge");
      return;
    }
    bg.set({ left: (bg.left || 0) + dx, top: (bg.top || 0) + dy });
    bg.setCoords();
    fabricCanvasRef.current.renderAll();
  };

  // Scale background up or down (works in both locked and edit modes)
  const scaleBg = (factor: number) => {
    if (!fabricCanvasRef.current) return;
    const bg = findBgImage();
    if (!bg) {
      console.warn("No background image found to scale");
      return;
    }
    bg.set({ scaleX: (bg.scaleX || 1) * factor, scaleY: (bg.scaleY || 1) * factor });
    bg.setCoords();
    fabricCanvasRef.current.renderAll();
  };

  const processBgFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;

    try {
      const dataUrl = await readFileAsDataUrl(file);

      // Upload to Supabase in the background for persistence
      uploadToSupabase(file, "images");

      await applyBackgroundToCanvas(dataUrl);
    } catch (err) {
      console.error("Failed to add background image:", err);
    }
  };

  // Add an AI-generated image to the canvas as background.
  // Resets the current canvas state so the AI image overrides any unsaved work.
  const applyAiImageToCanvas = async (imageUrl: string) => {
    // Clear existing canvas state for the current tab so the new image takes over
    canvasStatesRef.current = { ...canvasStatesRef.current, [currentTab]: null };
    setCanvasStates((prev) => ({ ...prev, [currentTab]: null }));
    // Re-init the canvas fresh, then apply the new background
    setCanvasRefreshKey((k) => k + 1);
    // Small delay to let the canvas re-init before applying the image
    await new Promise((r) => setTimeout(r, 100));
    await applyBackgroundToCanvas(imageUrl);
  };

  // Build a PromptContext from campaign + research state (shared by both generation flows)
  const buildPromptContext = (): PromptContext => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const campaignAny = campaign as any;
    return {
      brandName: researchPromptContext?.brandName || campaign?.brandName || campaignAny?.brand_name || campaign?.name || "",
      industry: researchPromptContext?.industry || campaignAny?.industry || "",
      audience: researchPromptContext?.audience || campaignAny?.target_audience || campaignAny?.targetAudience || "",
      prizeText: settings.prizeText || "a prize",
      researchContext: researchPromptContext?.researchContext || "",
      selectedCopy: researchPromptContext?.selectedCopy || undefined,
      websiteUrl: campaignAny?.website_url || campaignAny?.websiteUrl || "",
      brandColor: settings.backgroundColor !== "#ffffff" ? settings.backgroundColor : undefined,
      logoUrl: settings.logoUrl || undefined,
    };
  };

  // Generate AI creative suggestions (enriched with research context when available)
  const generateAiSuggestions = async () => {
    if (!campaign) return;
    setIsGeneratingAi(true);
    setShowAiPanel(true);
    setAiSuggestions([]);

    const genStart = Date.now();
    try {
      trackGenerationStarted(campaign.id, { state: currentTab, format: `${canvasWidth}x${canvasHeight}`, count: 3 });
      const ctx = buildPromptContext();
      const results = await generateBannerVariations({
        bannerState: currentTab,
        promptContext: ctx,
        width: canvasWidth,
        height: canvasHeight,
        count: 3,
      });

      setAiSuggestions(results);
      trackGenerationCompleted(campaign.id, { state: currentTab, format: `${canvasWidth}x${canvasHeight}`, count: 3, success_count: results.length, duration_ms: Date.now() - genStart });
    } catch (err) {
      console.error("AI generation failed:", err);
      trackGenerationFailed(campaign.id, { state: currentTab, error: err instanceof Error ? err.message : "unknown" });
      showToast(err instanceof Error ? err.message : "Failed to generate AI suggestions. Check your API key configuration.", "error");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Toggle a format in the selectedFormats list
  const toggleFormat = (formatName: string) => {
    setSelectedFormats((prev) =>
      prev.includes(formatName)
        ? prev.filter((f) => f !== formatName)
        : [...prev, formatName]
    );
  };

  // Generate All States: create unique AI backgrounds for each banner state
  // Each state gets a tailored prompt reflecting its role in the scratch-off flow.
  // When multiple formats are selected, generates + saves a separate creative per format.
  const generateAllStates = async () => {
    if (!campaign) return;
    setGeneratingAllStates(true);
    const allStatesStart = Date.now();
    trackGenerationStarted(campaign.id, { state: "all", format: `${canvasWidth}x${canvasHeight}`, count: 5 });

    const ctx = buildPromptContext();
    const brandName = ctx.brandName;
    const websiteUrl = ctx.websiteUrl || "";
    // Override per-state prize text from customizations
    const getPrize = (state: BannerState) => stateCustomizations[state]?.prizeText || ctx.prizeText || "a prize";

    // Build state prompts using the prompt engine
    const buildStatePrompts = (w: number, h: number) =>
      buildAllStatePrompts(ctx, w, h).map((sp) => ({
        ...sp,
        // Re-inject per-state prize text if customized
        prompt: stateCustomizations[sp.state]?.prizeText
          ? sp.prompt.replace(ctx.prizeText || "a prize", getPrize(sp.state))
          : sp.prompt,
      }));

    // Helper: generate all 5 states for a given width x height, returns canvas states + bg URLs + preview cache
    const generateForFormat = async (
      fmtW: number,
      fmtH: number,
      fmtLabel: string,
      formatIndex: number,
      totalFormats: number
    ) => {
      const statePrompts = buildStatePrompts(fmtW, fmtH);
      const fmtCanvasStates: CanvasState = { scratch: null, win: null, lose: null, redeem: null, brand: null };
      const fmtBgUrls: Record<string, string> = {};
      const fmtPreviews: Record<BannerState, string | null> = { scratch: null, win: null, lose: null, redeem: null, brand: null };
      const previousImages: string[] = [];
      let completed = 0;
      const totalSteps = statePrompts.length;

      for (const sp of statePrompts) {
        const prefix = totalFormats > 1 ? `[${fmtLabel}] ` : "";
        setGeneratingStatesProgress(`${prefix}${sp.label} (${completed + 1}/${totalSteps})...`);

        const continuityHint = previousImages.length > 0
          ? ` IMPORTANT: Match the visual style, color palette, and overall aesthetic of the reference image(s) provided. The entire banner sequence must look like a cohesive set from the same campaign.`
          : "";

        try {
          const res = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: sp.prompt + continuityHint,
              width: fmtW,
              height: fmtH,
              count: 1,
              referenceImages: previousImages.length > 0 ? [previousImages[previousImages.length - 1]] : undefined,
            }),
          });

          if (res.ok) {
            const banners = await res.json();
            if (banners.length > 0 && banners[0].imageUrl) {
              previousImages.push(banners[0].imageUrl);
              fmtBgUrls[sp.state] = banners[0].imageUrl;

              let img: InstanceType<typeof FabricImage> | null = null;
              const isBannerDataUrl = banners[0].imageUrl.startsWith("data:");
              for (let attempt = 0; attempt < 3; attempt++) {
                try {
                  img = await FabricImage.fromURL(
                    banners[0].imageUrl,
                    isBannerDataUrl ? {} : { crossOrigin: "anonymous" }
                  );
                  if (img && img.width && img.height) break;
                } catch (loadErr) {
                  console.warn(`Image load attempt ${attempt + 1} failed for ${sp.state}:`, loadErr);
                  await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
                }
              }
              if (!img || !img.width || !img.height) {
                console.error(`Failed to load image for ${sp.state} after 3 attempts`);
                fmtPreviews[sp.state] = banners[0].imageUrl;
                const fallbackEl = document.createElement("canvas");
                fallbackEl.width = fmtW;
                fallbackEl.height = fmtH;
                const fallbackFabric = new Canvas(fallbackEl, { width: fmtW, height: fmtH, backgroundColor: settings.backgroundColor });
                fallbackFabric.renderAll();
                fmtCanvasStates[sp.state] = JSON.stringify(fallbackFabric.toJSON());
                fallbackFabric.dispose();
                completed++;
                continue;
              }
              const offscreen = document.createElement("canvas");
              offscreen.width = fmtW;
              offscreen.height = fmtH;
              const offFabric = new Canvas(offscreen, {
                width: fmtW,
                height: fmtH,
                backgroundColor: settings.backgroundColor,
              });

              // Use shared centerBgOnCanvas to cover-fit and center the image.
              // It adds the image to the canvas internally if needed.
              centerBgOnCanvas(img, offFabric);

              const stateFont = stateCustomizations[sp.state]?.fontFamily || settings.fontFamily || "Arial";
              if (sp.state === "brand" || sp.state === "lose") {
                const isLose = sp.state === "lose";

                if (settings.logoUrl) {
                  try {
                    const isLogoDataUrl = settings.logoUrl.startsWith("data:");
                    const logoImg = await FabricImage.fromURL(
                      settings.logoUrl,
                      isLogoDataUrl ? {} : { crossOrigin: "anonymous" }
                    );
                    const logoW = logoImg.width || 1;
                    const logoH = logoImg.height || 1;
                    const maxLogoW = fmtW * (isLose ? 0.25 : 0.35);
                    const maxLogoH = fmtH * (isLose ? 0.3 : 0.4);
                    const logoScale = Math.min(maxLogoW / logoW, maxLogoH / logoH, 1);
                    const logoTop = isLose ? fmtH * 0.18 : fmtH * 0.25;
                    logoImg.set({
                      scaleX: logoScale,
                      scaleY: logoScale,
                      left: (fmtW - logoW * logoScale) / 2,
                      top: logoTop - (logoH * logoScale) / 2,
                      selectable: true,
                      evented: true,
                    });
                    offFabric.add(logoImg);
                  } catch {
                    // Logo load failed, continue without it
                  }
                }

                if (isLose) {
                  const loseFontSize = Math.max(14, Math.min(fmtW * 0.055, 32));
                  const loseText = new Textbox(stateCustomizations.lose?.headline || "Play Again Soon!", {
                    left: fmtW * 0.05,
                    top: settings.logoUrl ? fmtH * 0.42 : fmtH * 0.3,
                    width: fmtW * 0.9,
                    fontSize: loseFontSize,
                    fontFamily: stateFont,
                    fontWeight: "bold",
                    fill: "#ffffff",
                    textAlign: "center",
                    editable: true,
                    shadow: new Shadow({ color: "rgba(0,0,0,0.6)", blur: 8, offsetX: 0, offsetY: 2 }),
                  });
                  offFabric.add(loseText);

                  const brandSmallSize = Math.max(10, Math.min(fmtW * 0.035, 20));
                  const brandSmallText = new Textbox(brandName, {
                    left: fmtW * 0.05,
                    top: settings.logoUrl ? fmtH * 0.72 : fmtH * 0.62,
                    width: fmtW * 0.9,
                    fontSize: brandSmallSize,
                    fontFamily: stateFont,
                    fontWeight: "bold",
                    fill: "#ffffffDD",
                    textAlign: "center",
                    editable: true,
                    shadow: new Shadow({ color: "rgba(0,0,0,0.5)", blur: 6, offsetX: 0, offsetY: 1 }),
                  });
                  offFabric.add(brandSmallText);
                } else {
                  const brandFontSize = Math.max(14, Math.min(fmtW * 0.06, 36));
                  const brandTextObj = new Textbox(brandName, {
                    left: fmtW * 0.05,
                    top: settings.logoUrl ? fmtH * 0.52 : fmtH * 0.35,
                    width: fmtW * 0.9,
                    fontSize: brandFontSize,
                    fontFamily: stateFont,
                    fontWeight: "bold",
                    fill: "#ffffff",
                    textAlign: "center",
                    editable: true,
                    shadow: new Shadow({ color: "rgba(0,0,0,0.7)", blur: 8, offsetX: 0, offsetY: 2 }),
                  });
                  offFabric.add(brandTextObj);

                  if (websiteUrl) {
                    const urlFontSize = Math.max(10, Math.min(fmtW * 0.035, 20));
                    const urlText = new Textbox(websiteUrl, {
                      left: fmtW * 0.05,
                      top: settings.logoUrl ? fmtH * 0.68 : fmtH * 0.55,
                      width: fmtW * 0.9,
                      fontSize: urlFontSize,
                      fontFamily: stateFont,
                      fill: "#ffffffCC",
                      textAlign: "center",
                      editable: true,
                      shadow: new Shadow({ color: "rgba(0,0,0,0.6)", blur: 6, offsetX: 0, offsetY: 1 }),
                    });
                    offFabric.add(urlText);
                  }
                }
              }

              offFabric.renderAll();
              await new Promise((r) => setTimeout(r, 50));
              offFabric.renderAll();

              try {
                const previewMult = Math.max(2, Math.ceil(400 / fmtW));
                fmtPreviews[sp.state] = offFabric.toDataURL({ format: "png", multiplier: previewMult });
              } catch (previewErr) {
                console.warn(`Preview capture failed for ${sp.state}:`, previewErr);
                fmtPreviews[sp.state] = banners[0].imageUrl;
              }

              const json = JSON.stringify((offFabric as any).toJSON(["_isBg", "selectable", "evented"]));
              fmtCanvasStates[sp.state] = json;

              offFabric.dispose();
            }
          }
        } catch (err) {
          console.error(`Failed to generate ${sp.label}:`, err);
        }

        completed++;
      }

      return { canvasStates: fmtCanvasStates, bgUrls: fmtBgUrls, previews: fmtPreviews };
    };

    // Helper: save a format's generated states to DB as a creative record
    const saveFormatToDB = async (
      fmtName: string,
      fmtW: number,
      fmtH: number,
      fmtCanvasStates: CanvasState,
      fmtBgUrls: Record<string, string>,
      fmtPreviews: Record<BannerState, string | null>,
      existingCreativeId?: string
    ): Promise<string> => {
      let creativeId: string;
      if (existingCreativeId) {
        creativeId = existingCreativeId;
        await supabase
          .from("creatives")
          .update({ format_name: fmtName, format_width: fmtW, format_height: fmtH })
          .eq("id", creativeId);
      } else {
        const variationNum = campaignCreatives.length + 1;
        const { data: creative, error: creativeError } = await supabase
          .from("creatives")
          .insert({
            campaign_id: campaignId,
            format_name: fmtName,
            format_width: fmtW,
            format_height: fmtH,
            variation_label: `${fmtName}`,
            selected: false,
          })
          .select()
          .single();

        if (creativeError) throw creativeError;
        creativeId = creative.id;

        // Track the new creative locally
        setCampaignCreatives((prev) => [...prev, {
          id: creativeId,
          variation_label: fmtName,
          format_name: fmtName,
          format_width: fmtW,
          format_height: fmtH,
        }]);
      }

      // Render preview snapshots
      const previewUrls = await renderAllPreviews(fmtCanvasStates);

      const upsertRows = BANNER_STATES
        .filter((state) => fmtCanvasStates[state] || fmtBgUrls[state])
        .map((state) => ({
          creative_id: creativeId,
          state_type: state,
          canvas_json: fmtCanvasStates[state] || null,
          preview_url: previewUrls[state] || fmtPreviews[state] || fmtBgUrls[state] || null,
          image_url: fmtBgUrls[state] || null,
        }));

      if (upsertRows.length > 0) {
        const { error: upsertErr } = await supabase
          .from("banner_states")
          .upsert(upsertRows, { onConflict: "creative_id,state_type" });
        if (upsertErr) console.error("Failed to upsert banner states:", upsertErr.message, upsertErr.code);
      }

      return creativeId;
    };

    // Reset all canvas states and previews so the new generation starts fresh.
    // This overrides any unsaved work across all 5 states.
    const emptyStates: CanvasState = { scratch: null, win: null, lose: null, redeem: null, brand: null };
    canvasStatesRef.current = emptyStates;
    setCanvasStates(emptyStates);
    setSavedBannerStates({ scratch: false, win: false, lose: false, redeem: false, brand: false });
    setPreviewSnapshots({ scratch: null, win: null, lose: null, redeem: null, brand: null });
    previewCacheRef.current = { scratch: null, win: null, lose: null, redeem: null, brand: null };

    // Determine which formats to generate
    const formatsToGenerate: { name: string; width: number; height: number }[] = [];
    // The "primary" format is whatever is currently displayed on canvas
    const primaryFormatName = settings.format?.name || "Custom";
    const primaryW = canvasWidth;
    const primaryH = canvasHeight;

    if (selectedFormats.length <= 1) {
      // Single format: just generate for the current canvas size
      formatsToGenerate.push({ name: primaryFormatName, width: primaryW, height: primaryH });
    } else {
      // Multi-format: generate for each selected format
      for (const fmtName of selectedFormats) {
        const matched = BANNER_FORMATS.find((f) => f.name === fmtName);
        if (matched) {
          formatsToGenerate.push({ name: matched.name, width: matched.width, height: matched.height });
        }
      }
      // If the current format isn't in the selection, add it so the active canvas gets updated too
      if (!formatsToGenerate.some((f) => f.width === primaryW && f.height === primaryH)) {
        formatsToGenerate.unshift({ name: primaryFormatName, width: primaryW, height: primaryH });
      }
    }

    try {
      let primaryResult: { canvasStates: CanvasState; bgUrls: Record<string, string>; previews: Record<BannerState, string | null> } | null = null;

      for (let fi = 0; fi < formatsToGenerate.length; fi++) {
        const fmt = formatsToGenerate[fi];
        const isPrimary = fmt.width === primaryW && fmt.height === primaryH;

        const result = await generateForFormat(fmt.width, fmt.height, fmt.name, fi, formatsToGenerate.length);

        if (isPrimary) {
          primaryResult = result;
          // Apply to active canvas states
          canvasStatesRef.current = result.canvasStates;
          setCanvasStates(result.canvasStates);
          previewCacheRef.current = result.previews;
          // Populate preview snapshots from cache so they show immediately
          setPreviewSnapshots(result.previews);

          // Update checkmarks
          const newSaved: Record<BannerState, boolean> = { scratch: false, win: false, lose: false, redeem: false, brand: false };
          for (const s of BANNER_STATES) newSaved[s] = !!result.bgUrls[s];
          setSavedBannerStates(newSaved);

          // Switch to scratch tab and sync bgImageUrl
          if (result.bgUrls.scratch) {
            setSettings((prev) => ({ ...prev, bgImageUrl: result.bgUrls.scratch }));
            setBgOpacity(100);
          }

          // Force the canvas init useEffect to re-run so it loads the newly
          // generated scratch state from canvasStatesRef.current.
          // setCurrentTab("scratch") alone won't re-fire the useEffect if we're
          // already on scratch, so we bump canvasRefreshKey to guarantee a re-init.
          setCurrentTab("scratch");
          setCanvasRefreshKey((k) => k + 1);
        }

        // Auto-save to DB
        setGeneratingStatesProgress(formatsToGenerate.length > 1 ? `Saving ${fmt.name}...` : "Saving...");

        // For the primary format, reuse/update the active creative. For additional formats, always create new.
        const existingId = isPrimary ? activeCreativeId || undefined : undefined;
        try {
          const savedId = await saveFormatToDB(
            fmt.name,
            fmt.width,
            fmt.height,
            result.canvasStates,
            result.bgUrls,
            result.previews,
            existingId
          );

          if (isPrimary) {
            setActiveCreativeId(savedId);
          }
        } catch (saveErr) {
          console.error(`Auto-save failed for ${fmt.name}:`, saveErr);
        }
      }

      // If the primary format wasn't in the list (shouldn't happen but just in case),
      // still update checkmarks from the last generated result
      if (!primaryResult && formatsToGenerate.length > 0) {
        const lastResult = await generateForFormat(primaryW, primaryH, primaryFormatName, 0, 1);
        canvasStatesRef.current = lastResult.canvasStates;
        setCanvasStates(lastResult.canvasStates);
        previewCacheRef.current = lastResult.previews;
        setCurrentTab("scratch");
        setCanvasRefreshKey((k) => k + 1);
      }

      setGeneratingStatesProgress("");
      trackGenerationCompleted(campaign.id, { state: "all", format: `${canvasWidth}x${canvasHeight}`, count: 5, success_count: 5, duration_ms: Date.now() - allStatesStart });

    } catch (err) {
      console.error("Generate all states failed:", err);
      trackGenerationFailed(campaign.id, { state: "all", error: err instanceof Error ? err.message : "unknown" });
      showToast("Some states failed to generate. You can edit them manually.", "error");
    } finally {
      setGeneratingAllStates(false);
      setGeneratingStatesProgress("");
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    await processLogoFile(e.target.files[0]);
  };

  const handleBgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    await processBgFile(e.target.files[0]);
  };

  const handleDrop = (e: React.DragEvent, type: "logo" | "bg") => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverLogo(false);
    setDragOverBg(false);

    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    if (type === "logo") {
      processLogoFile(file);
    } else {
      processBgFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Save campaign settings (name, brand, etc.)
  const saveCampaignSettings = async () => {
    if (!campaign) return;
    setIsSavingCampaign(true);
    try {
      // Merge websiteUrl into campaign_brief JSON (preserving existing fields)
      const campaignAny = campaign as any;
      let existingBrief: Record<string, any> = {};
      try {
        const raw = campaignAny.campaign_brief;
        existingBrief = typeof raw === "string" ? JSON.parse(raw) : (raw || {});
      } catch { /* ignore */ }
      existingBrief.websiteUrl = campaignEdits.websiteUrl;

      const { error } = await supabase
        .from("campaigns")
        .update({
          name: campaignEdits.name,
          brand_name: campaignEdits.brandName,
          target_audience: campaignEdits.targetAudience,
          industry: campaignEdits.industry,
          campaign_brief: existingBrief,
        })
        .eq("id", campaignId);

      if (error) throw error;

      // Update local state
      setCampaign((prev) =>
        prev
          ? {
              ...prev,
              name: campaignEdits.name,
              brandName: campaignEdits.brandName,
              targetAudience: campaignEdits.targetAudience,
              industry: campaignEdits.industry,
              campaign_brief: JSON.stringify(existingBrief),
            } as Campaign & { website_url?: string }
          : prev
      );
      setShowCampaignSettings(false);
    } catch (err) {
      console.error("Failed to save campaign settings:", err);
      showToast("Failed to save campaign settings.", "error");
    } finally {
      setIsSavingCampaign(false);
    }
  };

  // Save draft
  // Build a fully up-to-date snapshot of all canvas states,
  // capturing the live canvas for the active tab so React's async setState doesn't cause stale reads.
  const getLatestCanvasStates = useCallback((): CanvasState => {
    const liveJson = fabricCanvasRef.current
      ? JSON.stringify((fabricCanvasRef.current as any).toJSON(["_isBg", "selectable", "evented"]))
      : null;
    // Use the ref (always up-to-date) instead of React state (may be stale)
    return {
      ...canvasStatesRef.current,
      [currentTab]: liveJson ?? canvasStatesRef.current[currentTab],
    };
  }, [currentTab]);

  // Render a canvas JSON string to a preview data URL.
  // For the current tab, captures from the live canvas directly.
  // For other tabs, builds a temporary DOM-attached canvas and renders.
  const renderAllPreviews = async (latestStates: CanvasState): Promise<Record<BannerState, string | null>> => {
    const results: Record<BannerState, string | null> = {
      scratch: null, win: null, lose: null, redeem: null, brand: null,
    };
    const mult = Math.max(2, Math.ceil(400 / canvasWidth));

    for (const state of BANNER_STATES) {
      // 1. Use cached preview from generation if available (most reliable, avoids CORS)
      if (previewCacheRef.current[state]) {
        results[state] = previewCacheRef.current[state];
        continue;
      }

      // 2. For current tab, capture directly from live canvas
      if (state === currentTab && fabricCanvasRef.current) {
        try {
          fabricCanvasRef.current.discardActiveObject();
          fabricCanvasRef.current.renderAll();
          results[state] = fabricCanvasRef.current.toDataURL({ format: "png", multiplier: mult });
        } catch (e) {
          console.warn(`Live canvas toDataURL failed for ${state}:`, e);
        }
        continue;
      }

      // 3. For other tabs, try rendering from saved JSON (may fail due to CORS)
      const json = latestStates[state];
      if (!json) continue;

      try {
        const parsed = typeof json === "object" ? json : JSON.parse(json);
        const el = document.createElement("canvas");
        el.width = canvasWidth;
        el.height = canvasHeight;
        el.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0;pointer-events:none";
        document.body.appendChild(el);

        const fc = new Canvas(el, { width: canvasWidth, height: canvasHeight, backgroundColor: settings.backgroundColor });
        await fc.loadFromJSON(parsed);
        fc.renderAll();
        // Give images time to fully paint
        await new Promise((r) => setTimeout(r, 50));
        fc.renderAll();

        results[state] = fc.toDataURL({ format: "png", multiplier: mult });
        fc.dispose();
        document.body.removeChild(el);
      } catch (err) {
        console.warn(`Preview render failed for ${state} (CORS or load issue):`, err);
        // Fallback: extract the bg image src from JSON and use it directly as preview
        try {
          const bgImg = findBgImageInJson(json);
          if (bgImg?.src && bgImg.src.startsWith("http")) {
            results[state] = bgImg.src;
          }
        } catch { /* skip fallback too */ }
      }
    }
    return results;
  };

  // Core save logic shared by manual save and auto-save
  const saveDraftCore = async (silent = false) => {
    if (!campaign || !fabricCanvasRef.current) return false;

    try {
      // Get the latest states synchronously (not relying on async setState)
      const latestStates = getLatestCanvasStates();
      // Also update React state so it stays in sync
      setCanvasStates(latestStates);

      // Use the active creative if set, otherwise create a new one
      let creativeId: string;

      if (activeCreativeId) {
        creativeId = activeCreativeId;
        await supabase
          .from("creatives")
          .update({
            format_name: settings.format?.name || "Custom",
            format_width: canvasWidth,
            format_height: canvasHeight,
          })
          .eq("id", creativeId);
      } else {
        // Create new creative record
        const variationNum = campaignCreatives.length + 1;
        const { data: creative, error: creativeError } = await supabase
          .from("creatives")
          .insert({
            campaign_id: campaignId,
            format_name: settings.format?.name || "Custom",
            format_width: canvasWidth,
            format_height: canvasHeight,
            variation_label: `Variation ${variationNum}`,
            selected: false,
          })
          .select()
          .single();

        if (creativeError) throw creativeError;
        creativeId = creative.id;
        setActiveCreativeId(creativeId);
        setCampaignCreatives((prev) => [...prev, {
          id: creativeId,
          variation_label: `Variation ${variationNum}`,
          format_name: settings.format?.name || "Custom",
          format_width: canvasWidth,
          format_height: canvasHeight,
        }]);
      }

      // Generate preview snapshots for all states
      const previewUrls = await renderAllPreviews(latestStates);

      // Upsert banner states (uses unique constraint on creative_id + state_type)
      const states: BannerState[] = ["scratch", "win", "lose", "redeem", "brand"];
      const upsertRows = states
        .filter((state) => latestStates[state])
        .map((state) => {
          const json = latestStates[state];
          const bgImg = findBgImageInJson(json);
          const imageUrl = bgImg?.src && bgImg.src.startsWith("http") ? bgImg.src : null;
          const cachedPreview = previewCacheRef.current[state];
          return {
            creative_id: creativeId,
            state_type: state,
            canvas_json: json,
            preview_url: previewUrls[state] || cachedPreview || imageUrl || null,
            image_url: imageUrl || (cachedPreview?.startsWith("http") ? cachedPreview : null),
          };
        });

      if (upsertRows.length > 0) {
        const { error: upsertErr } = await supabase
          .from("banner_states")
          .upsert(upsertRows, { onConflict: "creative_id,state_type" });
        if (upsertErr) console.error("[saveDraft] Failed to upsert banner states:", upsertErr.message, upsertErr.code);
      }

      // Mark states as complete if saved AND (contains bg image OR has a cached preview from generation)
      const newSaved: Record<BannerState, boolean> = {
        scratch: false, win: false, lose: false, redeem: false, brand: false,
      };
      for (const state of states) {
        if (latestStates[state]) {
          newSaved[state] = canvasJsonHasBgImage(latestStates[state]) || !!previewCacheRef.current[state];
        }
      }
      setSavedBannerStates(newSaved);

      if (!silent) {
        showToast("Draft saved successfully.", "success");
      }
      if (campaign) trackDraftSaved(campaign.id);
      return true;
    } catch (err) {
      console.error("Failed to save draft:", err);
      if (!silent) {
        showToast("Failed to save draft.", "error");
      }
      return false;
    }
  };

  const saveDraft = async () => {
    setIsSaving(true);
    await saveDraftCore(false);
    setIsSaving(false);
  };

  // Auto-save every 2 minutes
  useEffect(() => {
    if (!campaign) return;

    autoSaveIntervalRef.current = setInterval(async () => {
      // Skip if a manual save or AI generation is in progress
      if (isSaving || generatingAllStates || isGeneratingAi) return;
      setIsAutoSaving(true);
      const success = await saveDraftCore(true);
      if (success) {
        setLastAutoSave(new Date());
      }
      setIsAutoSaving(false);
    }, 120000); // 2 minutes

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign, isSaving, generatingAllStates, isGeneratingAi, canvasStates, canvasWidth, canvasHeight, settings.format]);

  // Save and continue
  const saveAndContinue = async () => {
    if (!campaign || !fabricCanvasRef.current) return;

    setIsSaving(true);
    try {
      const latestStates = getLatestCanvasStates();
      setCanvasStates(latestStates);

      // Use the active creative if set, otherwise create a new one
      let creativeId: string;

      if (activeCreativeId) {
        creativeId = activeCreativeId;
        await supabase
          .from("creatives")
          .update({
            format_name: settings.format?.name || "Custom",
            format_width: canvasWidth,
            format_height: canvasHeight,
            selected: true,
          })
          .eq("id", creativeId);
      } else {
        const variationNum = campaignCreatives.length + 1;
        const { data: creative, error: creativeError } = await supabase
          .from("creatives")
          .insert({
            campaign_id: campaignId,
            format_name: settings.format?.name || "Custom",
            format_width: canvasWidth,
            format_height: canvasHeight,
            variation_label: `Variation ${variationNum}`,
            selected: true,
          })
          .select()
          .single();

        if (creativeError) throw creativeError;
        creativeId = creative.id;
        setActiveCreativeId(creativeId);
      }

      // Generate preview snapshots for all states
      const previewUrls = await renderAllPreviews(latestStates);

      // Upsert banner states (uses unique constraint on creative_id + state_type)
      const states: BannerState[] = ["scratch", "win", "lose", "redeem", "brand"];
      const upsertRows = states
        .filter((state) => latestStates[state])
        .map((state) => {
          const json = latestStates[state];
          const bgImg = findBgImageInJson(json);
          const imageUrl = bgImg?.src && bgImg.src.startsWith("http") ? bgImg.src : null;
          const cachedPreview = previewCacheRef.current[state];
          return {
            creative_id: creativeId,
            state_type: state,
            canvas_json: json,
            preview_url: previewUrls[state] || cachedPreview || imageUrl || null,
            image_url: imageUrl || (cachedPreview?.startsWith("http") ? cachedPreview : null),
          };
        });

      if (upsertRows.length > 0) {
        const { error: upsertErr } = await supabase
          .from("banner_states")
          .upsert(upsertRows, { onConflict: "creative_id,state_type" });
        if (upsertErr) console.error("[multiFormat] Failed to upsert banner states:", upsertErr.message, upsertErr.code);
      }

      // Mark ALL creatives in this campaign as selected so they appear in the Saved view
      const allCreativeIds = campaignCreatives.map((c) => c.id);
      if (!allCreativeIds.includes(creativeId)) allCreativeIds.push(creativeId);
      if (allCreativeIds.length > 0) {
        await supabase
          .from("creatives")
          .update({ selected: true })
          .in("id", allCreativeIds);
      }

      router.push(`/campaign/${campaignId}/variations`);
    } catch (err) {
      console.error("Failed to save and continue:", err);
      showToast("Failed to save.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!campaign) {
    return (
      <div className="min-h-[calc(100vh-180px)] bg-slate-100">
        <div className="max-w-[1100px] mx-auto px-8 py-12">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4" />
            <p className="text-gray-700">Loading editor...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-180px)] bg-slate-100">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[200] max-w-sm px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${
          toast.type === "error" ? "bg-red-50 text-red-700 border border-red-200" :
          toast.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
          "bg-blue-50 text-blue-700 border border-blue-200"
        }`}>
          {toast.type === "error" && <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>}
          {toast.type === "success" && <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-auto shrink-0 opacity-60 hover:opacity-100">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}
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
              <h1 className="text-3xl font-bold text-gray-900">Banner Editor</h1>
              <p className="text-gray-700">{campaign.name}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end mb-1">
                {isAutoSaving && (
                  <span className="flex items-center gap-1.5 text-xs text-blue-500 font-medium">
                    <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving...
                  </span>
                )}
                {!isAutoSaving && lastAutoSave && (
                  <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Auto-saved {lastAutoSave.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Tip: Press Delete/Backspace to remove selected objects
              </p>
            </div>
          </div>
        </div>

        {/* Creative Variation Selector */}
        {campaignCreatives.length > 0 && (
          <div className="bg-white rounded-lg shadow px-4 py-3 mb-4 flex items-center gap-3 flex-wrap">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Variations:</span>
            {campaignCreatives.map((c) => (
              <button
                key={c.id}
                onClick={async () => {
                  if (c.id === activeCreativeId) return;
                  // Save current canvas state to memory before switching
                  saveCurrentState();
                  // Fire-and-forget: persist to DB in the background so the UI
                  // switches instantly instead of blocking on network + preview rendering.
                  saveDraftCore(true).catch((err) => console.error("Background save failed:", err));
                  // Load the selected creative
                  setActiveCreativeId(c.id);
                  const { data: bannerStates } = await supabase
                    .from("banner_states")
                    .select("*")
                    .eq("creative_id", c.id);
                  const loadedStates: CanvasState = { scratch: null, win: null, lose: null, redeem: null, brand: null };
                  const loadedSaved: Record<BannerState, boolean> = { scratch: false, win: false, lose: false, redeem: false, brand: false };
                  if (bannerStates) {
                    for (const bs of bannerStates) {
                      if (bs.state_type in loadedStates) {
                        loadedStates[bs.state_type as BannerState] = bs.canvas_json;
                        loadedSaved[bs.state_type as BannerState] = canvasJsonHasBgImage(bs.canvas_json);
                      }
                    }
                  }
                  setCanvasStates(loadedStates);
                  canvasStatesRef.current = loadedStates;
                  setSavedBannerStates(loadedSaved);
                  // Clear preview cache so old variation previews don't bleed through
                  previewCacheRef.current = { scratch: null, win: null, lose: null, redeem: null, brand: null };
                  setPreviewSnapshots({ scratch: null, win: null, lose: null, redeem: null, brand: null });
                  setPreviewPhase("scratch");
                  // Force canvas re-init to load the new variation's scratch state.
                  // canvasRefreshKey bump guarantees the useEffect fires even if
                  // we're already on the scratch tab.
                  setCurrentTab("scratch");
                  setCanvasRefreshKey((k) => k + 1);
                  // Restore format
                  const matchedFormat = BANNER_FORMATS.find((f) => f.name === c.format_name);
                  if (matchedFormat) {
                    setFormatType(matchedFormat.name);
                    setSettings((prev) => ({ ...prev, format: matchedFormat }));
                    setIsCustom(false);
                  } else if (c.format_width && c.format_height) {
                    setIsCustom(true);
                    setSettings((prev) => ({ ...prev, customWidth: c.format_width, customHeight: c.format_height }));
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  c.id === activeCreativeId
                    ? "bg-indigo-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {c.variation_label}
              </button>
            ))}
            <button
              onClick={async () => {
                // Save current canvas state to memory, persist to DB in background
                saveCurrentState();
                saveDraftCore(true).catch((err) => console.error("Background save failed:", err));
                // Reset canvas for new variation
                const emptyStates: CanvasState = { scratch: null, win: null, lose: null, redeem: null, brand: null };
                setCanvasStates(emptyStates);
                canvasStatesRef.current = emptyStates;
                setSavedBannerStates({ scratch: false, win: false, lose: false, redeem: false, brand: false });
                previewCacheRef.current = { scratch: null, win: null, lose: null, redeem: null, brand: null };
                setPreviewSnapshots({ scratch: null, win: null, lose: null, redeem: null, brand: null });
                setActiveCreativeId(null); // Will create new on next save
                setPreviewPhase("scratch");
                setStateCustomizations(JSON.parse(JSON.stringify(DEFAULT_STATE_CUSTOMIZATIONS)));
                setSettings((prev) => ({ ...prev, bgImageUrl: "" }));
                setBgOpacity(100);
                // Force canvas re-init to show blank canvas for new variation
                setCurrentTab("scratch");
                setCanvasRefreshKey((k) => k + 1);
              }}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              New Variation
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar - Format Selection */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase">
                Formats
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Check sizes to include when generating. Click a name to edit that size.
              </p>

              <div className="space-y-1.5 mb-4 max-h-96 overflow-y-auto">
                {BANNER_FORMATS.map((format) => (
                  <div
                    key={format.name}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                      formatType === format.name
                        ? "bg-blue-100 text-blue-700 font-semibold"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFormats.includes(format.name)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleFormat(format.name);
                      }}
                      className="w-4 h-4 text-blue-500 rounded cursor-pointer flex-shrink-0"
                    />
                    <button
                      onClick={() => handleFormatChange(format.name)}
                      className="flex-1 text-left"
                    >
                      {format.name}
                      <div className="text-xs text-gray-500 font-normal">
                        {format.width}x{format.height}
                      </div>
                    </button>
                  </div>
                ))}

                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                    isCustom
                      ? "bg-blue-100 text-blue-700 font-semibold"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <div className="w-4" />
                  <button
                    onClick={() => handleFormatChange("Custom")}
                    className="flex-1 text-left"
                  >
                    Custom
                  </button>
                </div>
              </div>

              {selectedFormats.length > 0 && (
                <div className="text-xs text-blue-600 font-medium mb-2">
                  {selectedFormats.length} format{selectedFormats.length !== 1 ? "s" : ""} selected for generation
                </div>
              )}

              {isCustom && (
                <div className="space-y-3 border-t border-gray-200 pt-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Width (50-1920)
                    </label>
                    <input
                      type="number"
                      min="50"
                      max="1920"
                      value={settings.customWidth}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          customWidth: parseInt(e.target.value),
                        }))
                      }
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Height (50-1920)
                    </label>
                    <input
                      type="number"
                      min="50"
                      max="1920"
                      value={settings.customHeight}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          customHeight: parseInt(e.target.value),
                        }))
                      }
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center - Canvas */}
          <div className="lg:col-span-2">
            {/* Tabs - full width aligned with canvas */}
            <div className="flex gap-1 mb-0 bg-white rounded-t-lg shadow-sm p-1">
              {BANNER_STATES.map((tab) => {
                const isSaved = savedBannerStates[tab];
                return (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className={`flex-1 px-4 py-2.5 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                      currentTab === tab
                        ? "bg-blue-500 text-white"
                        : isSaved
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {isSaved && currentTab !== tab && (
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    )}
                    {BANNER_STATE_LABELS[tab]}
                  </button>
                );
              })}
            </div>

            {/* Canvas Container */}
            <div ref={canvasContainerRef} className="bg-white rounded-b-lg shadow p-8 flex items-center justify-center min-h-96">
              <div
                style={{
                  width: `${canvasWidth * scale}px`,
                  height: `${canvasHeight * scale}px`,
                  borderRadius: "4px",
                  border: "2px solid #94a3b8",
                  background: "#e2e8f0",
                  overflow: "hidden",
                }}
              >
                {/* Canvas element: Fabric.js handles the CSS scaling via
                    setDimensions({cssOnly:true}) so pointer events stay aligned.
                    No CSS transform wrapper needed. */}
                <canvas
                  ref={canvasRef}
                  width={canvasWidth}
                  height={canvasHeight}
                  style={{ display: "block" }}
                />
              </div>
            </div>

            {/* CSS Animations - always rendered so keyframes are available */}
            <style>{`
              @keyframes scratchPop {
                0% { opacity: 0; transform: scale(0.3); }
                8% { opacity: 1; transform: scale(1.12) rotate(1deg); }
                16% { transform: scale(0.95) rotate(-0.5deg); }
                22% { transform: scale(1.05) rotate(0deg); }
                30% { opacity: 1; transform: scale(1); }
                55% { opacity: 1; transform: scale(1); }
                65% { opacity: 0; transform: scale(0.8) translateY(6px); }
                100% { opacity: 0; transform: scale(0.3); }
              }
              @keyframes scratchGlow {
                0% { text-shadow: 0 2px 16px rgba(255,255,255,0), 0 0 40px rgba(255,255,255,0); }
                8% { text-shadow: 0 2px 16px rgba(255,255,255,0.9), 0 0 40px rgba(255,255,255,0.4); }
                35% { text-shadow: 0 2px 24px rgba(255,255,255,1), 0 0 60px rgba(255,255,255,0.7), 0 0 100px rgba(255,200,50,0.4); }
                55% { text-shadow: 0 2px 16px rgba(255,255,255,0.9), 0 0 40px rgba(255,255,255,0.4); }
                65%, 100% { text-shadow: 0 2px 16px rgba(255,255,255,0), 0 0 40px rgba(255,255,255,0); }
              }
              @keyframes sparkleFloat {
                0% { opacity: 0; transform: translateY(4px) scale(0.5); }
                10% { opacity: 0.9; transform: translateY(0) scale(1); }
                50% { opacity: 0.9; }
                60% { opacity: 0; transform: translateY(-10px) scale(0.5); }
                100% { opacity: 0; }
              }
              @keyframes sparkleFloat2 {
                0% { opacity: 0; transform: translateY(6px) scale(0.4) rotate(0deg); }
                10% { opacity: 0.9; transform: translateY(-2px) scale(1.1) rotate(20deg); }
                50% { opacity: 0.8; }
                60% { opacity: 0; transform: translateY(-14px) scale(0.4) rotate(40deg); }
                100% { opacity: 0; }
              }
              @keyframes scratchBackdrop {
                0% { opacity: 0; }
                8% { opacity: 1; }
                55% { opacity: 1; }
                65% { opacity: 0; }
                100% { opacity: 0; }
              }
              @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.06); }
              }
              @keyframes fadeSlideIn {
                0% { opacity: 0; transform: translateY(10px); }
                100% { opacity: 1; transform: translateY(0); }
              }
              @keyframes youWonPop {
                0% { opacity: 0; transform: scale(0.3) rotate(-8deg); }
                20% { opacity: 1; transform: scale(1.15) rotate(2deg); }
                35% { transform: scale(0.95) rotate(-1deg); }
                50% { transform: scale(1.05) rotate(0deg); }
                65% { transform: scale(1); }
                80% { opacity: 1; }
                100% { opacity: 0; transform: scale(1.1) translateY(-8px); }
              }
              @keyframes confettiBurst {
                0% { opacity: 0; }
                15% { opacity: 1; }
                70% { opacity: 1; }
                100% { opacity: 0; }
              }
            `}</style>

            {/* Live Preview - Full Ad Flow Animation */}
            <div className="mt-4">
              <button
                onClick={toggleLivePreview}
                className={`w-full px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  showLivePreview
                    ? "bg-purple-600 text-white hover:bg-purple-700"
                    : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                }`}
              >
                {showLivePreview ? "Hide Live Preview" : "Show Live Preview: Full Ad Experience"}
              </button>

              {showLivePreview && (
                <div className="mt-4 rounded-lg shadow-lg p-4 bg-gray-900">
                  {/* Phase selector pills */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider mr-1">
                      Preview:
                    </p>
                    {BANNER_STATES.map((state) => (
                      <button
                        key={state}
                        onClick={() => {
                          setPreviewPhase(state);
                          handleTabChange(state);
                          captureAllSnapshots();
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                          previewPhase === state
                            ? state === "scratch"
                              ? "bg-amber-500 text-white shadow-lg"
                              : state === "win"
                              ? "bg-emerald-500 text-white shadow-lg"
                              : state === "lose"
                              ? "bg-rose-500 text-white shadow-lg"
                              : state === "redeem"
                              ? "bg-orange-500 text-white shadow-lg"
                              : "bg-indigo-500 text-white shadow-lg"
                            : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
                        }`}
                      >
                        {BANNER_STATE_LABELS[state]}
                      </button>
                    ))}
                  </div>

                  {/* Banner display: true colors, no tint overlays */}
                  <div className="flex items-center justify-center overflow-hidden">
                    <div
                      className="relative overflow-hidden rounded"
                      style={{
                        width: `${canvasWidth * scale}px`,
                        height: `${canvasHeight * scale}px`,
                      }}
                    >
                      {/* Show the snapshot for the selected phase */}
                      {(() => {
                        const snap = previewSnapshots[previewPhase];
                        return snap ? (
                          <img
                            src={snap}
                            alt={`${previewPhase} preview`}
                            style={{
                              width: `${canvasWidth * scale}px`,
                              height: `${canvasHeight * scale}px`,
                              borderRadius: "4px",
                              display: "block",
                              objectFit: "fill",
                              imageRendering: "auto",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "100%",
                              height: "100%",
                              borderRadius: "4px",
                              background: "#e2e8f0",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <span className="text-gray-400 text-xs px-2 text-center">
                              No {BANNER_STATE_LABELS[previewPhase]} design yet. Edit the canvas above.
                            </span>
                          </div>
                        );
                      })()}

                      {/* Scratch Here overlay */}
                      {previewPhase === "scratch" && (
                        <div
                          className="absolute pointer-events-none"
                          style={{
                            inset: 0,
                            zIndex: 5,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 60%, transparent 85%)",
                            animation: "scratchBackdrop 4.5s ease-in-out infinite",
                          }}
                        >
                          {/* Floating sparkles around the text */}
                          <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "space-around", alignItems: "center", pointerEvents: "none" }}>
                            <span style={{ fontSize: `${Math.max(12, Math.min(canvasWidth * scale * 0.05, 22))}px`, animation: "sparkleFloat 4.5s ease-in-out infinite", animationDelay: "0s" }}>&#10024;</span>
                            <span style={{ fontSize: `${Math.max(10, Math.min(canvasWidth * scale * 0.04, 18))}px`, animation: "sparkleFloat2 4.5s ease-in-out infinite", animationDelay: "0.3s", marginTop: "-15%" }}>&#10024;</span>
                            <span style={{ fontSize: `${Math.max(14, Math.min(canvasWidth * scale * 0.06, 24))}px`, animation: "sparkleFloat 4.5s ease-in-out infinite", animationDelay: "0.6s", marginTop: "8%" }}>&#10024;</span>
                            <span style={{ fontSize: `${Math.max(10, Math.min(canvasWidth * scale * 0.04, 18))}px`, animation: "sparkleFloat2 4.5s ease-in-out infinite", animationDelay: "0.15s", marginTop: "-10%" }}>&#10024;</span>
                          </div>

                          {/* Main text with pop animation */}
                          <span
                            style={{
                              color: "white",
                              fontWeight: 900,
                              fontStyle: "italic",
                              fontSize: `${Math.max(14, Math.min(canvasWidth * scale * 0.09, 44))}px`,
                              letterSpacing: "2px",
                              textShadow: "0 2px 8px rgba(0,0,0,1), 0 0 20px rgba(0,0,0,0.8), 0 4px 30px rgba(0,0,0,0.6)",
                              whiteSpace: "nowrap",
                              animation: "scratchPop 4.5s ease-in-out infinite, scratchGlow 4.5s ease-in-out infinite",
                            }}
                          >
                            Scratch Here!
                          </span>
                        </div>
                      )}

                      {/* You Won! overlay */}
                      {previewPhase === "win" && (
                        <div
                          className="absolute pointer-events-none"
                          style={{
                            inset: 0,
                            zIndex: 5,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.15) 60%, transparent 85%)",
                          }}
                        >
                          <span
                            style={{
                              color: "#FFD700",
                              fontWeight: 900,
                              fontStyle: "italic",
                              fontSize: `${Math.max(16, Math.min(canvasWidth * scale * 0.1, 48))}px`,
                              letterSpacing: "2px",
                              textShadow: "0 2px 8px rgba(0,0,0,1), 0 0 30px rgba(255,215,0,0.6), 0 4px 30px rgba(0,0,0,0.6)",
                              whiteSpace: "nowrap",
                              animation: "scratchPop 4.5s ease-in-out infinite",
                            }}
                          >
                            You Won!
                          </span>
                        </div>
                      )}

                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      Click a state above to preview how it looks to the end user
                    </p>
                    <button
                      onClick={() => captureAllSnapshots()}
                      className="text-xs text-gray-400 hover:text-white font-semibold transition-colors"
                    >
                      Refresh
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Canvas Controls */}
            <div className="mt-6 bg-white rounded-lg shadow p-4 space-y-3">
              {/* Row 1: Add elements */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={addText}
                  className="px-4 py-2 bg-blue-500 text-white rounded text-sm font-semibold hover:bg-blue-600 transition-colors"
                >
                  Add Text
                </button>

                <div className="relative inline-block">
                  <button
                    onClick={() => setShowEmojiMenu((v) => !v)}
                    className="px-4 py-2 bg-gray-200 text-gray-900 rounded text-sm font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Add Emoji
                  </button>
                  {showEmojiMenu && (
                    <div className="absolute left-0 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-10 p-3 max-h-80 overflow-y-auto">
                      {EMOJI_CATEGORIES.map((cat) => (
                        <div key={cat.label} className="mb-3 last:mb-0">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{cat.label}</p>
                          <div className="grid grid-cols-7 gap-1">
                            {cat.emojis.map((emoji, i) => (
                              <button
                                key={`${cat.label}-${i}`}
                                onClick={() => { addEmoji(emoji); setShowEmojiMenu(false); }}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-indigo-50 transition-colors text-lg"
                                title={emoji}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={generateAiSuggestions}
                  disabled={isGeneratingAi}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded text-sm font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all"
                >
                  {isGeneratingAi ? "Generating..." : "AI Suggestions"}
                </button>

                {selectedObject && (
                  <>
                    <button
                      onClick={duplicateSelected}
                      className="px-3 py-2 bg-gray-200 text-gray-900 rounded text-sm font-semibold hover:bg-gray-300 transition-colors"
                      title="Duplicate"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={deleteSelected}
                      className="px-3 py-2 bg-red-500 text-white rounded text-sm font-semibold hover:bg-red-600 transition-colors"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>

              {/* Row 2: Text formatting (visible when a Textbox is selected) */}
              {selectedObject && selectedObject instanceof Textbox && (
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Text Formatting</p>
                  <div className="flex gap-1.5 flex-wrap items-center">
                    {/* Bold / Italic / Underline */}
                    <button
                      onClick={toggleBold}
                      className={`w-8 h-8 rounded text-sm font-bold flex items-center justify-center transition-colors ${
                        (selectedObject as Textbox).fontWeight === "bold"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      title="Bold"
                    >
                      B
                    </button>
                    <button
                      onClick={toggleItalic}
                      className={`w-8 h-8 rounded text-sm italic font-semibold flex items-center justify-center transition-colors ${
                        (selectedObject as Textbox).fontStyle === "italic"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      title="Italic"
                    >
                      I
                    </button>
                    <button
                      onClick={toggleUnderline}
                      className={`w-8 h-8 rounded text-sm underline font-semibold flex items-center justify-center transition-colors ${
                        (selectedObject as Textbox).underline
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      title="Underline"
                    >
                      U
                    </button>

                    <div className="w-px h-6 bg-gray-300 mx-1" />

                    {/* Alignment */}
                    {(["left", "center", "right"] as const).map((align) => (
                      <button
                        key={align}
                        onClick={() => setTextAlign(align)}
                        className={`w-8 h-8 rounded text-xs flex items-center justify-center transition-colors ${
                          (selectedObject as Textbox).textAlign === align
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                        title={`Align ${align}`}
                      >
                        {align === "left" ? (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 4h16v2H2zm0 4h10v2H2zm0 4h14v2H2zm0 4h8v2H2z" /></svg>
                        ) : align === "center" ? (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 4h16v2H2zm3 4h10v2H5zm1 4h8v2H6zm2 4h4v2H8z" /></svg>
                        ) : (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 4h16v2H2zm6 4h10v2H8zm4 4h6v2H12zm2 4h6v2H14z" /></svg>
                        )}
                      </button>
                    ))}

                    <div className="w-px h-6 bg-gray-300 mx-1" />

                    {/* Text color */}
                    <input
                      type="color"
                      value={(selectedObject as Textbox).fill as string || "#000000"}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border border-gray-300"
                      title="Text Color"
                    />

                    {/* Font size */}
                    <select
                      value={(selectedObject as Textbox).fontSize || 16}
                      onChange={(e) => setTextFontSize(parseInt(e.target.value))}
                      className="h-8 px-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      title="Font Size"
                    >
                      {[10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72].map((s) => (
                        <option key={s} value={s}>{s}px</option>
                      ))}
                    </select>

                    {/* Font family */}
                    <select
                      value={(selectedObject as Textbox).fontFamily || "Arial"}
                      onChange={(e) => setTextFontFamily(e.target.value)}
                      className="h-8 px-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[120px]"
                      title="Font Family"
                    >
                      {DEFAULT_FONTS.map((font) => (
                        <option key={font} value={font}>{font}</option>
                      ))}
                      {customFonts.map((font) => (
                        <option key={font.name} value={font.name}>{font.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Generate All States button */}
              <button
                onClick={generateAllStates}
                disabled={generatingAllStates}
                className={`w-full py-3 rounded-lg text-sm font-bold transition-all ${
                  generatingAllStates
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "text-white shadow-lg"
                }`}
                style={!generatingAllStates ? { background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #8b5cf6 100%)" } : {}}
              >
                {generatingAllStates ? (
                  <span className="flex flex-col items-center gap-1">
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Generating {generatingStatesProgress || "..."}
                    </span>
                    {generatingStatesProgress && (
                      <span className="w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
                        <span
                          className="bg-white h-full rounded-full transition-all duration-500"
                          style={{ width: `${(() => {
                            const match = generatingStatesProgress.match(/\((\d+)\/(\d+)\)/);
                            return match ? (parseInt(match[1]) / parseInt(match[2])) * 100 : 10;
                          })()}%` }}
                        />
                      </span>
                    )}
                  </span>
                ) : (
                  `Auto-Generate All States${selectedFormats.length > 1 ? ` (${selectedFormats.length} sizes)` : ""}`
                )}
              </button>
              {!generatingAllStates && (
                <p className="text-xs text-gray-400 text-center mt-1">
                  AI creates unique backgrounds for all 5 states. Redeem includes embedded "Tap to Redeem" text. Default adds your logo and brand name over a warm background.
                  {selectedFormats.length > 1 ? ` across ${selectedFormats.length} selected formats` : ""}
                </p>
              )}
            </div>

            {/* AI Suggestions Panel */}
            {showAiPanel && (
              <div className="mt-4 bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
                    AI Creative Suggestions - {BANNER_STATE_LABELS[currentTab]}
                    {researchPromptContext && (
                      <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        Research Connected
                      </span>
                    )}
                  </h3>
                  <button
                    onClick={() => setShowAiPanel(false)}
                    className="text-gray-400 hover:text-gray-600 text-sm font-medium"
                  >
                    Close
                  </button>
                </div>

                {isGeneratingAi ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500 mb-4" />
                    <span className="text-sm text-gray-600">Generating 3 variations for {BANNER_STATE_LABELS[currentTab]}...</span>
                    <span className="text-xs text-gray-400 mt-1">This may take 15-30 seconds</span>
                    <div className="w-48 bg-gray-100 rounded-full h-1.5 mt-3 overflow-hidden">
                      <div className="bg-purple-500 h-full rounded-full animate-pulse" style={{ width: "60%" }} />
                    </div>
                  </div>
                ) : aiSuggestions.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">No suggestions generated yet. Click "AI Creative Suggestions" above to generate.</p>
                ) : (
                  <div className={`grid gap-3 ${aiSuggestions.length >= 3 ? "grid-cols-3" : aiSuggestions.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
                    {aiSuggestions.map((suggestion) => {
                      const variationHints: Record<string, string> = {
                        A: "Control",
                        B: "Copy Variant",
                        C: "Visual Variant",
                      };
                      return (
                        <div key={suggestion.id} className="relative group rounded-lg border-2 border-gray-200 overflow-hidden hover:border-purple-500 hover:shadow-md transition-all">
                          <div
                            className="w-full bg-gray-900 overflow-hidden cursor-pointer"
                            style={{ aspectRatio: `${canvasWidth}/${canvasHeight}`, maxHeight: "200px" }}
                            onClick={() => applyAiImageToCanvas(suggestion.imageUrl)}
                          >
                            <img
                              src={suggestion.imageUrl}
                              alt={`AI suggestion ${suggestion.variationLabel}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-sm font-semibold text-gray-700">
                                  {suggestion.variationLabel}
                                </span>
                                {variationHints[suggestion.variationLabel] && (
                                  <span className="text-xs text-gray-400 ml-1.5">
                                    {variationHints[suggestion.variationLabel]}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => applyAiImageToCanvas(suggestion.imageUrl)}
                                className="text-xs font-semibold text-white bg-purple-500 hover:bg-purple-600 px-3 py-1 rounded-md transition-colors"
                              >
                                Apply
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {aiSuggestions.length > 0 && (
                  <button
                    onClick={generateAiSuggestions}
                    disabled={isGeneratingAi}
                    className="mt-4 w-full py-2.5 text-sm text-purple-600 font-semibold border border-purple-200 rounded-lg hover:bg-purple-50 disabled:opacity-50 transition-colors"
                  >
                    Regenerate New Variations
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar - Customization */}
          <div className="lg:col-span-1">
            {/* Template Picker */}
            <div className="bg-white rounded-lg shadow mb-4">
              <button
                onClick={() => setShowTemplates((v) => !v)}
                className="w-full px-6 py-3 flex items-center justify-between text-sm font-semibold text-gray-900 uppercase"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>
                  Templates
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 transition-transform ${showTemplates ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showTemplates && (
                <div className="px-4 pb-4">
                  <div className="flex gap-1 flex-wrap mb-3">
                    {TEMPLATE_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setTemplateFilter(cat.id)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                          templateFilter === cat.id
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                    {TEMPLATES
                      .filter((t) => templateFilter === "all" || t.category === templateFilter)
                      .map((template) => (
                        <button
                          key={template.id}
                          onClick={() => applyTemplate(template)}
                          className="group text-left rounded-xl border border-gray-200 overflow-hidden hover:border-indigo-300 hover:shadow-md transition-all"
                        >
                          <div className={`h-16 bg-gradient-to-br ${template.previewGradient} flex items-end p-2`}>
                            <span className="text-[10px] font-bold text-white/90 drop-shadow-sm">{template.name}</span>
                          </div>
                          <div className="p-2">
                            <p className="text-[10px] text-gray-400 leading-tight line-clamp-2">{template.description}</p>
                            <div className="flex gap-1 mt-1.5">
                              {Object.values(template.states).slice(0, 3).map((s, i) => (
                                <div key={i} className="w-3 h-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: s.brandColor }} />
                              ))}
                            </div>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Campaign Settings (collapsible) */}
            <div className="bg-white rounded-lg shadow mb-4">
              <button
                onClick={() => setShowCampaignSettings((v) => !v)}
                className="w-full px-6 py-3 flex items-center justify-between text-sm font-semibold text-gray-900 uppercase"
              >
                Campaign Details
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 transition-transform ${showCampaignSettings ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showCampaignSettings && (
                <div className="px-6 pb-4 space-y-3 border-t border-gray-100 pt-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Campaign Name</label>
                    <input
                      type="text"
                      value={campaignEdits.name}
                      onChange={(e) => setCampaignEdits((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Brand Name</label>
                    <input
                      type="text"
                      value={campaignEdits.brandName}
                      onChange={(e) => setCampaignEdits((prev) => ({ ...prev, brandName: e.target.value }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Target Audience</label>
                    <input
                      type="text"
                      value={campaignEdits.targetAudience}
                      onChange={(e) => setCampaignEdits((prev) => ({ ...prev, targetAudience: e.target.value }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Industry</label>
                    <input
                      type="text"
                      value={campaignEdits.industry}
                      onChange={(e) => setCampaignEdits((prev) => ({ ...prev, industry: e.target.value }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Website URL</label>
                    <input
                      type="url"
                      value={campaignEdits.websiteUrl}
                      onChange={(e) => setCampaignEdits((prev) => ({ ...prev, websiteUrl: e.target.value }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://www.example.com"
                    />
                  </div>
                  <button
                    onClick={saveCampaignSettings}
                    disabled={isSavingCampaign}
                    className="w-full py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    {isSavingCampaign ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden flex flex-col" style={{ maxHeight: "80vh" }}>
              <div className="px-6 py-3 border-b border-gray-100 flex-shrink-0">
                <h3 className="text-sm font-semibold text-gray-900 uppercase">
                  Customize
                </h3>
                <p className="text-xs text-blue-600 font-medium mt-0.5">
                  Editing: {BANNER_STATE_LABELS[currentTab]}
                </p>
              </div>
              <div className="p-6 pt-4 space-y-4 overflow-y-auto flex-1">

              {/* Brand Color */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">
                  Brand Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={settings.brandColor}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        brandColor: e.target.value,
                      }))
                    }
                    className="w-12 h-10 rounded cursor-pointer border border-gray-300"
                  />
                  <input
                    type="text"
                    value={settings.brandColor}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        brandColor: e.target.value,
                      }))
                    }
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                </div>
              </div>

              {/* Background Color */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">
                  Background Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={settings.backgroundColor}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        backgroundColor: e.target.value,
                      }))
                    }
                    className="w-12 h-10 rounded cursor-pointer border border-gray-300"
                  />
                  <input
                    type="text"
                    value={settings.backgroundColor}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        backgroundColor: e.target.value,
                      }))
                    }
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                </div>
              </div>

              {/* Headline */}
              {/* CTA (Call to Action) - syncs to the first text element on the canvas */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Call to Action <span className="font-normal text-gray-400">(banner text)</span>
                </label>
                <input
                  type="text"
                  value={settings.cta}
                  onChange={(e) => {
                    const newVal = e.target.value;
                    setSettings((prev) => ({
                      ...prev,
                      cta: newVal,
                      headline: newVal,
                    }));
                    syncHeadlineToCanvas(newVal);
                  }}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Prize Text — feeds into AI generation prompts */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Prize Text <span className="font-normal text-gray-400">(used by AI generator)</span>
                </label>
                <input
                  type="text"
                  value={settings.prizeText}
                  placeholder="e.g. $25 Gift Card, Free Coffee, 50% Off"
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      prizeText: e.target.value,
                    }))
                  }
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {settings.prizeText && settings.prizeText !== "Grand Prize" && (
                  <p className="text-[10px] text-gray-400 mt-0.5">AI will generate images featuring this prize</p>
                )}
              </div>

              {/* Font Family */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Font Family
                </label>
                <select
                  value={settings.fontFamily}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSettings((prev) => ({ ...prev, fontFamily: val }));
                    // Also apply to selected text object if one is active
                    if (selectedObject && selectedObject instanceof Textbox && fabricCanvasRef.current) {
                      selectedObject.set("fontFamily", val);
                      fabricCanvasRef.current.renderAll();
                    }
                  }}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <optgroup label="System Fonts">
                    {DEFAULT_FONTS.map((font) => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                  </optgroup>
                  {customFonts.length > 0 && (
                    <optgroup label="Custom Fonts">
                      {customFonts.map((font) => (
                        <option key={font.name} value={font.name}>
                          {font.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <label className="mt-2 flex items-center justify-center gap-1 w-full border-2 border-dashed border-gray-300 rounded-lg py-2 text-xs text-gray-600 hover:border-blue-600 transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept=".ttf,.woff,.woff2,.otf"
                    onChange={handleFontUpload}
                    className="hidden"
                  />
                  {isUploadingFont ? "Uploading..." : "Upload Custom Font"}
                </label>
              </div>

              {/* Font Size */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">
                  Font Size: {settings.fontSize}px
                </label>
                <input
                  type="range"
                  min="12"
                  max="72"
                  value={settings.fontSize}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setSettings((prev) => ({ ...prev, fontSize: val }));
                    // Also apply to selected text object if one is active
                    if (selectedObject && selectedObject instanceof Textbox && fabricCanvasRef.current) {
                      selectedObject.set("fontSize", val);
                      fabricCanvasRef.current.renderAll();
                    }
                  }}
                  className="w-full"
                />
              </div>

              {/* Logo Upload */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">
                  Logo
                </label>
                {settings.logoUrl ? (
                  <div className="relative group">
                    <div className="w-full h-20 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                      <img
                        src={settings.logoUrl}
                        alt="Logo"
                        className="max-h-16 max-w-full object-contain"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings((prev) => ({ ...prev, logoUrl: "" }))}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      x
                    </button>
                  </div>
                ) : (
                  <div
                    className={`w-full border-2 border-dashed rounded-lg py-6 text-center text-xs cursor-pointer transition-colors ${
                      dragOverLogo
                        ? "border-blue-500 bg-blue-50 text-blue-600"
                        : "border-gray-300 text-gray-500 hover:border-blue-500 hover:bg-blue-50"
                    }`}
                    onDragOver={handleDragOver}
                    onDragEnter={(e) => { e.preventDefault(); setDragOverLogo(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setDragOverLogo(false); }}
                    onDrop={(e) => handleDrop(e, "logo")}
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/*";
                      input.onchange = (ev) => {
                        const file = (ev.target as HTMLInputElement).files?.[0];
                        if (file) processLogoFile(file);
                      };
                      input.click();
                    }}
                  >
                    <svg className="w-6 h-6 mx-auto mb-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Drop logo here or click to browse
                  </div>
                )}
              </div>

              {/* Background Image Upload */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">
                  Background Image
                </label>
                {settings.bgImageUrl ? (
                  <div className="relative group">
                    <div
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 overflow-hidden cursor-pointer"
                      title="Click to replace background"
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = "image/*";
                        input.onchange = (ev) => {
                          const file = (ev.target as HTMLInputElement).files?.[0];
                          if (file) processBgFile(file);
                        };
                        input.click();
                      }}
                    >
                      <img
                        src={settings.bgImageUrl}
                        alt="Background"
                        className="w-full object-cover"
                        style={{ aspectRatio: `${canvasWidth} / ${canvasHeight}` }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeExistingBackground();
                        setSettings((prev) => ({ ...prev, bgImageUrl: "" }));
                      }}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      x
                    </button>
                  </div>
                ) : (
                  <div
                    className={`w-full border-2 border-dashed rounded-lg py-6 text-center text-xs cursor-pointer transition-colors ${
                      dragOverBg
                        ? "border-blue-500 bg-blue-50 text-blue-600"
                        : "border-gray-300 text-gray-500 hover:border-blue-500 hover:bg-blue-50"
                    }`}
                    onDragOver={handleDragOver}
                    onDragEnter={(e) => { e.preventDefault(); setDragOverBg(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setDragOverBg(false); }}
                    onDrop={(e) => handleDrop(e, "bg")}
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/*";
                      input.onchange = (ev) => {
                        const file = (ev.target as HTMLInputElement).files?.[0];
                        if (file) processBgFile(file);
                      };
                      input.click();
                    }}
                  >
                    <svg className="w-6 h-6 mx-auto mb-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Drop image here or click to browse
                  </div>
                )}
              </div>

              {/* Background Position / Crop Controls */}
              {settings.bgImageUrl && (
                <div className="border border-gray-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-700">Adjust Background</p>
                    <button
                      onClick={toggleBgEditMode}
                      className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${
                        bgEditMode
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {bgEditMode ? "Lock Background" : "Drag Mode"}
                    </button>
                  </div>

                  {/* Arrow pad + zoom */}
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => nudgeBg(-10, 0)} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded text-xs flex items-center justify-center" title="Move left">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => nudgeBg(0, -10)} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded text-xs flex items-center justify-center" title="Move up">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                      </button>
                      <button onClick={() => nudgeBg(0, 10)} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded text-xs flex items-center justify-center" title="Move down">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                    </div>
                    <button onClick={() => nudgeBg(10, 0)} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded text-xs flex items-center justify-center" title="Move right">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                    <div className="w-px h-8 bg-gray-200 mx-1" />
                    <button onClick={() => scaleBg(1.15)} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded text-sm font-bold flex items-center justify-center" title="Zoom in">+</button>
                    <button onClick={() => scaleBg(0.85)} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded text-sm font-bold flex items-center justify-center" title="Zoom out">-</button>
                  </div>

                  {/* Opacity / Transparency */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-gray-500">Opacity</p>
                      <span className="text-xs text-gray-400 tabular-nums">{bgOpacity}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={bgOpacity}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setBgOpacity(val);
                        const bg = findBgImage();
                        if (!bg || !fabricCanvasRef.current) return;
                        bg.set({ opacity: val / 100 });
                        fabricCanvasRef.current.renderAll();
                      }}
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  {/* Fit to Banner + Reset */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const fc = fabricCanvasRef.current;
                        if (!fc) return;
                        const bg = findBgImage();
                        if (!bg) return;
                        centerBgOnCanvas(bg, fc);
                        fc.renderAll();
                      }}
                      className="flex-1 text-xs font-medium px-2 py-1.5 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      Fit to Banner
                    </button>
                    <button
                      onClick={() => {
                        removeExistingBackground();
                        setSettings((prev) => ({ ...prev, bgImageUrl: "" }));
                      }}
                      className="text-xs font-medium px-2 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded transition-colors"
                    >
                      Remove
                    </button>
                  </div>

                  {bgEditMode && (
                    <p className="text-xs text-blue-600 text-center">Drag the background image on the canvas to reposition it</p>
                  )}
                </div>
              )}

              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 flex justify-between gap-4">
          <div className="flex gap-3">
            <button
              onClick={saveDraft}
              disabled={isSaving}
              className="px-8 py-3 bg-gray-400 hover:bg-gray-500 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors"
            >
              {isSaving ? "Saving..." : "Save Draft"}
            </button>
            <Link
              href={`/campaign/${campaignId}/variations`}
              className="px-6 py-3 border border-gray-300 text-gray-700 hover:bg-white font-semibold rounded-lg transition-colors text-center"
            >
              View Saved Creatives
            </Link>
          </div>
          <button
            onClick={saveAndContinue}
            disabled={isSaving}
            className="px-8 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold rounded-lg transition-colors"
          >
            {isSaving ? "Saving..." : "Save & Export"}
          </button>
        </div>
      </div>
    </div>
  );
}
