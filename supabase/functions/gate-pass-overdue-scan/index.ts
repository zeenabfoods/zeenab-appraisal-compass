// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Load settings
    const { data: settings } = await admin
      .from("gate_pass_settings")
      .select("overdue_grace_minutes, charge_on_overdue, overdue_charge_amount")
      .limit(1)
      .maybeSingle();
    const grace = settings?.overdue_grace_minutes ?? 30;
    const chargeOn = settings?.charge_on_overdue ?? true;
    const amount = Number(settings?.overdue_charge_amount ?? 0);

    const cutoff = new Date(Date.now() - grace * 60_000).toISOString();

    // Fetch overdue candidates: exited past return + grace, no return time
    const { data: candidates, error } = await admin
      .from("gate_pass_requests")
      .select("id, employee_id, expected_return_at, branch_id, status, overdue_charge_id, reason")
      .eq("status", "exited")
      .lt("expected_return_at", cutoff);
    if (error) throw error;

    const results: any[] = [];
    for (const r of candidates || []) {
      // Flip status
      await admin
        .from("gate_pass_requests")
        .update({ status: "overdue" })
        .eq("id", r.id);

      // Notify employee + HR + security
      const { data: hrRows } = await admin
        .from("profiles").select("id").in("role", ["hr", "admin"]).eq("is_active", true);
      const hrIds = (hrRows || []).map((p: any) => p.id);
      const { data: secRows } = await admin
        .from("gate_pass_security_assignments")
        .select("user_id")
        .eq("branch_id", r.branch_id)
        .eq("is_active", true);
      const secIds = (secRows || []).map((s: any) => s.user_id);

      const targets = [r.employee_id, ...hrIds, ...secIds];
      const notifRows = targets.map((uid) => ({
        user_id: uid,
        type: "gate_pass_overdue",
        title: "Gate pass overdue",
        message: `Employee has not returned after grace period. Reason: ${r.reason}`,
        related_employee_id: r.employee_id,
      }));
      if (notifRows.length) await admin.from("notifications").insert(notifRows);

      // Create charge if enabled + amount > 0 + not already charged
      if (chargeOn && amount > 0 && !r.overdue_charge_id) {
        const { data: charge, error: chErr } = await admin
          .from("attendance_charges")
          .insert({
            employee_id: r.employee_id,
            charge_type: "gate_pass_overdue",
            charge_amount: amount,
            status: "pending",
          })
          .select("id")
          .maybeSingle();
        if (!chErr && charge?.id) {
          await admin
            .from("gate_pass_requests")
            .update({ overdue_charge_id: charge.id })
            .eq("id", r.id);
        }
      }

      results.push({ id: r.id });
    }

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("overdue-scan error", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});