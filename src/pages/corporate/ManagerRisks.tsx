import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { apiBaseUrl, getAuthHeaders, resolveConsiliumWorkspaceId } from "@/lib/api";
import { managerNavItems } from "@/pages/corporate/managerNav";

type RiskItem = {
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  suggested_action: string;
};

const ManagerRisks = () => {
  const { workspaceId = "" } = useParams();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [risks, setRisks] = useState<RiskItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [consiliumWorkspaceId, setConsiliumWorkspaceId] = useState("");

  const load = async () => {
    if (!token || !workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const resolvedId =
        consiliumWorkspaceId || (await resolveConsiliumWorkspaceId(token, workspaceId));
      setConsiliumWorkspaceId(resolvedId);
      const res = await fetch(`${apiBaseUrl}/api/workspaces/${encodeURIComponent(resolvedId)}/risks`, {
        headers: getAuthHeaders(token),
      });
      if (!res.ok) throw new Error("Failed to load risks");
      const data = (await res.json()) as { risks?: RiskItem[] };
      setRisks(data.risks ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load risks");
      setRisks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [workspaceId, token]);

  return (
    <DashboardLayout sidebarItems={managerNavItems(workspaceId)} sidebarTitle="Manager" sidebarSubtitle="Business Dashboard">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Risk Dashboard</h1>
            <p className="text-muted-foreground">Risk agent output for this workspace.</p>
          </div>
          <Button onClick={() => void load()} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Risks</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {risks.length === 0 && <p className="text-sm text-muted-foreground">No risks detected.</p>}
            {risks.map((r, idx) => (
              <div key={`${r.title}-${idx}`} className="rounded border p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{r.title}</p>
                  <Badge variant="outline">{r.severity}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{r.description}</p>
                <p className="text-sm"><span className="font-medium">Action:</span> {r.suggested_action}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ManagerRisks;
