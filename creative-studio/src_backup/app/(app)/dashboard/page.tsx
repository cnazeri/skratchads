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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "researching":
        return "bg-blue-100 text-blue-800";
      case "creating":
        return "bg-purple-100 text-purple-800";
      case "complete":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "draft":
        return "Research";
      case "researching":
        return "Researching";
      case "creating":
        return "Editing";
      case "complete":
        return "Complete";
      default:
        return status;
    }
  };

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
      <div className="max-w-[1100px] mx-auto px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Your Campaigns</h1>
          {campaigns.length > 0 && (
            <Link
              href="/campaign/new"
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg transition-colors text-sm"
            >
              + New Campaign
            </Link>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No campaigns yet</h2>
            <p className="text-gray-700 mb-6">
              Create your first campaign to get started.
            </p>
            <Link
              href="/campaign/new"
              className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
            >
              Create Campaign
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 overflow-hidden"
              >
                {/* Card header: clickable area */}
                <div className="p-5 pb-3">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 mb-0.5 truncate">
                        {campaign.name}
                      </h3>
                      <p className="text-gray-600 text-sm truncate">{campaign.brandName || (campaign as any).brand_name}</p>
                    </div>
                    <span
                      className={`ml-3 shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(
                        campaign.status
                      )}`}
                    >
                      {getStatusLabel(campaign.status)}
                    </span>
                  </div>

                  <div className="flex items-center text-xs text-gray-500 mb-3">
                    <span>{campaign.industry || (campaign as any).industry}</span>
                    <span className="mx-1.5">-</span>
                    <span>{new Date(campaign.createdAt || (campaign as any).created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="border-t border-gray-100 px-5 py-3 flex items-center gap-2">
                  <button
                    onClick={() => router.push(`/campaign/${campaign.id}/editor`)}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold py-1.5 rounded transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => router.push(`/campaign/${campaign.id}/variations`)}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-1.5 rounded transition-colors"
                  >
                    View
                  </button>
                  <button
                    onClick={() => router.push(`/campaign/${campaign.id}/export`)}
                    className="flex-1 bg-purple-500 hover:bg-purple-600 text-white text-sm font-semibold py-1.5 rounded transition-colors"
                  >
                    Export
                  </button>
                  <button
                    onClick={(e) => handleDuplicateCampaign(e, campaign)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    title="Duplicate"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => handleDeleteCampaign(e, campaign.id)}
                    disabled={deletingId === campaign.id}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
