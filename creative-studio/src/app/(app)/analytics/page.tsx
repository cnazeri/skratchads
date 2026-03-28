"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface AnalyticsEvent {
  id: string;
  event_name: string;
  event_category: string;
  campaign_id: string | null;
  properties: Record<string, unknown>;
  created_at: string;
}

interface Stats {
  totalEvents: number;
  campaignsCreated: number;
  generationsStarted: number;
  generationsCompleted: number;
  generationsFailed: number;
  generationSuccessRate: number;
  avgGenerationMs: number;
  researchCompleted: number;
  avgResearchMs: number;
  exportsDownloaded: number;
  draftsSaved: number;
}

interface CategoryCount {
  name: string;
  count: number;
  color: string;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const EVENT_LABELS: Record<string, string> = {
  campaign_created: "Campaign Created",
  generation_started: "Generation Started",
  generation_completed: "Generation Completed",
  generation_failed: "Generation Failed",
  research_started: "Research Started",
  research_completed: "Research Completed",
  export_downloaded: "Export Downloaded",
  draft_saved: "Draft Saved",
  banner_state_switch: "State Switch",
};

const CATEGORY_COLORS: Record<string, string> = {
  campaign: "bg-blue-500",
  generation: "bg-purple-500",
  research: "bg-emerald-500",
  export: "bg-amber-500",
  editor: "bg-indigo-500",
  auth: "bg-gray-500",
};

export default function AnalyticsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d" | "all">("7d");
  const [campaignNames, setCampaignNames] = useState<Record<string, string>>({});

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }

      let query = supabase
        .from("analytics_events")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (timeRange !== "all") {
        const now = new Date();
        const cutoff = new Date();
        if (timeRange === "24h") cutoff.setHours(now.getHours() - 24);
        else if (timeRange === "7d") cutoff.setDate(now.getDate() - 7);
        else if (timeRange === "30d") cutoff.setDate(now.getDate() - 30);
        query = query.gte("created_at", cutoff.toISOString());
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;

      const allEvents = (data || []) as AnalyticsEvent[];
      setEvents(allEvents);

      // Fetch campaign names for events that have campaign_id
      const campaignIds = [...new Set(allEvents.map(e => e.campaign_id).filter(Boolean))] as string[];
      if (campaignIds.length > 0) {
        const { data: campaigns } = await supabase
          .from("campaigns")
          .select("id, name")
          .in("id", campaignIds);
        if (campaigns) {
          const nameMap: Record<string, string> = {};
          for (const c of campaigns) nameMap[c.id] = c.name;
          setCampaignNames(nameMap);
        }
      }

      // Compute stats
      const genCompleted = allEvents.filter(e => e.event_name === "generation_completed");
      const genFailed = allEvents.filter(e => e.event_name === "generation_failed");
      const genDurations = genCompleted
        .map(e => e.properties?.duration_ms as number)
        .filter(d => typeof d === "number" && d > 0);
      const resCompleted = allEvents.filter(e => e.event_name === "research_completed");
      const resDurations = resCompleted
        .map(e => e.properties?.duration_ms as number)
        .filter(d => typeof d === "number" && d > 0);

      setStats({
        totalEvents: allEvents.length,
        campaignsCreated: allEvents.filter(e => e.event_name === "campaign_created").length,
        generationsStarted: allEvents.filter(e => e.event_name === "generation_started").length,
        generationsCompleted: genCompleted.length,
        generationsFailed: genFailed.length,
        generationSuccessRate: genCompleted.length + genFailed.length > 0
          ? (genCompleted.length / (genCompleted.length + genFailed.length)) * 100
          : 0,
        avgGenerationMs: genDurations.length > 0
          ? genDurations.reduce((a, b) => a + b, 0) / genDurations.length
          : 0,
        researchCompleted: resCompleted.length,
        avgResearchMs: resDurations.length > 0
          ? resDurations.reduce((a, b) => a + b, 0) / resDurations.length
          : 0,
        exportsDownloaded: allEvents.filter(e => e.event_name === "export_downloaded").length,
        draftsSaved: allEvents.filter(e => e.event_name === "draft_saved").length,
      });

      // Category breakdown
      const catMap: Record<string, number> = {};
      for (const e of allEvents) {
        catMap[e.event_category] = (catMap[e.event_category] || 0) + 1;
      }
      setCategories(
        Object.entries(catMap)
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => ({
            name,
            count,
            color: CATEGORY_COLORS[name] || "bg-gray-400",
          }))
      );
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-180px)]">
        <div className="max-w-[1200px] mx-auto px-6 py-10">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-200 border-t-indigo-500 mb-3" />
            <p className="text-sm text-gray-400">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  const maxCatCount = Math.max(...categories.map(c => c.count), 1);

  return (
    <div className="min-h-[calc(100vh-180px)]">
      <div className="max-w-[1200px] mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-500 text-sm mt-0.5">Feature usage and generation metrics</p>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(["24h", "7d", "30d", "all"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  timeRange === range
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {range === "all" ? "All Time" : range.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {stats && stats.totalEvents === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No events yet</h3>
            <p className="text-sm text-gray-400">Start using Creative Studio and analytics will appear here automatically.</p>
          </div>
        ) : stats && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl border border-gray-100 p-5" style={{ boxShadow: "var(--shadow-card)" }}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Campaigns Created</p>
                <p className="text-3xl font-bold text-gray-900">{stats.campaignsCreated}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-5" style={{ boxShadow: "var(--shadow-card)" }}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">AI Generations</p>
                <p className="text-3xl font-bold text-gray-900">{stats.generationsCompleted}</p>
                {stats.generationSuccessRate > 0 && (
                  <p className={`text-xs font-medium mt-1 ${stats.generationSuccessRate >= 80 ? "text-emerald-600" : stats.generationSuccessRate >= 50 ? "text-amber-600" : "text-red-500"}`}>
                    {stats.generationSuccessRate.toFixed(0)}% success rate
                  </p>
                )}
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-5" style={{ boxShadow: "var(--shadow-card)" }}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Exports</p>
                <p className="text-3xl font-bold text-gray-900">{stats.exportsDownloaded}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-5" style={{ boxShadow: "var(--shadow-card)" }}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Research Runs</p>
                <p className="text-3xl font-bold text-gray-900">{stats.researchCompleted}</p>
                {stats.avgResearchMs > 0 && (
                  <p className="text-xs text-gray-400 mt-1">avg {formatDuration(stats.avgResearchMs)}</p>
                )}
              </div>
            </div>

            {/* Performance + Category breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Performance metrics */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6" style={{ boxShadow: "var(--shadow-card)" }}>
                <h2 className="text-base font-bold text-gray-900 mb-4">Performance</h2>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Generation Success Rate</span>
                      <span className="font-semibold text-gray-900">{stats.generationSuccessRate.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${stats.generationSuccessRate >= 80 ? "bg-emerald-500" : stats.generationSuccessRate >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${Math.min(stats.generationSuccessRate, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Avg Generation Time</span>
                    <span className="font-semibold text-gray-900">{stats.avgGenerationMs > 0 ? formatDuration(stats.avgGenerationMs) : "N/A"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Avg Research Time</span>
                    <span className="font-semibold text-gray-900">{stats.avgResearchMs > 0 ? formatDuration(stats.avgResearchMs) : "N/A"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Drafts Saved</span>
                    <span className="font-semibold text-gray-900">{stats.draftsSaved}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Failed Generations</span>
                    <span className={`font-semibold ${stats.generationsFailed > 0 ? "text-red-500" : "text-gray-900"}`}>{stats.generationsFailed}</span>
                  </div>
                </div>
              </div>

              {/* Category breakdown */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6" style={{ boxShadow: "var(--shadow-card)" }}>
                <h2 className="text-base font-bold text-gray-900 mb-4">Activity by Category</h2>
                <div className="space-y-3">
                  {categories.map((cat) => (
                    <div key={cat.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 capitalize">{cat.name}</span>
                        <span className="font-semibold text-gray-900">{cat.count}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${cat.color}`}
                          style={{ width: `${(cat.count / maxCatCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <p className="text-sm text-gray-400">No activity yet</p>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Activity Feed */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6" style={{ boxShadow: "var(--shadow-card)" }}>
              <h2 className="text-base font-bold text-gray-900 mb-4">Recent Activity</h2>
              <div className="space-y-1">
                {events.slice(0, 30).map((event) => (
                  <div key={event.id} className="flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${CATEGORY_COLORS[event.event_category] || "bg-gray-400"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-700">
                          {EVENT_LABELS[event.event_name] || event.event_name}
                        </span>
                        {"state" in (event.properties || {}) && (
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {String(event.properties.state)}
                          </span>
                        )}
                        {"format" in (event.properties || {}) && (
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {String(event.properties.format)}
                          </span>
                        )}
                        {"duration_ms" in (event.properties || {}) && (
                          <span className="text-xs text-gray-400">
                            {formatDuration(Number(event.properties.duration_ms))}
                          </span>
                        )}
                      </div>
                      {event.campaign_id && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-indigo-500 font-medium truncate">
                            {campaignNames[event.campaign_id] || "Campaign"}
                          </span>
                          <span className="text-[10px] text-gray-300 font-mono">
                            {event.campaign_id.slice(0, 8).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-300 shrink-0 w-16 text-right mt-0.5">
                      {timeAgo(event.created_at)}
                    </span>
                  </div>
                ))}
                {events.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No events in this time range</p>
                )}
                {events.length > 30 && (
                  <p className="text-xs text-gray-400 text-center pt-2">Showing 30 of {events.length} events</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
