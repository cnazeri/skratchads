"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Campaign } from "@/types";

export default function DashboardPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setCampaigns(data || []);
    } catch (err) {
      console.error("Failed to fetch campaigns:", err);
    } finally {
      setLoading(false);
    }
  };

  const statusConfig: Record<string, { color: string; bg: string; label: string; dot: string }> = {
    draft: { color: "text-gray-600", bg: "bg-gray-50 border-gray-200", label: "Draft", dot: "bg-gray-400" },
    researching: { color: "text-blue-600", bg: "bg-blue-50 border-blue-200", label: "Researching", dot: "bg-blue-400" },
    creating: { color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-200", label: "Editing", dot: "bg-indigo-400" },
    complete: { color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", label: "Complete", dot: "bg-emerald-400" },
  };

  const getStatus = (status: string) => statusConfig[status] || statusConfig.draft;

  const handleDeleteCampaign = async (e: React.MouseEvent, campaignId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this campaign?")) return;

    setDeletingId(campaignId);
    try {
      const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", campaignId);

      if (error) throw error;
      setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
    } catch (err) {
      console.error("Failed to delete campaign:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDuplicateCampaign = async (e: React.MouseEvent, campaign: Campaign) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("campaigns")
        .insert({
          user_id: user.id,
          name: `${campaign.name} (Copy)`,
          brand_name: campaign.brandName || (campaign as any).brand_name || "",
          target_audience: campaign.targetAudience || (campaign as any).target_audience || "",
          industry: campaign.industry || (campaign as any).industry || "",
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setCampaigns((prev) => [data, ...prev]);
      }
    } catch (err) {
      console.error("Failed to duplicate campaign:", err);
    }
  };

  return (
    <div className="min-h-[calc(100vh-180px)]">
      <div className="max-w-[1200px] mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Your Campaigns</h1>
            <p className="text-gray-500 text-sm mt-1">
              {campaigns.length > 0
                ? `${campaigns.length} campaign${campaigns.length !== 1 ? "s" : ""}`
                : "Get started by creating your first campaign"
              }
            </p>
          </div>
          {campaigns.length > 0 && (
            <Link
              href="/campaign/new"
              className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              New Campaign
            </Link>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-200 border-t-indigo-500 mb-3" />
            <p className="text-sm text-gray-400">Loading campaigns...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No campaigns yet</h2>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto">
              Create your first campaign to start building scratch-off banner ad creatives with AI.
            </p>
            <Link
              href="/campaign/new"
              className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-xl"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Create Campaign
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {campaigns.map((campaign) => {
              const status = getStatus(campaign.status);
              return (
                <div
                  key={campaign.id}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden group hover:border-indigo-200"
                  style={{ boxShadow: 'var(--shadow-card)', transition: 'box-shadow 200ms, border-color 200ms' }}
                  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-card)')}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-gray-900 truncate">
                          {campaign.name}
                        </h3>
                        <p className="text-gray-400 text-sm truncate mt-0.5">{campaign.brandName || (campaign as any).brand_name}</p>
                      </div>
                      <span className={`ml-3 shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 ${status.bg} ${status.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>{campaign.industry || (campaign as any).industry}</span>
                      <span>-</span>
                      <span>{new Date(campaign.createdAt || (campaign as any).created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="border-t border-gray-100 px-5 py-4 space-y-3">
                    {/* Primary actions */}
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => router.push(`/campaign/${campaign.id}/editor`)}
                        className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                        aria-label={`Edit ${campaign.name}`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        Edit
                      </button>
                      <button
                        onClick={() => router.push(`/campaign/${campaign.id}/variations`)}
                        className="flex-1 border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-gray-700 hover:text-indigo-600 text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                        aria-label={`View ${campaign.name}`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                        View
                      </button>
                      <button
                        onClick={() => router.push(`/campaign/${campaign.id}/export`)}
                        className="flex-1 border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-gray-700 hover:text-indigo-600 text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                        aria-label={`Export ${campaign.name}`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Export
                      </button>
                    </div>

                    {/* Secondary actions */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => router.push(`/campaign/${campaign.id}/research`)}
                        className="text-xs font-medium text-gray-400 hover:text-indigo-500 transition-colors flex items-center gap-1"
                        aria-label={`Research ${campaign.name}`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                        Research
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleDuplicateCampaign(e, campaign)}
                          className="p-1.5 text-gray-300 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Duplicate"
                          aria-label={`Duplicate ${campaign.name}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => handleDeleteCampaign(e, campaign.id)}
                          disabled={deletingId === campaign.id}
                          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete"
                          aria-label={`Delete ${campaign.name}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
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
