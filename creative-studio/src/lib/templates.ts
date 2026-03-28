import type { BannerState } from "@/types";

export interface BannerTemplate {
  id: string;
  name: string;
  description: string;
  category: "gaming" | "ecommerce" | "food" | "tech" | "lifestyle" | "sports" | "finance" | "universal";
  /** Preview gradient for the template card */
  previewGradient: string;
  /** Global settings applied when template is selected */
  backgroundColor: string;
  fontFamily: string;
  fontSize: number;
  /** Per-state customizations */
  states: Record<BannerState, {
    brandColor: string;
    backgroundColor: string;
    headline: string;
    cta: string;
    prizeText: string;
    fontFamily: string;
    fontSize: number;
  }>;
}

export const TEMPLATES: BannerTemplate[] = [
  {
    id: "bold-gamer",
    name: "Bold Gamer",
    description: "High-energy neon palette for gaming and esports campaigns",
    category: "gaming",
    previewGradient: "from-purple-600 via-pink-500 to-red-500",
    backgroundColor: "#1a1a2e",
    fontFamily: "Impact",
    fontSize: 18,
    states: {
      scratch: { brandColor: "#E040FB", backgroundColor: "#1a1a2e", headline: "Play Now", cta: "Play Now", prizeText: "Epic Loot", fontFamily: "Impact", fontSize: 18 },
      win: { brandColor: "#00E676", backgroundColor: "#1a1a2e", headline: "Claim Loot", cta: "Claim Loot", prizeText: "Epic Loot", fontFamily: "Impact", fontSize: 18 },
      lose: { brandColor: "#FF6D00", backgroundColor: "#1a1a2e", headline: "Rematch", cta: "Rematch", prizeText: "", fontFamily: "Impact", fontSize: 18 },
      redeem: { brandColor: "#E040FB", backgroundColor: "#1a1a2e", headline: "Get Loot", cta: "Get Loot", prizeText: "Your Prize", fontFamily: "Impact", fontSize: 18 },
      brand: { brandColor: "#E040FB", backgroundColor: "#1a1a2e", headline: "Join Now", cta: "Join Now", prizeText: "", fontFamily: "Impact", fontSize: 18 },
    },
  },
  {
    id: "clean-minimal",
    name: "Clean Minimal",
    description: "Modern, whitespace-forward design for premium brands",
    category: "universal",
    previewGradient: "from-slate-100 via-white to-slate-50",
    backgroundColor: "#FFFFFF",
    fontFamily: "Inter",
    fontSize: 16,
    states: {
      scratch: { brandColor: "#1E293B", backgroundColor: "#FFFFFF", headline: "Try Your Luck", cta: "Try Your Luck", prizeText: "A Special Reward", fontFamily: "Inter", fontSize: 16 },
      win: { brandColor: "#059669", backgroundColor: "#FFFFFF", headline: "Claim Reward", cta: "Claim Reward", prizeText: "A Special Reward", fontFamily: "Inter", fontSize: 16 },
      lose: { brandColor: "#64748B", backgroundColor: "#FFFFFF", headline: "Come Back Soon", cta: "Come Back Soon", prizeText: "", fontFamily: "Inter", fontSize: 16 },
      redeem: { brandColor: "#1E293B", backgroundColor: "#FFFFFF", headline: "Get Yours", cta: "Get Yours", prizeText: "Your Reward", fontFamily: "Inter", fontSize: 16 },
      brand: { brandColor: "#1E293B", backgroundColor: "#FFFFFF", headline: "Learn More", cta: "Learn More", prizeText: "", fontFamily: "Inter", fontSize: 16 },
    },
  },
  {
    id: "warm-foodie",
    name: "Warm Foodie",
    description: "Appetizing warm tones for food, beverage, and restaurant brands",
    category: "food",
    previewGradient: "from-orange-400 via-red-400 to-yellow-400",
    backgroundColor: "#FFF7ED",
    fontFamily: "Georgia",
    fontSize: 16,
    states: {
      scratch: { brandColor: "#EA580C", backgroundColor: "#FFF7ED", headline: "Scratch Now", cta: "Scratch Now", prizeText: "Free Meal", fontFamily: "Georgia", fontSize: 16 },
      win: { brandColor: "#16A34A", backgroundColor: "#FFF7ED", headline: "Claim Now", cta: "Claim Now", prizeText: "Free Meal", fontFamily: "Georgia", fontSize: 16 },
      lose: { brandColor: "#D97706", backgroundColor: "#FFF7ED", headline: "Try Again", cta: "Try Again", prizeText: "", fontFamily: "Georgia", fontSize: 16 },
      redeem: { brandColor: "#EA580C", backgroundColor: "#FFF7ED", headline: "Get It Now", cta: "Get It Now", prizeText: "Your Treat", fontFamily: "Georgia", fontSize: 16 },
      brand: { brandColor: "#EA580C", backgroundColor: "#FFF7ED", headline: "Order Now", cta: "Order Now", prizeText: "", fontFamily: "Georgia", fontSize: 16 },
    },
  },
  {
    id: "electric-blue",
    name: "Electric Blue",
    description: "Bold tech-forward look for SaaS, fintech, and innovation brands",
    category: "tech",
    previewGradient: "from-blue-600 via-indigo-500 to-cyan-400",
    backgroundColor: "#0F172A",
    fontFamily: "Arial",
    fontSize: 16,
    states: {
      scratch: { brandColor: "#3B82F6", backgroundColor: "#0F172A", headline: "Scratch Now", cta: "Scratch Now", prizeText: "Premium Access", fontFamily: "Arial", fontSize: 16 },
      win: { brandColor: "#06B6D4", backgroundColor: "#0F172A", headline: "Activate Now", cta: "Activate Now", prizeText: "Premium Access", fontFamily: "Arial", fontSize: 16 },
      lose: { brandColor: "#6366F1", backgroundColor: "#0F172A", headline: "Try Again", cta: "Try Again", prizeText: "", fontFamily: "Arial", fontSize: 16 },
      redeem: { brandColor: "#3B82F6", backgroundColor: "#0F172A", headline: "Redeem", cta: "Redeem", prizeText: "Your Access", fontFamily: "Arial", fontSize: 16 },
      brand: { brandColor: "#3B82F6", backgroundColor: "#0F172A", headline: "Get Started", cta: "Get Started", prizeText: "", fontFamily: "Arial", fontSize: 16 },
    },
  },
  {
    id: "luxe-gold",
    name: "Luxe Gold",
    description: "Elegant dark-and-gold scheme for premium and luxury brands",
    category: "lifestyle",
    previewGradient: "from-yellow-600 via-amber-500 to-yellow-300",
    backgroundColor: "#1C1917",
    fontFamily: "Georgia",
    fontSize: 16,
    states: {
      scratch: { brandColor: "#D4A017", backgroundColor: "#1C1917", headline: "Reveal Prize", cta: "Reveal Prize", prizeText: "Exclusive Gift", fontFamily: "Georgia", fontSize: 16 },
      win: { brandColor: "#D4A017", backgroundColor: "#1C1917", headline: "Claim Gift", cta: "Claim Gift", prizeText: "Exclusive Gift", fontFamily: "Georgia", fontSize: 16 },
      lose: { brandColor: "#A16207", backgroundColor: "#1C1917", headline: "Return Soon", cta: "Return Soon", prizeText: "", fontFamily: "Georgia", fontSize: 16 },
      redeem: { brandColor: "#D4A017", backgroundColor: "#1C1917", headline: "Claim Now", cta: "Claim Now", prizeText: "Your Gift", fontFamily: "Georgia", fontSize: 16 },
      brand: { brandColor: "#D4A017", backgroundColor: "#1C1917", headline: "Explore", cta: "Explore", prizeText: "", fontFamily: "Georgia", fontSize: 16 },
    },
  },
  {
    id: "fresh-sport",
    name: "Fresh Sport",
    description: "Energetic, competitive palette for sports and fitness brands",
    category: "sports",
    previewGradient: "from-emerald-500 via-green-400 to-lime-400",
    backgroundColor: "#ECFDF5",
    fontFamily: "Arial",
    fontSize: 18,
    states: {
      scratch: { brandColor: "#059669", backgroundColor: "#ECFDF5", headline: "Scratch to Win", cta: "Scratch to Win", prizeText: "Gear & Prizes", fontFamily: "Arial", fontSize: 18 },
      win: { brandColor: "#16A34A", backgroundColor: "#ECFDF5", headline: "Claim Prize", cta: "Claim Prize", prizeText: "Gear & Prizes", fontFamily: "Arial", fontSize: 18 },
      lose: { brandColor: "#65A30D", backgroundColor: "#ECFDF5", headline: "Play Again", cta: "Play Again", prizeText: "", fontFamily: "Arial", fontSize: 18 },
      redeem: { brandColor: "#059669", backgroundColor: "#ECFDF5", headline: "Redeem", cta: "Redeem", prizeText: "Your Prize", fontFamily: "Arial", fontSize: 18 },
      brand: { brandColor: "#059669", backgroundColor: "#ECFDF5", headline: "Shop Now", cta: "Shop Now", prizeText: "", fontFamily: "Arial", fontSize: 18 },
    },
  },
  {
    id: "sunset-vibes",
    name: "Sunset Vibes",
    description: "Warm gradient feel for lifestyle, travel, and wellness brands",
    category: "lifestyle",
    previewGradient: "from-rose-400 via-pink-400 to-orange-300",
    backgroundColor: "#FFF1F2",
    fontFamily: "Georgia",
    fontSize: 16,
    states: {
      scratch: { brandColor: "#E11D48", backgroundColor: "#FFF1F2", headline: "Scratch Now", cta: "Scratch Now", prizeText: "A Special Gift", fontFamily: "Georgia", fontSize: 16 },
      win: { brandColor: "#E11D48", backgroundColor: "#FFF1F2", headline: "Claim Gift", cta: "Claim Gift", prizeText: "A Special Gift", fontFamily: "Georgia", fontSize: 16 },
      lose: { brandColor: "#F97316", backgroundColor: "#FFF1F2", headline: "Come Back", cta: "Come Back", prizeText: "", fontFamily: "Georgia", fontSize: 16 },
      redeem: { brandColor: "#E11D48", backgroundColor: "#FFF1F2", headline: "Redeem", cta: "Redeem", prizeText: "Your Gift", fontFamily: "Georgia", fontSize: 16 },
      brand: { brandColor: "#E11D48", backgroundColor: "#FFF1F2", headline: "Explore", cta: "Explore", prizeText: "", fontFamily: "Georgia", fontSize: 16 },
    },
  },
  {
    id: "money-green",
    name: "Money Green",
    description: "Trust-building palette for finance, banking, and investment brands",
    category: "finance",
    previewGradient: "from-emerald-700 via-green-600 to-teal-500",
    backgroundColor: "#F0FDF4",
    fontFamily: "Arial",
    fontSize: 16,
    states: {
      scratch: { brandColor: "#047857", backgroundColor: "#F0FDF4", headline: "Try Now", cta: "Try Now", prizeText: "Cash Back", fontFamily: "Arial", fontSize: 16 },
      win: { brandColor: "#059669", backgroundColor: "#F0FDF4", headline: "Claim Reward", cta: "Claim Reward", prizeText: "Cash Back", fontFamily: "Arial", fontSize: 16 },
      lose: { brandColor: "#0D9488", backgroundColor: "#F0FDF4", headline: "Try Again", cta: "Try Again", prizeText: "", fontFamily: "Arial", fontSize: 16 },
      redeem: { brandColor: "#047857", backgroundColor: "#F0FDF4", headline: "Get Cash Back", cta: "Get Cash Back", prizeText: "Your Reward", fontFamily: "Arial", fontSize: 16 },
      brand: { brandColor: "#047857", backgroundColor: "#F0FDF4", headline: "Get Started", cta: "Get Started", prizeText: "", fontFamily: "Arial", fontSize: 16 },
    },
  },
];

export const TEMPLATE_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "universal", label: "Universal" },
  { id: "gaming", label: "Gaming" },
  { id: "ecommerce", label: "E-Commerce" },
  { id: "food", label: "Food & Bev" },
  { id: "tech", label: "Tech" },
  { id: "lifestyle", label: "Lifestyle" },
  { id: "sports", label: "Sports" },
  { id: "finance", label: "Finance" },
] as const;
