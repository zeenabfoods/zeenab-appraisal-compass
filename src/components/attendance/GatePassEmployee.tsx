import { useState } from "react";
import { useGatePass } from "@/hooks/useGatePass";
import { useBranches } from "@/hooks/attendance/useBranches";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { DoorOpen, Copy, X } from "lucide-react";
import { toast } from "sonner";
import { useAuthContext } from "@/components/AuthProvider";

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

export function GatePassEmployee() {
  const { user } = useAuthContext();
  const { requests, createRequest, cancelRequest, loading } = useGatePass();
  const { branches } = useBranches();
  const [form, setForm] = useState({
    reason: "",
    destination: "",
    expected_out_at: "",
    expected_return_at: "",
    branch_id: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const mine = requests.filter((r) => r.employee_id === user?.id);

  const submit = async () => {
    if (!form.reason || !form.expected_out_at || !form.expected_return_at) {
      toast.error("Reason and times are required");
      return;
    }
    setSubmitting(true);
    const res = await createRequest({
      reason: form.reason,
      destination: form.destination,
      expected_out_at: new Date(form.expected_out_at).toISOString(),
      expected_return_at: new Date(form.expected_return_at).toISOString(),
      branch_id: form.branch_id || null,
    });
    setSubmitting(false);
    if (!res.error) {
      setForm({ reason: "", destination: "", expected_out_at: "", expected_return_at: "", branch_id: "" });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DoorOpen className="h-5 w-5" /> Request Gate Pass
          </CardTitle>
          <CardDescription>Ask permission to leave the premises during work hours</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Reason *</Label>
            <Textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Why do you need to leave?"
            />
          </div>
          <div>
            <Label>Destination</Label>
            <Input
              value={form.destination}
              onChange={(e) => setForm({ ...form, destination: e.target.value })}
              placeholder="Where are you going?"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Expected Exit Time *</Label>
              <Input
                type="datetime-local"
                value={form.expected_out_at}
                onChange={(e) => setForm({ ...form, expected_out_at: e.target.value })}
              />
            </div>
            <div>
              <Label>Expected Return Time *</Label>
              <Input
                type="datetime-local"
                value={form.expected_return_at}
                onChange={(e) => setForm({ ...form, expected_return_at: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Branch (gate)</Label>
            <Select value={form.branch_id} onValueChange={(v) => setForm({ ...form, branch_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={submit} disabled={submitting} className="w-full bg-orange-600 hover:bg-orange-700">
            {submitting ? "Submitting..." : "Submit Request"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Gate Pass Requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {!loading && mine.length === 0 && (
            <p className="text-sm text-muted-foreground">No requests yet.</p>
          )}
          {mine.map((r) => (
            <div key={r.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-medium">{r.reason}</p>
                  {r.destination && <p className="text-xs text-muted-foreground">→ {r.destination}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    Out: {format(new Date(r.expected_out_at), "PP p")} · Return:{" "}
                    {format(new Date(r.expected_return_at), "PP p")}
                  </p>
                </div>
                <Badge className={statusColor[r.status]}>{r.status.replace("_", " ")}</Badge>
              </div>
              {r.status === "approved" && r.pass_code && (
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-300 dark:border-green-800 rounded-md p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-green-700 dark:text-green-400 font-semibold uppercase">Your Gate Code</p>
                    <p className="text-2xl font-mono font-bold tracking-wider">{r.pass_code}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(r.pass_code!);
                      toast.success("Copied");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {(r.status === "pending_manager" || r.status === "pending_hr") && (
                <Button variant="outline" size="sm" onClick={() => cancelRequest(r.id)}>
                  <X className="h-3 w-3 mr-1" /> Cancel
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}