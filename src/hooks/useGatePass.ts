import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/components/AuthProvider";
import { toast } from "sonner";

export interface GatePassRequest {
  id: string;
  employee_id: string;
  branch_id: string | null;
  reason: string;
  destination: string | null;
  expected_out_at: string;
  expected_return_at: string;
  status:
    | "pending_manager"
    | "pending_hr"
    | "approved"
    | "rejected"
    | "exited"
    | "returned"
    | "overdue"
    | "cancelled";
  manager_id: string | null;
  manager_notes: string | null;
  hr_id: string | null;
  hr_notes: string | null;
  pass_code: string | null;
  actual_exit_at: string | null;
  actual_return_at: string | null;
  created_at: string;
  employee?: {
    first_name: string;
    last_name: string;
    email: string;
    position: string | null;
    department: string | null;
    avatar_url?: string | null;
  } | null;
  branch?: { name: string } | null;
}

export function useGatePass() {
  const { user } = useAuthContext();
  const [requests, setRequests] = useState<GatePassRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("gate_pass_requests")
        .select(
          `*,
          employee:profiles!gate_pass_requests_employee_id_fkey(first_name,last_name,email,position,department,avatar_url),
          branch:attendance_branches(name)`
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRequests((data as unknown as GatePassRequest[]) || []);
    } catch (e: any) {
      console.error("gate pass fetch:", e);
      toast.error(e.message || "Failed to load gate passes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchRequests();
  }, [user, fetchRequests]);

  const createRequest = async (input: {
    reason: string;
    destination?: string;
    expected_out_at: string;
    expected_return_at: string;
    branch_id?: string | null;
  }) => {
    if (!user) return { error: "no user" };
    // Check if manager approval required
    const { data: settings } = await supabase
      .from("gate_pass_settings")
      .select("require_manager_approval")
      .limit(1)
      .maybeSingle();
    const { data: prof } = await supabase
      .from("profiles")
      .select("line_manager_id")
      .eq("id", user.id)
      .maybeSingle();
    const initialStatus =
      settings?.require_manager_approval && prof?.line_manager_id
        ? "pending_manager"
        : "pending_hr";

    const { error } = await supabase.from("gate_pass_requests").insert({
      employee_id: user.id,
      reason: input.reason,
      destination: input.destination || null,
      expected_out_at: input.expected_out_at,
      expected_return_at: input.expected_return_at,
      branch_id: input.branch_id || null,
      status: initialStatus,
    });
    if (error) {
      toast.error(error.message);
      return { error };
    }
    toast.success("Gate pass request submitted");
    await fetchRequests();
    return { error: null };
  };

  const callAction = async (payload: Record<string, any>) => {
    const { data, error } = await supabase.functions.invoke("gate-pass", { body: payload });
    if (error) {
      toast.error(error.message || "Action failed");
      return { error, data: null };
    }
    if (data?.error) {
      toast.error(data.error);
      return { error: data.error, data: null };
    }
    return { error: null, data };
  };

  const managerDecide = async (id: string, approve: boolean, notes?: string) => {
    const res = await callAction({
      action: approve ? "manager_approve" : "manager_reject",
      request_id: id,
      notes,
    });
    if (!res.error) {
      toast.success(approve ? "Approved — forwarded to HR" : "Rejected");
      fetchRequests();
    }
    return res;
  };

  const hrDecide = async (id: string, approve: boolean, notes?: string) => {
    const res = await callAction({
      action: approve ? "hr_approve" : "hr_reject",
      request_id: id,
      notes,
    });
    if (!res.error) {
      toast.success(approve ? `Approved. Code: ${res.data?.pass_code}` : "Rejected");
      fetchRequests();
    }
    return res;
  };

  const verifyCode = async (code: string) => {
    const res = await callAction({ action: "verify_code", pass_code: code });
    if (!res.error) {
      toast.success("Exit recorded");
      fetchRequests();
    }
    return res;
  };

  const markReturn = async (id: string) => {
    const res = await callAction({ action: "mark_return", request_id: id });
    if (!res.error) {
      toast.success("Return recorded");
      fetchRequests();
    }
    return res;
  };

  const cancelRequest = async (id: string) => {
    const { error } = await supabase
      .from("gate_pass_requests")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return { error };
    }
    toast.success("Cancelled");
    fetchRequests();
    return { error: null };
  };

  return {
    requests,
    loading,
    fetchRequests,
    createRequest,
    managerDecide,
    hrDecide,
    verifyCode,
    markReturn,
    cancelRequest,
  };
}