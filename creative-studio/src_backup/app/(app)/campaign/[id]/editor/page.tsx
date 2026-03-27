"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Canvas, Rect, Textbox, FabricImage, Circle, FabricObject, Polygon, Line, Triangle, Shadow } from "fabric";
import { supabase } from "@/lib/supabase";
import { BANNER_FORMATS } from "@/types";
import type { Campaign, BannerState } from "@/types";
import { generateBannerVariations } from "@/lib/nanoBanana";
import type { GeneratedBanner } from "@/lib/nanoBanana";

type CanvasState = Record<BannerState, string | null>;

interface CustomFont {
  name: string;
  url: string;
}

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

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [currentTab, setCurrentTab] = useState<BannerState>("scratch");
  const [formatType, setFormatType] = useState<string>("Mobile Banner");
  const [isCustom, setIsCustom] = useState(false);
  const [canvasStates, setCanvasStates] = useState<CanvasState>({
    scratch: null,
    win: null,
    lose: null,
    redeem: null,
    brand: null,
  });
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [customFonts, setCustomFonts] = useState<CustomFont[]>([]);
  const [isUploadingFont, setIsUploadingFont] = useState(false);
  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const [dragOverLogo, setDragOverLogo] = useState(false);
  const [dragOverBg, setDragOverBg] = useState(false);
  const [bgEditMode, setBgEditMode] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<GeneratedBanner[]>([]);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [selectedFormats, setSelectedFormats] = useState<string[]>(["Mobile Banner"]);
  const [generatingAllStates, setGeneratingAllStates] = useState(false);
  const [generatingStatesProgress, setGeneratingStatesProgress] = useState("");
  const [researchPromptContext, setResearchPromptContext] = useState<{
    brandName?: string;
    industry?: string;
    audience?: string;
    researchContext?: string;
    selectedCopy?: { headline: string; cta: string } | null;
    selectedPrize?: { prize: string; relevanceScore: number; rationale: string } | null;
  } | null>(null);
  const [showCampaignSettings, setShowCampaignSettings] = useState(false);
  const [campaignEdits, setCampaignEdits] = useState({ name: "", brandName: "", targetAudience: "", industry: "" });
  const [isSavingCampaign, setIsSavingCampaign] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
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
  // phaseTimerRef removed - no longer auto-cycling

  const [settings, setSettings] = useState<EditorSettings>({
    format: BANNER_FORMATS[0],
    customWidth: 320,
    customHeight: 50,
    brandColor: "#3B82F6",
    backgroundColor: "#FFFFFF",
    headline: "Scratch to Win",
    cta: "Scratch Now",
    prizeText: "Grand Prize",
    logoUrl: "",
    bgImageUrl: "",
    fontFamily: "Arial",
    fontSize: 16,
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
  const scale = Math.min(600 / canvasWidth, 400 / canvasHeight);

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
        setCampaignEdits({
          name: data.name || "",
          brandName: data.brandName || data.brand_name || "",
          targetAudience: data.targetAudience || data.target_audience || "",
          industry: data.industry || "",
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

        // Load existing creative data if user is returning to edit
        const { data: creatives } = await supabase
          .from("creatives")
          .select("*")
          .eq("campaign_id", campaignId)
          .order("created_at", { ascending: false })
          .limit(1);

        if (creatives && creatives.length > 0) {
          const creative = creatives[0];

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
            for (const bs of bannerStates) {
              if (bs.state_type in loadedStates) {
                loadedStates[bs.state_type as BannerState] = bs.canvas_json;
              }
            }
            setCanvasStates(loadedStates);
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

    fabricCanvasRef.current = fabricCanvas;

    // Load saved state if exists
    const savedState = canvasStates[currentTab];
    if (savedState) {
      try {
        fabricCanvas.loadFromJSON(JSON.parse(savedState)).then(() => {
          fabricCanvas.renderAll();
        });
      } catch (e) {
        console.error("Failed to load canvas state:", e);
      }
    }

    // Selection change handler
    const handleSelectionChange = () => {
      const active = fabricCanvas.getActiveObject();
      setSelectedObject(active || null);
    };

    fabricCanvas.on("selection:created", handleSelectionChange);
    fabricCanvas.on("selection:updated", handleSelectionChange);
    fabricCanvas.on("selection:cleared", () => setSelectedObject(null));

    return () => {
      fabricCanvas.off("selection:created", handleSelectionChange);
      fabricCanvas.off("selection:updated", handleSelectionChange);
      fabricCanvas.off("selection:cleared");
      fabricCanvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [canvasWidth, canvasHeight, currentTab, canvasStates]);

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
      const json = JSON.stringify(fabricCanvasRef.current.toJSON());
      setCanvasStates((prev) => ({
        ...prev,
        [currentTab]: json,
      }));
    }
  }, [currentTab]);

  const handleTabChange = (tab: BannerState) => {
    saveCurrentState();
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

  // Add shape to canvas
  const addShape = useCallback((shapeType: string) => {
    if (!fabricCanvasRef.current) return;

    let shape: FabricObject;

    switch (shapeType) {
      case "rectangle":
        shape = new Rect({
          left: 10, top: 10, width: 100, height: 100,
          fill: settings.brandColor,
        });
        break;
      case "rounded-rect":
        shape = new Rect({
          left: 10, top: 10, width: 120, height: 60,
          rx: 12, ry: 12,
          fill: settings.brandColor,
        });
        break;
      case "circle":
        shape = new Circle({
          left: 10, top: 10, radius: 50,
          fill: settings.brandColor,
        });
        break;
      case "triangle":
        shape = new Triangle({
          left: 10, top: 10, width: 100, height: 100,
          fill: settings.brandColor,
        });
        break;
      case "star": {
        const points = [];
        const spikes = 5;
        const outerR = 50;
        const innerR = 22;
        for (let i = 0; i < spikes * 2; i++) {
          const r = i % 2 === 0 ? outerR : innerR;
          const angle = (Math.PI * i) / spikes - Math.PI / 2;
          points.push({ x: Math.cos(angle) * r + outerR, y: Math.sin(angle) * r + outerR });
        }
        shape = new Polygon(points, {
          left: 10, top: 10,
          fill: settings.brandColor,
        });
        break;
      }
      case "line":
        shape = new Line([0, 0, 120, 0], {
          left: 10, top: 30,
          stroke: settings.brandColor,
          strokeWidth: 3,
          fill: "",
        });
        break;
      case "arrow": {
        const arrowPoints = [
          { x: 0, y: 10 }, { x: 80, y: 10 }, { x: 80, y: 0 },
          { x: 110, y: 15 },
          { x: 80, y: 30 }, { x: 80, y: 20 }, { x: 0, y: 20 },
        ];
        shape = new Polygon(arrowPoints, {
          left: 10, top: 10,
          fill: settings.brandColor,
        });
        break;
      }
      case "diamond": {
        const diamondPts = [
          { x: 50, y: 0 }, { x: 100, y: 50 }, { x: 50, y: 100 }, { x: 0, y: 50 },
        ];
        shape = new Polygon(diamondPts, {
          left: 10, top: 10,
          fill: settings.brandColor,
        });
        break;
      }
      case "badge": {
        // Rounded pill / badge shape
        shape = new Rect({
          left: 10, top: 10, width: 140, height: 40,
          rx: 20, ry: 20,
          fill: settings.brandColor,
        });
        break;
      }
      default:
        shape = new Rect({
          left: 10, top: 10, width: 100, height: 100,
          fill: settings.brandColor,
        });
    }

    fabricCanvasRef.current.add(shape);
    fabricCanvasRef.current.setActiveObject(shape);
    fabricCanvasRef.current.renderAll();
  }, [settings.brandColor]);

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

        const maxW = canvasWidth * 0.25;
        const maxH = canvasHeight * 0.3;
        const fitScale = Math.min(maxW / imgW, maxH / imgH);

        img.set({
          scaleX: fitScale,
          scaleY: fitScale,
          left: (canvasWidth - imgW * fitScale) / 2,
          top: 8,
        });
        fabricCanvasRef.current.add(img);
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
    // Find bg images by marker or by being non-selectable FabricImages
    const bgObjects = objects.filter(
      (obj) => obj instanceof FabricImage && ((obj as any)._isBg === true || (!obj.selectable && !obj.evented))
    );
    bgObjects.forEach((obj) => fabricCanvasRef.current!.remove(obj));
    setBgEditMode(false);
  };

  // Shared helper: add an image URL as canvas background (cover-fit, centered, behind everything)
  const applyBackgroundToCanvas = async (dataUrl: string) => {
    if (!fabricCanvasRef.current) return;

    try {
      removeExistingBackground();

      const img = await FabricImage.fromURL(dataUrl);
      const imgW = img.width || 1;
      const imgH = img.height || 1;
      const coverScale = Math.max(canvasWidth / imgW, canvasHeight / imgH);

      img.set({
        scaleX: coverScale,
        scaleY: coverScale,
        left: (canvasWidth - imgW * coverScale) / 2,
        top: (canvasHeight - imgH * coverScale) / 2,
        selectable: false,
        evented: false,
      });
      (img as any)._isBg = true;

      fabricCanvasRef.current.add(img);
      fabricCanvasRef.current.sendObjectToBack(img);
      fabricCanvasRef.current.renderAll();
      setSettings((prev) => ({ ...prev, bgImageUrl: dataUrl }));
    } catch (err) {
      console.error("Failed to apply background image:", err);
    }
  };

  // Helper to find the background image object on canvas
  const findBgImage = (): FabricImage | null => {
    if (!fabricCanvasRef.current) return null;
    const objects = fabricCanvasRef.current.getObjects();
    // Find the background image: it's always the bottom-most FabricImage,
    // or has our custom _isBg marker. Check both locked and unlocked states.
    const bg = objects.find(
      (obj) => obj instanceof FabricImage && ((obj as any)._isBg === true || (!obj.selectable && !obj.evented))
    );
    return (bg as FabricImage) || null;
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

  // Add an AI-generated image to the canvas as background
  const applyAiImageToCanvas = async (imageUrl: string) => {
    await applyBackgroundToCanvas(imageUrl);
  };

  // Generate AI creative suggestions (enriched with research context when available)
  const generateAiSuggestions = async () => {
    if (!campaign) return;
    setIsGeneratingAi(true);
    setShowAiPanel(true);
    setAiSuggestions([]);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const campaignAny = campaign as any;
      const brandName = researchPromptContext?.brandName || campaign.brandName || campaignAny.brand_name || campaign.name;
      const industry = researchPromptContext?.industry || campaignAny.industry || "";
      const audience = researchPromptContext?.audience || campaignAny.target_audience || campaignAny.targetAudience || "";
      const researchContext = researchPromptContext?.researchContext || "";

      // Build a tab-specific prompt so suggestions match the current banner state
      const prizeText = settings.prizeText || "a prize";
      const aspectRatio = (canvasWidth / canvasHeight).toFixed(2);
      const ratio = canvasWidth / canvasHeight;
      const isVeryWide = ratio > 3;
      const isWide = ratio > 1.5;
      const isSquarish = ratio <= 1.5 && ratio >= 0.67;
      const isTall = ratio < 0.67;
      const isVeryTall = ratio < 0.4;
      let formatHint: string;
      if (isVeryWide) {
        formatHint = `CRITICAL: This is a very wide, thin banner (${canvasWidth}x${canvasHeight}, aspect ratio ${aspectRatio}:1). The image MUST be a wide horizontal strip. Compose all elements in a single horizontal row, spread across the full width. Do NOT create a square or tall image.`;
      } else if (isWide) {
        formatHint = `This is a ${canvasWidth}x${canvasHeight} banner (aspect ratio ${aspectRatio}:1). The image must be wider than it is tall. Lay out all elements horizontally across the full width.`;
      } else if (isSquarish) {
        formatHint = `This is a ${canvasWidth}x${canvasHeight} banner (roughly square, aspect ratio ${aspectRatio}:1). Fill the entire frame evenly.`;
      } else if (isVeryTall) {
        formatHint = `CRITICAL: This is a very tall, narrow banner (${canvasWidth}x${canvasHeight}, aspect ratio 1:${(canvasHeight / canvasWidth).toFixed(2)}). The image MUST be a tall vertical strip. Stack all elements vertically from top to bottom. Do NOT create a square or wide image.`;
      } else {
        formatHint = `This is a ${canvasWidth}x${canvasHeight} portrait/vertical banner (aspect ratio 1:${(canvasHeight / canvasWidth).toFixed(2)}). The image must be taller than it is wide. Stack elements vertically.`;
      }

      let prompt = "";

      if (currentTab === "redeem") {
        prompt = `${formatHint} Create a bold, action-oriented banner for a prize redemption screen for "${brandName}". ${industry ? `Industry: ${industry}.` : ""} The image MUST include the bold text "Tap to Redeem!" prominently displayed as if it is emerging from or integrated into the image itself, with a 3D pop-out or embossed effect. The text should feel like part of the scene, not a flat overlay. Show ${prizeText} alongside the text. Use a bright, urgent, rewarding color palette with glow effects around the text. Style: vibrant, bold, inviting, CTA-focused. The "Tap to Redeem!" text MUST be part of the generated image.`;
      } else if (currentTab === "scratch") {
        prompt = `${formatHint} Create a vibrant, eye-catching banner background for a scratch-to-win ad for "${brandName}". ${industry ? `Industry: ${industry}.` : ""} ${audience ? `Target audience: ${audience}.` : ""} The image should be exciting and inviting, with bold colors and energy that says "scratch here to win ${prizeText}". Style: bright, high-contrast, festive, gamified. Use direct, clear imagery (not abstract). No text on the image.`;
      } else if (currentTab === "win") {
        prompt = `${formatHint} Create a celebratory banner for a "You Won!" screen for "${brandName}". ${industry ? `Industry: ${industry}.` : ""} The image MUST prominently feature a clear, direct depiction of the prize: ${prizeText}. Show the actual prize item/product front and center with a celebratory background (confetti, sparkles, golden glow). Style: bright, joyful, celebratory. Direct product/prize photography style, not abstract. No text on the image.`;
      } else if (currentTab === "lose") {
        prompt = `${formatHint} Create a warm, encouraging "Play Again Soon" banner for "${brandName}". ${industry ? `Industry: ${industry}.` : ""} The mood should feel friendly, inviting, and optimistic, like "we'd love to see you back." Use warm tones (soft oranges, warm yellows, gentle gradients) that keep the user feeling positive about the brand. The background should be inviting and brand-friendly, leaving space for a logo and brand name overlay. Style: warm, friendly, hopeful, on-brand. Use direct, clear imagery (not abstract). No text on the image.`;
      } else if (currentTab === "brand") {
        prompt = `${formatHint} Create a warm, inviting branded banner for "${brandName}" that will serve as a clickable redirect link. ${industry ? `Industry: ${industry}.` : ""} The image MUST include the company name "${brandName}" as stylish, prominent text integrated into the design. The text should look professionally designed, like part of a brand ad. The image should also feature warm, welcoming imagery directly related to ${prizeText !== "a prize" ? `the campaign giveaway: ${prizeText}` : `the ${industry || "brand"} industry and what the brand offers`}. This is the default banner users see, so it must feel like a branded landing spot: warm lighting, premium feel, and clearly connected to the campaign theme. Leave space for a logo to be overlaid on top. Style: warm tones, soft gradients, welcoming, premium, brand-forward. Use direct, clear imagery (not abstract). The company name "${brandName}" MUST appear as text in the image.`;
      } else {
        prompt = `${formatHint} Create a banner ad creative for "${brandName}".`;
        if (industry) prompt += ` Industry: ${industry}.`;
        if (audience) prompt += ` Target audience: ${audience}.`;
        prompt += ` Style: modern, clean, high-contrast. Use direct, clear imagery (not abstract). No text on the image.`;
      }

      if (researchContext) prompt += ` Research insights: ${researchContext}`;
      if (researchPromptContext?.selectedCopy) {
        prompt += ` Suggested headline: "${researchPromptContext.selectedCopy.headline}". CTA: "${researchPromptContext.selectedCopy.cta}".`;
      }

      const results = await generateBannerVariations({
        prompt,
        width: canvasWidth,
        height: canvasHeight,
        count: 3,
      });

      setAiSuggestions(results);
    } catch (err) {
      console.error("AI generation failed:", err);
      alert("Failed to generate AI suggestions. Check your API key configuration.");
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

  // Generate All 5 States: create unique AI backgrounds for each banner state
  // Each state gets a tailored prompt reflecting its role in the scratch-off flow
  const generateAllStates = async () => {
    if (!campaign) return;
    setGeneratingAllStates(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const campaignAny = campaign as any;
    const brandName = researchPromptContext?.brandName || campaign.brandName || campaignAny.brand_name || campaign.name;
    const industry = researchPromptContext?.industry || campaignAny.industry || "";
    const audience = researchPromptContext?.audience || campaignAny.target_audience || "";
    const researchContext = researchPromptContext?.researchContext || "";
    const prizeText = settings.prizeText || "a prize";
    const aspectRatio = (canvasWidth / canvasHeight).toFixed(2);
    const ratio = canvasWidth / canvasHeight;
    const isVeryWide = ratio > 3;
    const isWide = ratio > 1.5;
    const isSquarish = ratio <= 1.5 && ratio >= 0.67;
    const isTall = ratio < 0.67;
    const isVeryTall = ratio < 0.4;
    let formatHint: string;
    if (isVeryWide) {
      formatHint = `CRITICAL: This is a very wide, thin banner (${canvasWidth}x${canvasHeight}, aspect ratio ${aspectRatio}:1). The image MUST be a wide horizontal strip. Compose all elements in a single horizontal row, spread across the full width. Do NOT create a square or tall image.`;
    } else if (isWide) {
      formatHint = `This is a ${canvasWidth}x${canvasHeight} banner (aspect ratio ${aspectRatio}:1). The image must be wider than it is tall. Lay out all elements horizontally across the full width.`;
    } else if (isSquarish) {
      formatHint = `This is a ${canvasWidth}x${canvasHeight} banner (roughly square, aspect ratio ${aspectRatio}:1). Fill the entire frame evenly.`;
    } else if (isVeryTall) {
      formatHint = `CRITICAL: This is a very tall, narrow banner (${canvasWidth}x${canvasHeight}, aspect ratio 1:${(canvasHeight / canvasWidth).toFixed(2)}). The image MUST be a tall vertical strip. Stack all elements vertically from top to bottom. Do NOT create a square or wide image.`;
    } else {
      formatHint = `This is a ${canvasWidth}x${canvasHeight} portrait/vertical banner (aspect ratio 1:${(canvasHeight / canvasWidth).toFixed(2)}). The image must be taller than it is wide. Stack elements vertically.`;
    }

    // Each state gets a unique, purpose-built prompt
    // IMPORTANT: All images should be direct, clear, and literal. Avoid abstract or overly artistic imagery.
    // NOTE: Redeem includes "Tap to Redeem" text embedded in the image. Default gets a warm AI background with logo/brand overlaid.
    const statePrompts: { state: BannerState; prompt: string; label: string }[] = [
      {
        state: "scratch",
        label: "Scratch-to-Win",
        prompt: `${formatHint} Create a vibrant, eye-catching banner background for a scratch-to-win ad for "${brandName}". ${industry ? `Industry: ${industry}.` : ""} ${audience ? `Target audience: ${audience}.` : ""} The image should be exciting and inviting, with bold colors and energy that says "scratch here to win ${prizeText}". ${researchContext} Style: bright, high-contrast, festive, gamified. Use direct, clear imagery (not abstract). No text on the image.`,
      },
      {
        state: "win",
        label: "Win",
        prompt: `${formatHint} Create a celebratory banner for a "You Won!" screen for "${brandName}". ${industry ? `Industry: ${industry}.` : ""} The image MUST prominently feature a clear, direct depiction of the prize: ${prizeText}. Show the actual prize item/product front and center with a celebratory background (confetti, sparkles, golden glow). The prize should be the hero of the image, large and clearly recognizable. Style: bright, joyful, celebratory. Direct product/prize photography style, not abstract. No text on the image.`,
      },
      {
        state: "lose",
        label: "Lose",
        prompt: `${formatHint} Create a warm, encouraging "Play Again Soon" banner for "${brandName}". ${industry ? `Industry: ${industry}.` : ""} The mood should feel friendly, inviting, and optimistic, like "we'd love to see you back." Use warm tones (soft oranges, warm yellows, gentle gradients) that keep the user feeling positive about the brand. The background should be inviting and brand-friendly, leaving space for a logo and brand name overlay. Style: warm, friendly, hopeful, on-brand. Use direct, clear imagery (not abstract). No text on the image.`,
      },
      {
        state: "redeem",
        label: "Redeem",
        prompt: `${formatHint} Create a bold, action-oriented banner for a prize redemption screen for "${brandName}". ${industry ? `Industry: ${industry}.` : ""} The image MUST include the bold text "Tap to Redeem!" prominently displayed as if it is emerging from or integrated into the image itself, with a 3D pop-out or embossed effect. The text should feel like part of the scene, not a flat overlay. Show ${prizeText} alongside the text. Use a bright, urgent, rewarding color palette with glow effects around the text. Style: vibrant, bold, inviting, CTA-focused. Direct and clear imagery, not abstract. The "Tap to Redeem!" text MUST be part of the generated image.`,
      },
      {
        state: "brand",
        label: "Default",
        prompt: `${formatHint} Create a warm, inviting branded banner for "${brandName}" that will serve as a clickable redirect link. ${industry ? `Industry: ${industry}.` : ""} The image MUST include the company name "${brandName}" as stylish, prominent text integrated into the design. The text should look professionally designed, like part of a brand ad. The image should also feature warm, welcoming imagery directly related to ${prizeText !== "a prize" ? `the campaign giveaway: ${prizeText}` : `the ${industry || "brand"} industry and what the brand offers`}. This is the default banner users see, so it must feel like a branded landing spot: warm lighting, premium feel, and clearly connected to the campaign theme. Leave space for a logo to be overlaid on top. Style: warm tones, soft gradients, welcoming, premium, brand-forward. Use direct, clear imagery (not abstract). The company name "${brandName}" MUST appear as text in the image.`,
      },
    ];

    // Save current tab state first
    saveCurrentState();

    let completed = 0;
    const totalSteps = statePrompts.length;
    const newCanvasStates: CanvasState = { ...canvasStates };
    // Track previously generated images to feed as references for visual continuity
    const previousImages: string[] = [];

    try {
      // Generate AI backgrounds for all 5 states sequentially, each referencing the previous
      for (const sp of statePrompts) {
        setGeneratingStatesProgress(`${sp.label} (${completed + 1}/${totalSteps})...`);

        // Build a continuity hint into the prompt when we have previous images
        const continuityHint = previousImages.length > 0
          ? ` IMPORTANT: Match the visual style, color palette, and overall aesthetic of the reference image(s) provided. The entire banner sequence must look like a cohesive set from the same campaign.`
          : "";

        try {
          const res = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: sp.prompt + continuityHint,
              width: canvasWidth,
              height: canvasHeight,
              count: 1,
              // Pass the most recent image as a style reference (limit to last 1 to keep payload manageable)
              referenceImages: previousImages.length > 0 ? [previousImages[previousImages.length - 1]] : undefined,
            }),
          });

          if (res.ok) {
            const banners = await res.json();
            if (banners.length > 0 && banners[0].imageUrl) {
              // Store the raw image for chaining to the next state as a style reference
              previousImages.push(banners[0].imageUrl);

              const img = await FabricImage.fromURL(banners[0].imageUrl);
              const imgW = img.width || 1;
              const imgH = img.height || 1;
              const coverScale = Math.max(canvasWidth / imgW, canvasHeight / imgH);

              img.set({
                scaleX: coverScale,
                scaleY: coverScale,
                left: (canvasWidth - imgW * coverScale) / 2,
                top: (canvasHeight - imgH * coverScale) / 2,
                selectable: false,
                evented: false,
              });

              // Create an offscreen canvas to build the state
              const offscreen = document.createElement("canvas");
              offscreen.width = canvasWidth;
              offscreen.height = canvasHeight;
              const offFabric = new Canvas(offscreen, {
                width: canvasWidth,
                height: canvasHeight,
                backgroundColor: settings.backgroundColor,
              });

              offFabric.add(img);

              // For states that need brand overlays (Default and Lose), add logo + text on top of AI background
              if (sp.state === "brand" || sp.state === "lose") {
                const websiteUrl = campaignAny.website_url || campaignAny.websiteUrl || "";
                const isLose = sp.state === "lose";

                // Add logo if available
                if (settings.logoUrl) {
                  try {
                    const logoImg = await FabricImage.fromURL(settings.logoUrl);
                    const logoW = logoImg.width || 1;
                    const logoH = logoImg.height || 1;
                    const maxLogoW = canvasWidth * (isLose ? 0.25 : 0.35);
                    const maxLogoH = canvasHeight * (isLose ? 0.3 : 0.4);
                    const logoScale = Math.min(maxLogoW / logoW, maxLogoH / logoH, 1);
                    const logoTop = isLose ? canvasHeight * 0.18 : canvasHeight * 0.25;
                    logoImg.set({
                      scaleX: logoScale,
                      scaleY: logoScale,
                      left: (canvasWidth - logoW * logoScale) / 2,
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
                  // Friendly "play again" message
                  const loseFontSize = Math.max(14, Math.min(canvasWidth * 0.055, 32));
                  const loseText = new Textbox("Play Again Soon!", {
                    left: canvasWidth * 0.05,
                    top: settings.logoUrl ? canvasHeight * 0.42 : canvasHeight * 0.3,
                    width: canvasWidth * 0.9,
                    fontSize: loseFontSize,
                    fontFamily: settings.fontFamily || "Arial",
                    fontWeight: "bold",
                    fill: "#ffffff",
                    textAlign: "center",
                    editable: true,
                    shadow: new Shadow({ color: "rgba(0,0,0,0.6)", blur: 8, offsetX: 0, offsetY: 2 }),
                  });
                  offFabric.add(loseText);

                  // Brand name below
                  const brandSmallSize = Math.max(10, Math.min(canvasWidth * 0.035, 20));
                  const brandSmallText = new Textbox(brandName, {
                    left: canvasWidth * 0.05,
                    top: settings.logoUrl ? canvasHeight * 0.72 : canvasHeight * 0.62,
                    width: canvasWidth * 0.9,
                    fontSize: brandSmallSize,
                    fontFamily: settings.fontFamily || "Arial",
                    fontWeight: "bold",
                    fill: "#ffffffDD",
                    textAlign: "center",
                    editable: true,
                    shadow: new Shadow({ color: "rgba(0,0,0,0.5)", blur: 6, offsetX: 0, offsetY: 1 }),
                  });
                  offFabric.add(brandSmallText);
                } else {
                  // Default state: brand name + website
                  const brandFontSize = Math.max(14, Math.min(canvasWidth * 0.06, 36));
                  const brandTextObj = new Textbox(brandName, {
                    left: canvasWidth * 0.05,
                    top: settings.logoUrl ? canvasHeight * 0.52 : canvasHeight * 0.35,
                    width: canvasWidth * 0.9,
                    fontSize: brandFontSize,
                    fontFamily: settings.fontFamily || "Arial",
                    fontWeight: "bold",
                    fill: "#ffffff",
                    textAlign: "center",
                    editable: true,
                    shadow: new Shadow({ color: "rgba(0,0,0,0.7)", blur: 8, offsetX: 0, offsetY: 2 }),
                  });
                  offFabric.add(brandTextObj);

                  if (websiteUrl) {
                    const urlFontSize = Math.max(10, Math.min(canvasWidth * 0.035, 20));
                    const urlText = new Textbox(websiteUrl, {
                      left: canvasWidth * 0.05,
                      top: settings.logoUrl ? canvasHeight * 0.68 : canvasHeight * 0.55,
                      width: canvasWidth * 0.9,
                      fontSize: urlFontSize,
                      fontFamily: settings.fontFamily || "Arial",
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

              const json = JSON.stringify(offFabric.toJSON());
              newCanvasStates[sp.state] = json;

              offFabric.dispose();
            }
          }
        } catch (err) {
          console.error(`Failed to generate ${sp.label}:`, err);
        }

        completed++;
      }

      // Apply all generated states
      setCanvasStates(newCanvasStates);
      setGeneratingStatesProgress("");

      // Switch to scratch tab to show the result
      setCurrentTab("scratch");

    } catch (err) {
      console.error("Generate all states failed:", err);
      alert("Some states failed to generate. You can edit them manually.");
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
      const { error } = await supabase
        .from("campaigns")
        .update({
          name: campaignEdits.name,
          brand_name: campaignEdits.brandName,
          target_audience: campaignEdits.targetAudience,
          industry: campaignEdits.industry,
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
            }
          : prev
      );
      setShowCampaignSettings(false);
    } catch (err) {
      console.error("Failed to save campaign settings:", err);
      alert("Failed to save campaign settings");
    } finally {
      setIsSavingCampaign(false);
    }
  };

  // Save draft
  // Build a fully up-to-date snapshot of all canvas states,
  // capturing the live canvas for the active tab so React's async setState doesn't cause stale reads.
  const getLatestCanvasStates = useCallback((): CanvasState => {
    const liveJson = fabricCanvasRef.current
      ? JSON.stringify(fabricCanvasRef.current.toJSON())
      : null;
    return {
      ...canvasStates,
      [currentTab]: liveJson ?? canvasStates[currentTab],
    };
  }, [canvasStates, currentTab]);

  // Render a canvas JSON string to a preview data URL.
  // For the current tab, captures from the live canvas directly.
  // For other tabs, builds a temporary DOM-attached canvas and renders.
  const renderAllPreviews = async (latestStates: CanvasState): Promise<Record<BannerState, string | null>> => {
    const results: Record<BannerState, string | null> = {
      scratch: null, win: null, lose: null, redeem: null, brand: null,
    };
    const mult = Math.max(2, Math.ceil(400 / canvasWidth));

    for (const state of BANNER_STATES) {
      // For current tab, capture directly from live canvas
      if (state === currentTab && fabricCanvasRef.current) {
        try {
          fabricCanvasRef.current.discardActiveObject();
          fabricCanvasRef.current.renderAll();
          results[state] = fabricCanvasRef.current.toDataURL({ format: "png", multiplier: mult });
        } catch { /* skip */ }
        continue;
      }

      // For other tabs, render from saved JSON
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
        await new Promise((r) => setTimeout(r, 150));
        fc.renderAll();

        results[state] = fc.toDataURL({ format: "png", multiplier: mult });
        fc.dispose();
        document.body.removeChild(el);
      } catch (err) {
        console.error(`Preview render failed for ${state}:`, err);
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

      // Check if a creative already exists for this campaign
      const { data: existingCreatives } = await supabase
        .from("creatives")
        .select("id")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false })
        .limit(1);

      let creativeId: string;

      if (existingCreatives && existingCreatives.length > 0) {
        // Update existing creative
        creativeId = existingCreatives[0].id;
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
        const { data: creative, error: creativeError } = await supabase
          .from("creatives")
          .insert({
            campaign_id: campaignId,
            format_name: settings.format?.name || "Custom",
            format_width: canvasWidth,
            format_height: canvasHeight,
            variation_label: "Draft",
            selected: false,
          })
          .select()
          .single();

        if (creativeError) throw creativeError;
        creativeId = creative.id;
      }

      // Generate preview snapshots for all states
      const previewUrls = await renderAllPreviews(latestStates);

      // Upsert banner states (delete old, insert new)
      const states: BannerState[] = ["scratch", "win", "lose", "redeem", "brand"];
      await supabase
        .from("banner_states")
        .delete()
        .eq("creative_id", creativeId);

      for (const state of states) {
        const json = latestStates[state];
        if (json) {
          await supabase.from("banner_states").insert({
            creative_id: creativeId,
            state_type: state,
            canvas_json: json,
            preview_url: previewUrls[state] || null,
          });
        }
      }

      if (!silent) {
        alert("Draft saved successfully");
      }
      return true;
    } catch (err) {
      console.error("Failed to save draft:", err);
      if (!silent) {
        alert("Failed to save draft");
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

      // Upsert: check if creative already exists
      const { data: existingCreatives } = await supabase
        .from("creatives")
        .select("id")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false })
        .limit(1);

      let creativeId: string;

      if (existingCreatives && existingCreatives.length > 0) {
        creativeId = existingCreatives[0].id;
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
        const { data: creative, error: creativeError } = await supabase
          .from("creatives")
          .insert({
            campaign_id: campaignId,
            format_name: settings.format?.name || "Custom",
            format_width: canvasWidth,
            format_height: canvasHeight,
            variation_label: "Default",
            selected: true,
          })
          .select()
          .single();

        if (creativeError) throw creativeError;
        creativeId = creative.id;
      }

      // Generate preview snapshots for all states
      const previewUrls = await renderAllPreviews(latestStates);

      // Delete old banner states and insert fresh ones
      const states: BannerState[] = ["scratch", "win", "lose", "redeem", "brand"];
      await supabase.from("banner_states").delete().eq("creative_id", creativeId);

      for (const state of states) {
        const json = latestStates[state];
        if (json) {
          await supabase.from("banner_states").insert({
            creative_id: creativeId,
            state_type: state,
            canvas_json: json,
            preview_url: previewUrls[state] || null,
          });
        }
      }

      router.push(`/campaign/${campaignId}/variations`);
    } catch (err) {
      console.error("Failed to save and continue:", err);
      alert("Failed to save");
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
              {BANNER_STATES.map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`flex-1 px-4 py-2.5 rounded text-sm font-semibold transition-colors ${
                    currentTab === tab
                      ? "bg-blue-500 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {BANNER_STATE_LABELS[tab]}
                </button>
              ))}
            </div>

            {/* Canvas Container */}
            <div className="bg-white rounded-b-lg shadow p-8 flex items-center justify-center min-h-96">
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
                <div
                  style={{
                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                    width: `${canvasWidth}px`,
                    height: `${canvasHeight}px`,
                  }}
                >
                  <canvas
                    ref={canvasRef}
                    width={canvasWidth}
                    height={canvasHeight}
                    style={{ display: "block" }}
                  />
                </div>
              </div>
            </div>

            {/* CSS Animations - always rendered so keyframes are available */}
            <style>{`
              @keyframes scratchPop {
                0% { opacity: 0; transform: scale(0.4) rotate(-6deg); }
                18% { opacity: 1; transform: scale(1.12) rotate(1deg); }
                30% { transform: scale(0.96) rotate(-0.5deg); }
                42% { transform: scale(1.06) rotate(0deg); }
                54% { transform: scale(1); }
                75% { opacity: 1; transform: scale(1); }
                90% { opacity: 0; transform: scale(1.08) translateY(-6px); }
                100% { opacity: 0; transform: scale(1.08) translateY(-6px); }
              }
              @keyframes scratchGlow {
                0%, 100% { text-shadow: 0 2px 16px rgba(255,255,255,0.9), 0 0 40px rgba(255,255,255,0.4); }
                50% { text-shadow: 0 2px 24px rgba(255,255,255,1), 0 0 60px rgba(255,255,255,0.7), 0 0 100px rgba(255,200,50,0.4); }
              }
              @keyframes sparkleFloat {
                0% { opacity: 0; transform: translateY(4px) scale(0.5); }
                20% { opacity: 1; transform: translateY(0) scale(1); }
                60% { opacity: 1; }
                100% { opacity: 0; transform: translateY(-10px) scale(0.6); }
              }
              @keyframes sparkleFloat2 {
                0% { opacity: 0; transform: translateY(6px) scale(0.4) rotate(0deg); }
                25% { opacity: 1; transform: translateY(-2px) scale(1.1) rotate(20deg); }
                65% { opacity: 0.8; }
                100% { opacity: 0; transform: translateY(-14px) scale(0.5) rotate(40deg); }
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
                            paddingTop: "4%",
                          }}
                        >
                          {/* Floating sparkles around the text */}
                          <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "space-around", alignItems: "center", pointerEvents: "none" }}>
                            <span style={{ fontSize: `${Math.max(12, Math.min(canvasWidth * scale * 0.05, 22))}px`, animation: "sparkleFloat 3.5s ease-in-out infinite", animationDelay: "0s", opacity: 0 }}>&#10024;</span>
                            <span style={{ fontSize: `${Math.max(10, Math.min(canvasWidth * scale * 0.04, 18))}px`, animation: "sparkleFloat2 3.5s ease-in-out infinite", animationDelay: "0.6s", opacity: 0, marginTop: "-15%" }}>&#10024;</span>
                            <span style={{ fontSize: `${Math.max(14, Math.min(canvasWidth * scale * 0.06, 24))}px`, animation: "sparkleFloat 3.5s ease-in-out infinite", animationDelay: "1.2s", opacity: 0, marginTop: "8%" }}>&#10024;</span>
                            <span style={{ fontSize: `${Math.max(10, Math.min(canvasWidth * scale * 0.04, 18))}px`, animation: "sparkleFloat2 3.5s ease-in-out infinite", animationDelay: "0.3s", opacity: 0, marginTop: "-10%" }}>&#10024;</span>
                          </div>

                          {/* Main text with pop animation */}
                          <span
                            style={{
                              color: "white",
                              fontWeight: 900,
                              fontStyle: "italic",
                              fontSize: `${Math.max(18, Math.min(canvasWidth * scale * 0.1, 48))}px`,
                              letterSpacing: "2px",
                              textShadow: "0 2px 16px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.6), 0 0 80px rgba(0,0,0,0.3)",
                              whiteSpace: "nowrap",
                              animation: "scratchPop 4s ease-in-out infinite, scratchGlow 2s ease-in-out infinite",
                            }}
                          >
                            Scratch Here!
                          </span>
                        </div>
                      )}

                      {/* You Won! overlay (text only, no stars/confetti) */}
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
                          }}
                        >
                          <span
                            style={{
                              color: "#FFD700",
                              fontWeight: 900,
                              fontStyle: "italic",
                              fontSize: `${Math.max(20, Math.min(canvasWidth * scale * 0.12, 56))}px`,
                              letterSpacing: "2px",
                              textShadow: "0 2px 16px rgba(0,0,0,0.9), 0 0 30px rgba(255,215,0,0.5), 0 0 60px rgba(255,215,0,0.3)",
                              whiteSpace: "nowrap",
                              animation: "youWonPop 4s ease-in-out infinite",
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
                    onClick={() => setShowShapeMenu((v) => !v)}
                    className="px-4 py-2 bg-gray-200 text-gray-900 rounded text-sm font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Add Shape
                  </button>
                  {showShapeMenu && (
                    <div className="absolute left-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-2 grid grid-cols-3 gap-1.5">
                      {[
                        { id: "rectangle", label: "Square", svg: <svg viewBox="0 0 40 40" className="w-full h-full"><rect x="4" y="4" width="32" height="32" fill="currentColor" /></svg> },
                        { id: "rounded-rect", label: "Rectangle", svg: <svg viewBox="0 0 40 40" className="w-full h-full"><rect x="2" y="8" width="36" height="24" rx="4" fill="currentColor" /></svg> },
                        { id: "circle", label: "Circle", svg: <svg viewBox="0 0 40 40" className="w-full h-full"><circle cx="20" cy="20" r="16" fill="currentColor" /></svg> },
                        { id: "triangle", label: "Triangle", svg: <svg viewBox="0 0 40 40" className="w-full h-full"><polygon points="20,4 36,36 4,36" fill="currentColor" /></svg> },
                        { id: "diamond", label: "Diamond", svg: <svg viewBox="0 0 40 40" className="w-full h-full"><polygon points="20,2 38,20 20,38 2,20" fill="currentColor" /></svg> },
                        { id: "star", label: "Star", svg: <svg viewBox="0 0 40 40" className="w-full h-full"><polygon points="20,2 25,14 38,16 28,25 31,38 20,32 9,38 12,25 2,16 15,14" fill="currentColor" /></svg> },
                        { id: "arrow", label: "Arrow", svg: <svg viewBox="0 0 40 40" className="w-full h-full"><polygon points="2,15 26,15 26,8 38,20 26,32 26,25 2,25" fill="currentColor" /></svg> },
                        { id: "line", label: "Line", svg: <svg viewBox="0 0 40 40" className="w-full h-full"><line x1="4" y1="20" x2="36" y2="20" stroke="currentColor" strokeWidth="3" /></svg> },
                        { id: "badge", label: "Pill", svg: <svg viewBox="0 0 40 40" className="w-full h-full"><rect x="2" y="12" width="36" height="16" rx="8" fill="currentColor" /></svg> },
                      ].map((s) => (
                        <button
                          key={s.id}
                          onClick={() => { addShape(s.id); setShowShapeMenu(false); }}
                          className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors text-gray-500"
                          title={s.label}
                        >
                          <div className="w-10 h-10">{s.svg}</div>
                          <span className="text-[10px] font-medium leading-none">{s.label}</span>
                        </button>
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

              {/* Generate All 5 States button */}
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
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Generating {generatingStatesProgress || "..."}
                  </span>
                ) : (
                  `Auto-Generate All 5 States${selectedFormats.length > 1 ? ` (${selectedFormats.length} sizes)` : ""}`
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
                    <span className="text-sm text-gray-600">Generating creatives with AI...</span>
                    <span className="text-xs text-gray-400 mt-1">This may take 15-30 seconds</span>
                  </div>
                ) : aiSuggestions.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">No suggestions generated yet. Click "AI Creative Suggestions" above to generate.</p>
                ) : (
                  <div className="space-y-4">
                    {aiSuggestions.map((suggestion) => (
                      <div key={suggestion.id} className="relative group rounded-lg border-2 border-gray-200 overflow-hidden hover:border-purple-500 transition-colors">
                        <div
                          className="w-full bg-gray-900 overflow-hidden"
                          style={{ aspectRatio: `${canvasWidth}/${canvasHeight}` }}
                        >
                          <img
                            src={suggestion.imageUrl}
                            alt={`AI suggestion ${suggestion.variationLabel}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            onClick={() => applyAiImageToCanvas(suggestion.imageUrl)}
                            className="px-5 py-2.5 bg-white text-gray-900 rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors shadow-lg"
                          >
                            Use as Background
                          </button>
                        </div>
                        {/* Label bar */}
                        <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-700">
                            Variation {suggestion.variationLabel}
                          </span>
                          <button
                            onClick={() => applyAiImageToCanvas(suggestion.imageUrl)}
                            className="text-xs font-semibold text-purple-600 hover:text-purple-800 transition-colors"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    ))}
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

            <div className="bg-white rounded-lg shadow p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase sticky top-0 bg-white py-2">
                Customize
              </h3>

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
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Headline
                </label>
                <input
                  type="text"
                  value={settings.headline}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      headline: e.target.value,
                    }))
                  }
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* CTA */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  CTA
                </label>
                <input
                  type="text"
                  value={settings.cta}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      cta: e.target.value,
                    }))
                  }
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Prize Text */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Prize Text
                </label>
                <input
                  type="text"
                  value={settings.prizeText}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      prizeText: e.target.value,
                    }))
                  }
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                    <div className="w-full h-20 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                      <img
                        src={settings.bgImageUrl}
                        alt="Background"
                        className="max-h-16 max-w-full object-contain"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings((prev) => ({ ...prev, bgImageUrl: "" }))}
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

                  {/* Fit to Banner + Reset */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (!fabricCanvasRef.current) return;
                        const bg = findBgImage();
                        if (!bg) return;
                        const imgW = bg.width || 1;
                        const imgH = bg.height || 1;
                        const coverScale = Math.max(canvasWidth / imgW, canvasHeight / imgH);
                        bg.set({
                          scaleX: coverScale,
                          scaleY: coverScale,
                          left: (canvasWidth - imgW * coverScale) / 2,
                          top: (canvasHeight - imgH * coverScale) / 2,
                        });
                        bg.setCoords();
                        fabricCanvasRef.current.renderAll();
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
