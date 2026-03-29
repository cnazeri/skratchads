import { supabase } from "@/lib/supabase";

type EventCategory = "campaign" | "generation" | "research" | "export" | "editor" | "auth";

interface TrackEventParams {
  event: string;
  category: EventCategory;
  campaignId?: string;
  properties?: Record<string, unknown>;
}

/**
 * Fire-and-forget event tracking via Supabase.
 * Never throws — failures are silently logged to console.
 */
export function trackEvent({ event, category, campaignId, properties }: TrackEventParams) {
  // Run async but don't block the caller
  (async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { error } = await supabase.from("analytics_events").insert({
        user_id: session.user.id,
        event_name: event,
        event_category: category,
        campaign_id: campaignId || null,
        properties: properties || {},
      });
      if (error) console.warn("[analytics]", event, error.message);
    } catch (err) {
      console.warn("[analytics] error:", event, err);
    }
  })();
}

// ---------------------------------------------------------------------------
// Convenience helpers for common events
// ---------------------------------------------------------------------------

export function trackCampaignCreated(campaignId: string, props?: Record<string, unknown>) {
  trackEvent({ event: "campaign_created", category: "campaign", campaignId, properties: props });
}

export function trackResearchStarted(campaignId: string) {
  trackEvent({ event: "research_started", category: "research", campaignId });
}

export function trackResearchCompleted(campaignId: string, durationMs: number) {
  trackEvent({ event: "research_completed", category: "research", campaignId, properties: { duration_ms: durationMs } });
}

export function trackGenerationStarted(campaignId: string, props: { state?: string; format?: string; count?: number; creative_id?: string }) {
  trackEvent({ event: "generation_started", category: "generation", campaignId, properties: props });
}

export function trackGenerationCompleted(campaignId: string, props: { state?: string; format?: string; count?: number; success_count?: number; duration_ms?: number; creative_id?: string }) {
  trackEvent({ event: "generation_completed", category: "generation", campaignId, properties: props });
}

export function trackGenerationFailed(campaignId: string, props: { state?: string; error?: string }) {
  trackEvent({ event: "generation_failed", category: "generation", campaignId, properties: props });
}

export function trackExportDownloaded(campaignId: string, props: { type: "zip" | "single_png"; creative_count?: number }) {
  trackEvent({ event: "export_downloaded", category: "export", campaignId, properties: props });
}

export function trackDraftSaved(campaignId: string) {
  trackEvent({ event: "draft_saved", category: "editor", campaignId });
}

export function trackBannerStateSwitch(campaignId: string, state: string) {
  trackEvent({ event: "banner_state_switch", category: "editor", campaignId, properties: { state } });
}
