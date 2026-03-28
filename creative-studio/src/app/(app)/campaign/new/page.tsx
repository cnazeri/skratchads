"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const INDUSTRIES = [
  "Food & Beverage",
  "Fashion & Apparel",
  "Beauty & Skincare",
  "Health & Wellness",
  "Fitness & Sports",
  "Gaming & Esports",
  "Entertainment & Media",
  "Music & Events",
  "Travel & Hospitality",
  "Restaurants & Dining",
  "Grocery & Convenience",
  "Home & Living",
  "Pets & Animals",
  "Auto & Transportation",
  "Electronics & Gadgets",
  "Mobile Apps",
  "E-commerce / Online Shopping",
  "Retail & In-Store",
  "Education & Online Courses",
  "Financial Services & Banking",
  "Insurance",
  "Real Estate & Rentals",
  "Cannabis & CBD",
  "Alcohol & Spirits",
  "Kids & Family",
  "Dating & Social",
  "Nonprofit & Charity",
  "Sports & Outdoors",
  "Subscription Boxes",
  "Other",
];

const DEMOGRAPHICS = [
  "Gen Z (18-25)",
  "Millennials (26-41)",
  "Gen X (42-57)",
  "Boomers (58-76)",
  "College Students",
  "High School Students",
  "Parents / Families",
  "Young Professionals",
  "Budget Shoppers",
  "Luxury / Premium Shoppers",
  "Gamers",
  "Fitness Enthusiasts",
  "Foodies",
  "Music Fans",
  "Sports Fans",
  "Beauty & Skincare Enthusiasts",
  "Pet Owners",
  "Frequent Travelers",
  "Commuters",
  "Work from Home",
  "Small Business Owners",
  "Creators & Influencers",
  "Eco-Conscious Consumers",
  "Bargain Hunters / Coupon Users",
  "Impulse Buyers",
  "Subscription Shoppers",
  "Health-Conscious Consumers",
  "Tech-Savvy Early Adopters",
  "Casual Mobile Users",
  "Other",
];

const CAMPAIGN_GOALS = [
  "Brand awareness",
  "Lead generation (email capture)",
  "App installs",
  "Product launch promotion",
  "Seasonal/event promotion",
  "Re-engagement",
  "Other",
];

