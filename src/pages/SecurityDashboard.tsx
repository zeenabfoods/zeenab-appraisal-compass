import { useEffect, useState } from "react";
import { useGatePass, GatePassRequest } from "@/hooks/useGatePass";
import { useAuthContext } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Shield, DoorOpen, LogOut, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";

const statusColor: Record<string, string> = {
  approved: "bg-green-500",
  exited: "bg-blue-500",
  returned: "bg-emerald-600",
  overdue: "bg-red-600",
  pending_manager: "bg-yellow-500",
  pending_hr: "bg-amber-500",
};

export default function SecurityDashboard() {
  const { user, profile, signOut, loading } = useAuthContext();
  const { requests, verifyCode, markReturn, fetchRequests } = useGatePass();
  const [isSecurity, setIsSecurity] = useState<boolean | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [tab, setTab] = useState("verify");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("attendance_user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "security")
      .eq("is_active", true)
      .maybeSingle()
      .then(({ data }) => setIsSecurity(!!data));
  }, [user]);

  const doVerify = async () => {
    if (!code.trim()) return;
    setVerifying(true);
    await verifyCode(code.trim().toUpperCase());
    setVerifying(false);
    setCode("");
  };

  if (loading || isSecurity === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <p className="text-white">Loading...</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  const isHR = profile?.role === "hr" || profile?.role === "admin";
  if (!isSecurity && !isHR) return <Navigate to="/" replace />;

  const out = requests.filter((r) => ["exited", "overdue"].includes(r.status));
  const returnedToday = requests.filter(
    (r) => r.status === "returned" && r.actual_return_at &&
      new Date(r.actual_return_at).toDateString() === new Date().toDateString()
  );
  const pending = requests.filter((r) => ["pending_manager", "pending_hr"].includes(r.status));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <header className="border-b border-white/10 backdrop-blur-md bg-black/30 sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-500 rounded-lg"><Shield className="h-5 w-5" /></div>
            <div>
              <h1 className="font-bold">Security Gate Post</h1>
              <p className="text-xs text-white/60">{format(new Date(), "EEEE, MMM d")}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="text-white hover:bg-white/10">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto space-y-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-4 bg-white/10">
            <TabsTrigger value="verify">Verify</TabsTrigger>
            <TabsTrigger value="out">Out ({out.length})</TabsTrigger>
            <TabsTrigger value="returned">Returned</TabsTrigger>
            <TabsTrigger value="pending">Pending HR</TabsTrigger>
          </TabsList>

          <TabsContent value="verify" className="mt-4">
            <Card className="bg-white/10 border-white/10 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DoorOpen className="h-5 w-5" /> Enter Pass Code
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="SWIFT-EAGLE-47"
                  className="text-center text-2xl font-mono h-16 bg-black/30 border-white/20 text-white placeholder:text-white/30 uppercase tracking-widest"
                  onKeyDown={(e) => e.key === "Enter" && doVerify()}
                />
                <Button
                  onClick={doVerify}
                  disabled={verifying || !code}
                  className="w-full h-14 text-lg bg-orange-500 hover:bg-orange-600"
                >
                  {verifying ? "Verifying..." : "Grant Exit"}
                </Button>
                <p className="text-xs text-white/50 text-center">
                  Enter the code from the employee's phone. On success, exit is logged.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="out" className="mt-4 space-y-2">
            {out.length === 0 && <p className="text-center text-white/60 py-8">No one currently out</p>}
            {out.map((r) => (
              <Card key={r.id} className="bg-white/10 border-white/10 text-white">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{r.employee?.first_name} {r.employee?.last_name}</p>
                      <p className="text-xs text-white/60">{r.reason}</p>
                      <p className="text-xs text-white/60 mt-1">
                        Left: {r.actual_exit_at && format(new Date(r.actual_exit_at), "p")} ·
                        Return by: {format(new Date(r.expected_return_at), "p")}
                      </p>
                    </div>
                    <Badge className={statusColor[r.status]}>{r.status}</Badge>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => markReturn(r.id)}
                    className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Mark Returned
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="returned" className="mt-4 space-y-2">
            {returnedToday.length === 0 && <p className="text-center text-white/60 py-8">No returns today</p>}
            {returnedToday.map((r) => (
              <Card key={r.id} className="bg-white/10 border-white/10 text-white">
                <CardContent className="p-4">
                  <p className="font-semibold">{r.employee?.first_name} {r.employee?.last_name}</p>
                  <p className="text-xs text-white/60">{r.reason}</p>
                  <p className="text-xs text-white/60">
                    Returned: {r.actual_return_at && format(new Date(r.actual_return_at), "p")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="pending" className="mt-4 space-y-2">
            {pending.length === 0 && <p className="text-center text-white/60 py-8">No pending requests</p>}
            {pending.map((r) => (
              <Card key={r.id} className="bg-white/10 border-white/10 text-white">
                <CardContent className="p-4">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-semibold">{r.employee?.first_name} {r.employee?.last_name}</p>
                      <p className="text-xs text-white/60">{r.reason}</p>
                    </div>
                    <Badge className={statusColor[r.status]}>{r.status.replace("_", " ")}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}