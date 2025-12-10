import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'break_start' | 'break_ending' | 'closing_soon' | 'custom';
  userIds?: string[];
  title?: string;
  message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID");
    const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      console.log("OneSignal credentials not configured");
      return new Response(JSON.stringify({ error: "OneSignal not configured" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { type, userIds, title, message }: NotificationRequest = await req.json();

    let notificationTitle = title || "";
    let notificationMessage = message || "";
    let targetUserIds = userIds || [];

    // Get active clocked-in employees if no specific users provided
    if (targetUserIds.length === 0) {
      const { data: activeSessions } = await supabase
        .from('attendance_logs')
        .select('employee_id')
        .is('clock_out_time', null)
        .eq('location_type', 'office');

      if (activeSessions && activeSessions.length > 0) {
        targetUserIds = activeSessions.map((s: any) => s.employee_id);
      }
    }

    // Set default messages based on type
    switch (type) {
      case 'break_start':
        notificationTitle = notificationTitle || "⏰ Break Time!";
        notificationMessage = notificationMessage || "It's time for your scheduled break. Take a moment to rest.";
        break;
      case 'break_ending':
        notificationTitle = notificationTitle || "⚠️ Break Ending Soon";
        notificationMessage = notificationMessage || "Your break ends in 5 minutes. Please prepare to return to work.";
        break;
      case 'closing_soon':
        notificationTitle = notificationTitle || "🕐 3 Minutes to Closing";
        notificationMessage = notificationMessage || "Work day ends in 3 minutes. Please remember to clock out to avoid penalties.";
        break;
      default:
        if (!notificationTitle || !notificationMessage) {
          return new Response(JSON.stringify({ error: "Title and message required for custom notifications" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
    }

    if (targetUserIds.length === 0) {
      console.log("No active sessions found to notify");
      return new Response(JSON.stringify({ success: true, message: "No users to notify" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Sending ${type} notification to ${targetUserIds.length} users`);

    const notificationPayload = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: notificationTitle },
      contents: { en: notificationMessage },
      include_external_user_ids: targetUserIds,
      data: { type },
    };

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(notificationPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("OneSignal API error:", result);
      return new Response(JSON.stringify({ error: result.errors?.[0] || "Failed to send notification" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Notification sent successfully:", result);

    // Log the notification in the database
    await supabase.from('notifications').insert(
      targetUserIds.map((userId: string) => ({
        user_id: userId,
        type: `attendance_${type}`,
        title: notificationTitle,
        message: notificationMessage,
      }))
    );

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending scheduled notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
