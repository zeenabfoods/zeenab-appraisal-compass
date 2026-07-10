import { useState } from "react";
import { useGatePass, GatePassRequest } from "@/hooks/useGatePass";
import { useBranches } from "@/hooks/attendance/useBranches";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { Shield, UserPlus, Check, X, Trash2 } from "lucide-react";
import { toast } from "sonner";

const statusColor: Record<string, string> = {
  pending_manager: "bg-yellow-500",
  pending_hr: "bg-amber-500",
  approved: "bg-green-500",
  rejected: "bg-red-500",
  exited: "bg-blue-500",
  returned: "bg-emerald-600",
  overdue: "bg-red-600",
  cancelled: "bg-gray-500",
};

function RequestList({
  items, onApprove, onReject, showActions,
}: {
  items: GatePassRequest[];
  onApprove?: (r: GatePassRequest) => void;
  onReject?: (r: GatePassRequest) => void;
  showActions?: boolean;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No requests</p>;
  }
  return (
    <div className="space-y-3">
      {items.map((r) => (
        <div key={r.id} className="border rounded-lg p-4">
          <div className="flex justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium">
                {r.employee?.first_name} {r.employee?.last_name}{" "}
                <span className="text-xs text-muted-foreground">
                  · {r.employee?.position || "Staff"}
                </span>
              </p>
              <p className="text-sm mt-1">{r.reason}</p>
              {r.destination && (
                <p className="text-xs text-muted-foreground">→ {r.destination}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Out: {format(new Date(r.expected_out_at), "PP p")} · Return:{" "}
                {format(new Date(r.expected_return_at), "PP p")}
              </p>
              {r.branch?.name && <p className="text-xs text-muted-foreground">Branch: {r.branch.name}</p>}
              {r.pass_code && (
                <p className="text-xs mt-1 font-mono font-semibold text-green-700">
                  Code: {r.pass_code}
                </p>
              )}
            </div>
            <Badge className={statusColor[r.status]}>{r.status.replace("_", " ")}</Badge>
          </div>
          {showActions && (
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={() => onApprove?.(r)} className="bg-green-600 hover:bg-green-700">
                <Check className="h-3 w-3 mr-1" /> Approve
              </Button>
              <Button size="sm" variant="destructive" onClick={() => onReject?.(r)}>
                <X className="h-3 w-3 mr-1" /> Reject
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SecurityAccountsPanel() {
  const { branches } = useBranches();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: "", password: "", first_name: "", last_name: "", branch_ids: [] as string[],
  });
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAccounts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("attendance_user_roles")
      .select(`id, user_id, is_active, assigned_at`)
      .eq("role", "security")
      .order("assigned_at", { ascending: false });
    if (!data) { setLoading(false); return; }
    const ids = data.map((r) => r.user_id);
    if (ids.length === 0) { setAccounts([]); setLoading(false); return; }
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .in("id", ids);
    const { data: assigns } = await supabase
      .from("gate_pass_security_assignments")
      .select("user_id, branch_id, is_active, attendance_branches(name)")
      .in("user_id", ids);
    const profMap = new Map((profs || []).map((p) => [p.id, p]));
    const assignMap = new Map<string, any[]>();
    (assigns || []).forEach((a: any) => {
      const arr = assignMap.get(a.user_id) || [];
      arr.push(a);
      assignMap.set(a.user_id, arr);
    });
    setAccounts(
      data.map((r) => ({
        ...r,
        profile: profMap.get(r.user_id),
        branches: assignMap.get(r.user_id) || [],
      }))
    );
    setLoading(false);
  };

  useState(() => { loadAccounts(); });

  const createAccount = async () => {
    if (!form.email || !form.password || !form.first_name) {
      toast.error("Email, password, first name required");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("gate-pass", {
      body: { action: "create_security_account", ...form },
    });
    setSaving(false);
    if (error || data?.error) {
      toast.error(error?.message || data?.error || "Failed");
      return;
    }
    toast.success("Security account created");
    setOpen(false);
    setForm({ email: "", password: "", first_name: "", last_name: "", branch_ids: [] });
    loadAccounts();
  };

  const revoke = async (roleId: string) => {
    await supabase.from("attendance_user_roles").update({ is_active: false }).eq("id", roleId);
    toast.success("Revoked");
    loadAccounts();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" /> Security Guard Accounts
          </CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><UserPlus className="h-4 w-4 mr-1" /> New Guard</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Security Account</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>First Name</Label><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
                  <div><Label>Last Name</Label><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
                </div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Temp Password</Label><Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
                <div>
                  <Label>Assign to Branches</Label>
                  <div className="space-y-2 mt-2 max-h-40 overflow-auto">
                    {branches.map((b) => (
                      <label key={b.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={form.branch_ids.includes(b.id)}
                          onCheckedChange={(v) => {
                            setForm({
                              ...form,
                              branch_ids: v
                                ? [...form.branch_ids, b.id]
                                : form.branch_ids.filter((x) => x !== b.id),
                            });
                          }}
                        />
                        {b.name}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={createAccount} disabled={saving}>{saving ? "Creating..." : "Create"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {accounts.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground">No security guards yet.</p>
        )}
        <div className="space-y-2">
          {accounts.map((a) => (
            <div key={a.id} className="border rounded p-3 flex justify-between items-center">
              <div>
                <p className="font-medium">
                  {a.profile?.first_name} {a.profile?.last_name}
                  {!a.is_active && <span className="ml-2 text-xs text-red-500">(revoked)</span>}
                </p>
                <p className="text-xs text-muted-foreground">{a.profile?.email}</p>
                <p className="text-xs text-muted-foreground">
                  Branches: {a.branches.map((b: any) => b.attendance_branches?.name).filter(Boolean).join(", ") || "—"}
                </p>
              </div>
              {a.is_active && (
                <Button size="sm" variant="outline" onClick={() => revoke(a.id)}>
                  <Trash2 className="h-3 w-3 mr-1" /> Revoke
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function GatePassHRAdmin() {
  const { requests, hrDecide } = useGatePass();
  const [tab, setTab] = useState("pending");

  const pending = requests.filter((r) => ["pending_manager", "pending_hr"].includes(r.status));
  const approved = requests.filter((r) => r.status === "approved");
  const out = requests.filter((r) => ["exited", "overdue"].includes(r.status));
  const returned = requests.filter((r) => r.status === "returned");
  const rejected = requests.filter((r) => ["rejected", "cancelled"].includes(r.status));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gate Pass Administration</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex flex-wrap">
              <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
              <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
              <TabsTrigger value="out">Out ({out.length})</TabsTrigger>
              <TabsTrigger value="returned">Returned ({returned.length})</TabsTrigger>
              <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className="mt-4">
              <RequestList
                items={pending}
                showActions
                onApprove={(r) => hrDecide(r.id, true)}
                onReject={(r) => hrDecide(r.id, false)}
              />
            </TabsContent>
            <TabsContent value="approved" className="mt-4">
              <RequestList items={approved} />
            </TabsContent>
            <TabsContent value="out" className="mt-4">
              <RequestList items={out} />
            </TabsContent>
            <TabsContent value="returned" className="mt-4">
              <RequestList items={returned} />
            </TabsContent>
            <TabsContent value="rejected" className="mt-4">
              <RequestList items={rejected} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <SecurityAccountsPanel />
    </div>
  );
}