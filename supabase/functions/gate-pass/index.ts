// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const WORDS = [
  "SWIFT","EAGLE","TIGER","LION","STORM","RIVER","OCEAN","SUNNY","STAR","MOON",
  "BRAVE","NOBLE","QUICK","SHARP","BRIGHT","GOLD","SILVER","RUBY","PEARL","JADE",
  "FALCON","HAWK","WOLF","BEAR","FOX","DEER","OWL","DOVE","SWAN","CRANE",
  "MANGO","APPLE","LEMON","OLIVE","CEDAR","OAK","PALM","LOTUS","ROSE","LILY",
  "PIANO","DRUM","FLUTE","HARP","VIOLIN","GUITAR","BELL","ECHO","RHYME","TUNE",
  "PILOT","CAPTAIN","SCOUT","RANGER","GUIDE","HERO","LEADER","CHIEF","MASTER","EXPERT",
  "CLOUD","THUNDER","BREEZE","FROST","EMBER","FLAME","SPARK","BEAM","GLOW","SHINE",
  "NORTH","SOUTH","EAST","WEST","PEAK","VALLEY","MEADOW","FOREST","HARBOR","BRIDGE",
  "AMBER","CORAL","IVORY","OPAL","TOPAZ","EMBER","VELVET","SATIN","LINEN","COTTON",
  "MELON","BERRY","GRAPE","PEACH","CHERRY","PLUM","KIWI","GUAVA","PAPAYA","DATE"
];

function generatePassCode() {
  const w1 = WORDS[Math.floor(Math.random() * WORDS.length)];
  let w2 = WORDS[Math.floor(Math.random() * WORDS.length)];
  while (w2 === w1) w2 = WORDS[Math.floor(Math.random() * WORDS.length)];
  const num = String(Math.floor(Math.random() * 90) + 10);
  return `${w1}-${w2}-${num}`;
}

async function notify(
  admin: any,
  userIds: string[],
  type: string,
  title: string,
  message: string,
  extra: Record<string, any> = {},
) {
  const rows = userIds.filter(Boolean).map((uid) => ({
    user_id: uid,
    type,
    title,
    message,
    ...extra,
  }));
  if (rows.length === 0) return;
  const { error } = await admin.from("notifications").insert(rows);
  if (error) console.error("notify error:", error);
}

async function logGatePassAudit(
  admin: any,
  performed_by: string,
  target_employee_id: string,
  action_type: string,
  request_id: string,
  extra: Record<string, any> = {},
) {
  await admin.from("attendance_audit_logs").insert({
    action_type,
    action_category: "gate_pass",
    performed_by,
    target_employee_id,
    target_record_id: request_id,
    target_table: "gate_pass_requests",
    new_values: extra,
  });
}

async function getHrUserIds(admin: any): Promise<string[]> {
  const { data } = await admin
    .from("profiles")
    .select("id")
    .in("role", ["hr", "admin"])
    .eq("is_active", true);
  return (data || []).map((p: any) => p.id);
}