export default function NewCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Step 1: Basics
  const [campaignName, setCampaignName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [giveaway, setGiveaway] = useState("");

  // Step 2: Audience
  const [targetAudience, setTargetAudience] = useState("");
  const [industries, setIndustries] = useState<string[]>([]);
  const [demographics, setDemographics] = useState<string[]>([]);

  // Step 3: Campaign Brief
  const [campaignGoal, setCampaignGoal] = useState("Lead generation (email capture)");
  const [customGoal, setCustomGoal] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [bannerDescription, setBannerDescription] = useState("");

  // Load remembered company name/URL on mount
  useEffect(() => {
    try {
      const saved = window.localStorage?.getItem("skratch_company_defaults");
      if (saved) {
        const defaults = JSON.parse(saved);
        if (defaults.brandName) setBrandName(defaults.brandName);
        if (defaults.websiteUrl) setWebsiteUrl(defaults.websiteUrl);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  // Persist company name/URL whenever they change
  useEffect(() => {
    if (brandName.trim() || websiteUrl.trim()) {
      try {
        window.localStorage?.setItem(
          "skratch_company_defaults",
          JSON.stringify({ brandName: brandName.trim(), websiteUrl: websiteUrl.trim() })
        );
      } catch {
        // ignore
      }
    }
  }, [brandName, websiteUrl]);

  const handleNext = () => {
    if (step === 1) {
      if (!campaignName.trim() || !brandName.trim()) return;
      setStep(2);
    } else if (step === 2) {
      if (!targetAudience.trim() || industries.length === 0) return;
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleCreate = async (skipResearch = false) => {
    setLoading(true);
    setCreateError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        router.push("/login");
        return;
      }

      const goalValue = campaignGoal === "Other" ? customGoal : campaignGoal;

      const briefData = {
        campaignGoal: goalValue,
        productDescription,
        demographics: demographics.length > 0 ? demographics : undefined,
        websiteUrl: websiteUrl || undefined,
        giveaway: giveaway || undefined,
        bannerDescription: bannerDescription || undefined,
      };

      // Combine demographics + freeform audience for a richer target_audience field
      const demoStr = demographics.length > 0 ? demographics.join(", ") : "";
      const fullAudience = demoStr
        ? `${demoStr}. ${targetAudience}`.trim()
        : targetAudience;

      const { data, error } = await supabase
        .from("campaigns")
        .insert([
          {
            user_id: user.id,
            name: campaignName,
            brand_name: brandName,
            target_audience: fullAudience,
            industry: industries.join(", "),
            campaign_brief: JSON.stringify(briefData),
            status: skipResearch ? "creating" : "draft",
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      if (skipResearch) {
        router.push(`/campaign/${data.id}/editor`);
      } else {
        router.push(`/campaign/${data.id}/research`);
      }
    } catch (err) {
      console.error("Failed to create campaign:", err);
      setCreateError(
        err instanceof Error ? err.message : "Failed to create campaign. Please try again."
      );
      setLoading(false);
    }
  };

  const isStep1Complete = campaignName.trim() && brandName.trim();
  const isStep2Complete = targetAudience.trim() && industries.length > 0;

  const stepLabels = ["Basics", "Audience", "Brief", "Review"];

  return (
    <div className="min-h-[calc(100vh-180px)]">
      <div className="max-w-[800px] mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Create Campaign</h1>
          <p className="text-gray-500 text-sm">Set up a new banner campaign in a few steps</p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center mb-10" aria-label="Campaign creation steps">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center flex-1 last:flex-initial">
              <div className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-semibold text-sm transition-colors ${
                    s < step
                      ? "bg-emerald-500 text-white"
                      : s === step
                        ? "bg-indigo-500 text-white ring-4 ring-indigo-100"
                        : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {s < step ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  ) : s}
                </div>
                <span className={`text-xs mt-1.5 font-medium ${s === step ? "text-indigo-600" : "text-gray-400"}`}>{stepLabels[s - 1]}</span>
              </div>
              {s < 4 && (
                <div className="flex-1 mx-3 mt-[-18px]">
                  <div className={`h-0.5 rounded-full ${s < step ? "bg-emerald-400" : "bg-gray-100"}`} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-6" style={{ boxShadow: 'var(--shadow-card)' }} aria-label={`Step ${step}: ${stepLabels[step - 1]}`}>
          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Campaign Basics
              </h2>

              <div className="space-y-4">
                <div>
                  <label htmlFor="campaignName" className="block text-sm font-medium text-gray-700 mb-1">
                    Campaign Name
                  </label>
                  <input
                    id="campaignName"
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="e.g., Summer Promotion 2026"
                    className="w-full px-4 py-2 border border-gray-200 focus:outline-none focus:ring-0 rounded-xl"
                  />
                </div>

                <div>
                  <label htmlFor="brandName" className="block text-sm font-medium text-gray-700 mb-1">
                    Company / Brand Name
                  </label>
                  <input
                    id="brandName"
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="e.g., TechStore"
                    className="w-full px-4 py-2 border border-gray-200 focus:outline-none focus:ring-0 rounded-xl"
                  />
                  {brandName && (
                    <p className="text-xs text-gray-400 mt-1">
                      This will be remembered for future campaigns. You can edit it anytime.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700 mb-1">
                    Website / URL
                    <span className="text-gray-400 font-normal ml-1">(optional)</span>
                  </label>
                  <input
                    id="websiteUrl"
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="e.g., https://www.example.com"
                    className="w-full px-4 py-2 border border-gray-200 focus:outline-none focus:ring-0 rounded-xl"
                  />
                </div>

                <div>
                  <label htmlFor="giveaway" className="block text-sm font-medium text-gray-700 mb-1">
                    Giveaway / Prize
                    <span className="text-gray-400 font-normal ml-1">(leave blank if undecided)</span>
                  </label>
                  <input
                    id="giveaway"
                    type="text"
                    value={giveaway}
                    onChange={(e) => setGiveaway(e.target.value)}
                    placeholder="e.g., 20% off coupon, Free month subscription, AirPods"
                    className="w-full px-4 py-2 border border-gray-200 focus:outline-none focus:ring-0 rounded-xl"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    What will users win when they scratch? Research can suggest prizes if you're not sure yet.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Target Audience
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Industry
                    <span className="text-gray-400 font-normal ml-1">(select all that apply)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {INDUSTRIES.map((ind) => {
                      const selected = industries.includes(ind);
                      return (
                        <button
                          key={ind}
                          type="button"
                          onClick={() =>
                            setIndustries((prev) =>
                              selected ? prev.filter((i) => i !== ind) : [...prev, ind]
                            )
                          }
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                            selected
                              ? "bg-indigo-500 text-white border-indigo-500"
                              : "bg-white text-gray-700 border-gray-300 hover:border-indigo-300 hover:text-indigo-600"
                          }`}
                        >
                          {ind}
                        </button>
                      );
                    })}
                  </div>
                  {industries.length === 0 && (
                    <p className="text-xs text-gray-400 mt-1.5">Select at least one industry.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Demographic
                    <span className="text-gray-400 font-normal ml-1">(optional, select all that apply)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DEMOGRAPHICS.map((dem) => {
                      const selected = demographics.includes(dem);
                      return (
                        <button
                          key={dem}
                          type="button"
                          onClick={() =>
                            setDemographics((prev) =>
                              selected ? prev.filter((d) => d !== dem) : [...prev, dem]
                            )
                          }
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                            selected
                              ? "bg-indigo-500 text-white border-indigo-500"
                              : "bg-white text-gray-700 border-gray-300 hover:border-indigo-300 hover:text-indigo-600"
                          }`}
                        >
                          {dem}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label htmlFor="targetAudience" className="block text-sm font-medium text-gray-700 mb-1">
                    Target Audience Description
                  </label>
                  <textarea
                    id="targetAudience"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="Describe your ideal customer. For example: college students aged 18-24 who are into sneakers, streetwear, and follow brands on TikTok and Instagram."
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-200 focus:outline-none focus:ring-0 rounded-xl"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The more specific you are, the better the research and creative suggestions will be.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Campaign Brief
              </h2>
              <p className="text-gray-600 text-sm mb-6">
                Tell us what you're trying to achieve. This context shapes the audience research Perplexity runs for you.
              </p>

              <div className="space-y-5">
                <div>
                  <label htmlFor="campaignGoal" className="block text-sm font-medium text-gray-700 mb-1">
                    Campaign Goal
                  </label>
                  <select
                    id="campaignGoal"
                    value={campaignGoal}
                    onChange={(e) => setCampaignGoal(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 focus:outline-none focus:ring-0 rounded-xl"
                  >
                    {CAMPAIGN_GOALS.map((goal) => (
                      <option key={goal} value={goal}>
                        {goal}
                      </option>
                    ))}
                  </select>
                  {campaignGoal === "Other" && (
                    <input
                      type="text"
                      value={customGoal}
                      onChange={(e) => setCustomGoal(e.target.value)}
                      placeholder="Describe your campaign goal"
                      className="w-full mt-2 px-4 py-2 border border-gray-200 focus:outline-none focus:ring-0 rounded-xl"
                    />
                  )}
                </div>

                <div>
                  <label htmlFor="productDescription" className="block text-sm font-medium text-gray-700 mb-1">
                    Purpose of Campaign
                    <span className="text-gray-400 font-normal ml-1">(optional)</span>
                  </label>
                  <textarea
                    id="productDescription"
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    placeholder="What is the goal of this scratch-off campaign? e.g., Drive email signups for our summer sale, promote our new sneaker drop, give away free samples to college students."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-200 focus:outline-none focus:ring-0 rounded-xl"
                  />
                </div>

                <div>
                  <label htmlFor="bannerDescription" className="block text-sm font-medium text-gray-700 mb-1">
                    Banner Description
                    <span className="text-gray-400 font-normal ml-1">(AI image prompt)</span>
                  </label>
                  <p className="text-xs text-gray-400 mb-2">
                    Describe how you want your banner to look. This will be used to generate AI banner images tailored to your campaign.
                  </p>
                  <textarea
                    id="bannerDescription"
                    value={bannerDescription}
                    onChange={(e) => setBannerDescription(e.target.value)}
                    placeholder="e.g., A vibrant tropical beach theme with golden scratch-off textures, bright neon accents, and a party vibe. Include tropical fruit imagery and summer colors."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-200 focus:outline-none focus:ring-0 rounded-xl"
                  />
                </div>

              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Review and Create
              </h2>

              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">Campaign Basics</h3>
                    <button
                      onClick={() => setStep(1)}
                      className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Campaign Name</p>
                      <p className="font-medium text-gray-900">{campaignName}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Brand Name</p>
                      <p className="font-medium text-gray-900">{brandName}</p>
                    </div>
                    {websiteUrl && (
                      <div>
                        <p className="text-gray-600">Website</p>
                        <p className="font-medium text-gray-900">{websiteUrl}</p>
                      </div>
                    )}
                    {giveaway && (
                      <div>
                        <p className="text-gray-600">Giveaway / Prize</p>
                        <p className="font-medium text-gray-900">{giveaway}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">Target Audience</h3>
                    <button
                      onClick={() => setStep(2)}
                      className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="space-y-3 text-sm mb-2">
                    <div>
                      <p className="text-gray-600 mb-1">Industry</p>
                      <div className="flex flex-wrap gap-1.5">
                        {industries.map((ind) => (
                          <span key={ind} className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">{ind}</span>
                        ))}
                      </div>
                    </div>
                    {demographics.length > 0 && (
                      <div>
                        <p className="text-gray-600 mb-1">Demographic</p>
                        <div className="flex flex-wrap gap-1.5">
                          {demographics.map((dem) => (
                            <span key={dem} className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">{dem}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-gray-600">Goal</p>
                      <p className="font-medium text-gray-900">
                        {campaignGoal === "Other" ? customGoal || "Not set" : campaignGoal}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{targetAudience}</p>
                </div>

                {(productDescription || bannerDescription) && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">Campaign Brief</h3>
                      <button
                        onClick={() => setStep(3)}
                        className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="space-y-3 text-sm">
                      {productDescription && (
                        <div>
                          <p className="text-gray-600">Purpose of Campaign</p>
                          <p className="text-gray-900">{productDescription}</p>
                        </div>
                      )}
                      {bannerDescription && (
                        <div>
                          <p className="text-gray-600">Banner Description (AI Prompt)</p>
                          <p className="text-gray-900">{bannerDescription}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {createError && step === 4 && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{createError}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className="px-5 py-2.5 border border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
          >
            Back
          </button>

          <div className="flex gap-3">
            {step === 3 && (
              <button
                onClick={() => handleCreate(true)}
                disabled={loading}
                className="px-5 py-2 border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:border-gray-200 disabled:text-gray-400 rounded-lg font-semibold transition-colors text-sm"
              >
                {loading ? "Creating..." : "Skip Research, Go to Editor"}
              </button>
            )}

            {step < 4 && (
              <button
                onClick={handleNext}
                disabled={
                  (step === 1 && !isStep1Complete) ||
                  (step === 2 && !isStep2Complete)
                }
                className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors"
              >
                Next
              </button>
            )}

            {step === 4 && (
              <>
                <button
                  onClick={() => handleCreate(true)}
                  disabled={loading}
                  className="px-6 py-2 border border-indigo-200 text-indigo-500 hover:bg-indigo-50 disabled:border-gray-400 disabled:text-gray-400 rounded-lg font-semibold transition-colors"
                >
                  {loading ? "Creating..." : "Skip to Editor"}
                </button>
                <button
                  onClick={() => handleCreate(false)}
                  disabled={loading}
                  className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors"
                >
                  {loading ? "Creating..." : "Research & Create"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
