export interface BannerFormat {
  name: string;
  width: number;
  height: number;
  category: "mobile" | "desktop" | "custom";
}

export type BannerState = "scratch" | "win" | "lose" | "redeem" | "brand";

export interface BannerStateData {
  imageUrl: string;
  canvasJson?: string;
  previewUrl?: string;
}

export interface Campaign {
  id: string;
  userId: string;
  name: string;
  brandName: string;
  websiteUrl: string;
  giveaway: string;
  targetAudience: string;
  industry: string;
  status: "draft" | "researching" | "creating" | "complete";
  createdAt: string;
}

export interface Creative {
  id: string;
  campaignId: string;
  format: BannerFormat;
  variationLabel: string;
  states: Record<BannerState, BannerStateData>;
}

export const BANNER_FORMATS: BannerFormat[] = [
  {
    name: "Mobile Banner",
    width: 320,
    height: 50,
    category: "mobile",
  },
  {
    name: "Large Mobile Banner",
    width: 320,
    height: 100,
    category: "mobile",
  },
  {
    name: "Medium Rectangle",
    width: 300,
    height: 250,
    category: "desktop",
  },
  {
    name: "Mobile Interstitial",
    width: 320,
    height: 480,
    category: "mobile",
  },
  {
    name: "Smartphone Interstitial",
    width: 360,
    height: 640,
    category: "mobile",
  },
  {
    name: "Leaderboard",
    width: 728,
    height: 90,
    category: "desktop",
  },
  {
    name: "Wide Skyscraper",
    width: 160,
    height: 600,
    category: "desktop",
  },
  {
    name: "Half Page",
    width: 300,
    height: 600,
    category: "desktop",
  },
  {
    name: "Billboard",
    width: 970,
    height: 250,
    category: "desktop",
  },
  {
    name: "Large Rectangle",
    width: 336,
    height: 280,
    category: "desktop",
  },
];