async function getSecurityUserIdsForBranch(admin: any, branch_id: string | null): Promise<string[]> {
  if (!branch_id) return [];
  const { data } = await admin
    .from("gate_pass_security_assignments")
    .select("user_id")
    .eq("branch_id", branch_id)
    .eq("is_active", true);
  return (data || []).map((r: any) => r.user_id);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const uid = userData.user.id;

    const body = await req.json();
    const { action, request_id, notes, pass_code } = body;

    // Load caller profile
    const { data: caller } = await admin
      .from("profiles")
      .select("id, role, first_name, last_name")
      .eq("id", uid)
      .maybeSingle();

    const isHR = caller?.role === "hr" || caller?.role === "admin";

    // Check security role
    const { data: secRole } = await admin
      .from("attendance_user_roles")
      .select("id")
      .eq("user_id", uid)
      .eq("role", "security")
      .eq("is_active", true)
      .maybeSingle();
    const isSecurity = !!secRole;

    // ---- MANAGER APPROVE ----
    if (action === "manager_approve" || action === "manager_reject") {
      const { data: reqRow, error: rErr } = await admin
        .from("gate_pass_requests")
        .select("*, profiles!gate_pass_requests_employee_id_fkey(line_manager_id)")
        .eq("id", request_id)
        .maybeSingle();
      if (rErr || !reqRow) throw new Error("Request not found");

      const empManagerId = (reqRow as any).profiles?.line_manager_id;
      if (empManagerId !== uid && !isHR) {
        return new Response(JSON.stringify({ error: "Not authorized" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (reqRow.status !== "pending_manager") {
        return new Response(JSON.stringify({ error: "Not pending manager approval" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const newStatus = action === "manager_approve" ? "pending_hr" : "rejected";
      await admin
        .from("gate_pass_requests")
        .update({
          status: newStatus,
          manager_id: uid,
          manager_decision_at: new Date().toISOString(),
          manager_notes: notes || null,
        })
        .eq("id", request_id);

      // Notify employee + HR (if approved)
      const empName = `${caller?.first_name || "Manager"}`;
      await notify(
        admin,
        [reqRow.employee_id],
        "gate_pass_manager_decision",
        action === "manager_approve" ? "Gate pass approved by manager" : "Gate pass rejected by manager",
        action === "manager_approve"
          ? "Your line manager approved your gate pass. Waiting on HR."
          : `Rejected by ${empName}. ${notes || ""}`,
        { related_employee_id: reqRow.employee_id },
      );
      if (newStatus === "pending_hr") {
        const hrIds = await getHrUserIds(admin);
        await notify(
          admin,
          hrIds,
          "gate_pass_hr_pending",
          "New gate pass awaiting HR",
          "A gate pass request has been approved by the manager and needs your review.",
          { related_employee_id: reqRow.employee_id },
        );
      }
      await logGatePassAudit(admin, uid, reqRow.employee_id, action, request_id, { notes });

      return new Response(JSON.stringify({ ok: true, status: newStatus }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- HR APPROVE ----
    if (action === "hr_approve" || action === "hr_reject") {
      if (!isHR) {
        return new Response(JSON.stringify({ error: "HR only" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: reqRow } = await admin
        .from("gate_pass_requests")
        .select("*")
        .eq("id", request_id)
        .maybeSingle();
      if (!reqRow) throw new Error("Request not found");
      if (!["pending_hr", "pending_manager"].includes(reqRow.status)) {
        return new Response(JSON.stringify({ error: "Cannot decide at this status" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "hr_reject") {
        await admin
          .from("gate_pass_requests")
          .update({
            status: "rejected",
            hr_id: uid,
            hr_decision_at: new Date().toISOString(),
            hr_notes: notes || null,
          })
          .eq("id", request_id);
        await notify(
          admin,
          [reqRow.employee_id],
          "gate_pass_hr_rejected",
          "Gate pass rejected",
          `HR rejected your gate pass request. ${notes || ""}`,
          { related_employee_id: reqRow.employee_id },
        );
        await logGatePassAudit(admin, uid, reqRow.employee_id, "hr_reject", request_id, { notes });
        return new Response(JSON.stringify({ ok: true, status: "rejected" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate unique code
      let code = generatePassCode();
      for (let i = 0; i < 8; i++) {
        const { data: existing } = await admin
          .from("gate_pass_requests")
          .select("id")
          .eq("pass_code", code)
          .maybeSingle();
        if (!existing) break;
        code = generatePassCode();
      }

      await admin
        .from("gate_pass_requests")
        .update({
          status: "approved",
          hr_id: uid,
          hr_decision_at: new Date().toISOString(),
          hr_notes: notes || null,
          pass_code: code,
        })
        .eq("id", request_id);

      // Notify employee with code + security guards at branch
      await notify(
        admin,
        [reqRow.employee_id],
        "gate_pass_approved",
        "Gate pass approved",
        `Your gate pass is approved. Show this code at the gate: ${code}`,
        { related_employee_id: reqRow.employee_id },
      );
      const secIds = await getSecurityUserIdsForBranch(admin, reqRow.branch_id);
      await notify(
        admin,
        secIds,
        "gate_pass_security_incoming",
        "New approved gate pass",
        "A new gate pass has been approved. Employee will present a code at the gate.",
        { related_employee_id: reqRow.employee_id },
      );
      await logGatePassAudit(admin, uid, reqRow.employee_id, "hr_approve", request_id, { notes });

      return new Response(JSON.stringify({ ok: true, status: "approved", pass_code: code }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- SECURITY VERIFY CODE (mark exit) ----
    if (action === "verify_code") {
      if (!isSecurity && !isHR) {
        return new Response(JSON.stringify({ error: "Security only" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!pass_code) {
        return new Response(JSON.stringify({ error: "Missing code" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const normalized = String(pass_code).trim().toUpperCase();
      const { data: reqRow } = await admin
        .from("gate_pass_requests")
        .select("*, profiles!gate_pass_requests_employee_id_fkey(first_name, last_name, email, department, position, avatar_url)")
        .eq("pass_code", normalized)
        .maybeSingle();

      if (!reqRow) {
        return new Response(JSON.stringify({ error: "Invalid code" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (reqRow.status !== "approved") {
        return new Response(
          JSON.stringify({ error: `Code cannot be used (status: ${reqRow.status})`, request: reqRow }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Verify security guard is assigned to this branch
      if (isSecurity && reqRow.branch_id) {
        const { data: assign } = await admin
          .from("gate_pass_security_assignments")
          .select("id")
          .eq("user_id", uid)
          .eq("branch_id", reqRow.branch_id)
          .eq("is_active", true)
          .maybeSingle();
        if (!assign) {
          return new Response(JSON.stringify({ error: "Not assigned to this branch" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      await admin
        .from("gate_pass_requests")
        .update({
          status: "exited",
          actual_exit_at: new Date().toISOString(),
          exit_recorded_by: uid,
          pass_code_used_at: new Date().toISOString(),
        })
        .eq("id", reqRow.id);

      // Notify employee + HR
      const hrIds = await getHrUserIds(admin);
      await notify(
        admin,
        [reqRow.employee_id, ...hrIds],
        "gate_pass_exit",
        "Gate exit recorded",
        `${reqRow.profiles?.first_name || "Employee"} has exited the premises via gate pass.`,
        { related_employee_id: reqRow.employee_id },
      );
      await logGatePassAudit(admin, uid, reqRow.employee_id, "gate_exit", reqRow.id, {});

      return new Response(JSON.stringify({ ok: true, request: reqRow }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- SECURITY MARK RETURN ----
    if (action === "mark_return") {
      if (!isSecurity && !isHR) {
        return new Response(JSON.stringify({ error: "Security only" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: reqRow } = await admin
        .from("gate_pass_requests")
        .select("*")
        .eq("id", request_id)
        .maybeSingle();
      if (!reqRow) throw new Error("Not found");
      if (!["exited", "overdue"].includes(reqRow.status)) {
        return new Response(JSON.stringify({ error: "Not currently out" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await admin
        .from("gate_pass_requests")
        .update({
          status: "returned",
          actual_return_at: new Date().toISOString(),
          return_recorded_by: uid,
        })
        .eq("id", request_id);

      const hrIds2 = await getHrUserIds(admin);
      await notify(
        admin,
        [reqRow.employee_id, ...hrIds2],
        "gate_pass_return",
        "Gate return recorded",
        "Employee has returned to the premises via gate pass.",
        { related_employee_id: reqRow.employee_id },
      );
      await logGatePassAudit(admin, uid, reqRow.employee_id, "gate_return", request_id, {});

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- HR: CREATE SECURITY ACCOUNT ----
    if (action === "create_security_account") {
      if (!isHR) {
        return new Response(JSON.stringify({ error: "HR only" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { email, password, first_name, last_name, branch_ids } = body;
      if (!email || !password || !first_name) {
        return new Response(JSON.stringify({ error: "Missing fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create auth user
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { first_name, last_name: last_name || "", role: "staff" },
      });
      if (cErr) throw cErr;
      const newUid = created.user.id;

      // Wait briefly then update profile
      await new Promise((r) => setTimeout(r, 500));
      await admin
        .from("profiles")
        .update({ first_name, last_name: last_name || "", email, position: "Security Guard" })
        .eq("id", newUid);

      // Grant security role
      await admin.from("attendance_user_roles").insert({
        user_id: newUid,
        role: "security",
        assigned_by: uid,
        is_active: true,
      });

      // Branch assignments
      if (Array.isArray(branch_ids)) {
        for (const bId of branch_ids) {
          await admin.from("gate_pass_security_assignments").insert({
            user_id: newUid,
            branch_id: bId,
            assigned_by: uid,
            is_active: true,
          });
        }
      }

      return new Response(JSON.stringify({ ok: true, user_id: newUid }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gate-pass error:", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});