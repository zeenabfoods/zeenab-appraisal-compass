import { useGatePass, GatePassRequest } from "@/hooks/useGatePass";
import { useAuthContext } from "@/components/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Check, X, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

export function GatePassManager() {
  const { user } = useAuthContext();
  const { requests, managerDecide } = useGatePass();
  const [teamIds, setTeamIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("id")
      .eq("line_manager_id", user.id)
      .then(({ data }) => setTeamIds((data || []).map((p) => p.id)));
  }, [user]);

  const team = requests.filter((r) => teamIds.includes(r.employee_id));
  const pending = team.filter((r) => r.status === "pending_manager");
  const others = team.filter((r) => r.status !== "pending_manager");

  const renderList = (items: GatePassRequest[], actions: boolean) => (
    <div className="space-y-3">
      {items.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Nothing here</p>}
      {items.map((r) => (
        <div key={r.id} className="border rounded-lg p-4">
          <div className="flex justify-between gap-2">
            <div className="flex-1">
              <p className="font-medium">{r.employee?.first_name} {r.employee?.last_name}</p>
              <p className="text-sm mt-1">{r.reason}</p>
              {r.destination && <p className="text-xs text-muted-foreground">→ {r.destination}</p>}
              <p className="text-xs text-muted-foreground mt-1">
                Out: {format(new Date(r.expected_out_at), "PP p")} · Return: {format(new Date(r.expected_return_at), "PP p")}
              </p>
            </div>
            <Badge className={statusColor[r.status]}>{r.status.replace("_", " ")}</Badge>
          </div>
          {actions && (
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={() => managerDecide(r.id, true)} className="bg-green-600 hover:bg-green-700">
                <Check className="h-3 w-3 mr-1" /> Approve
              </Button>
              <Button size="sm" variant="destructive" onClick={() => managerDecide(r.id, false)}>
                <X className="h-3 w-3 mr-1" /> Reject
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Team Gate Pass Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <h3 className="text-sm font-semibold mb-2">Awaiting your approval ({pending.length})</h3>
          {renderList(pending, true)}
          <h3 className="text-sm font-semibold mt-6 mb-2">History</h3>
          {renderList(others, false)}
        </CardContent>
      </Card>
    </div>
  );
}