import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Activity, Radio } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import {
  getConsiliumGithubActivity,
  resolveConsiliumWorkspaceId,
  type ConsiliumGithubActivity,
} from "@/lib/api";
import { managerNavItems } from "@/pages/corporate/managerNav";

const ManagerMonitoring = () => {
  const { workspaceId = "" } = useParams();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<ConsiliumGithubActivity | null>(null);
  const [consiliumWorkspaceId, setConsiliumWorkspaceId] = useState("");


  const load = async () => {
    if (!token || !workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const resolvedId =
        consiliumWorkspaceId || (await resolveConsiliumWorkspaceId(token, workspaceId));
      setConsiliumWorkspaceId(resolvedId);
      const data = await getConsiliumGithubActivity(token, resolvedId);
      setActivity(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load monitoring data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [workspaceId, token]);

  const commits = activity?.commits ?? [];
  const pulls = activity?.pulls ?? [];
  const merged = pulls.filter((p) => Boolean((p as { merged?: boolean }).merged)).length;

  const stream = useMemo(() => {
    return [
      ...commits.slice(0, 6).map((c) => ({
        id: String((c as { sha?: string; id?: string }).sha || (c as { id?: string }).id || Math.random()),
        type: "commit",
        title: (c as { message?: string }).message || "Commit",
      })),
      ...pulls.slice(0, 4).map((p) => ({
        id: String((p as { number?: number }).number || Math.random()),
        type: "pull",
        title: `PR #${(p as { number?: number }).number ?? "?"} ${(p as { title?: string }).title ?? ""}`,
      })),
    ];
  }, [commits, pulls]);

  return (
    <DashboardLayout sidebarItems={managerNavItems(workspaceId)} sidebarTitle="Manager" sidebarSubtitle="Business Dashboard">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Monitoring</h1>
            <p className="text-muted-foreground">Live PMZero agent telemetry from GitHub activity.</p>
          </div>
          <Button onClick={() => void load()} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Commits</p><p className="text-2xl font-bold">{commits.length}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Pull Requests</p><p className="text-2xl font-bold">{pulls.length}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Merged PRs</p><p className="text-2xl font-bold">{merged}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Repo</p><p className="text-sm font-medium truncate">{activity?.repo?.full_name ?? "Not connected"}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Radio className="h-4 w-4" /> Signal Stream</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stream.length === 0 && <p className="text-sm text-muted-foreground">No recent signals.</p>}
            {stream.map((s) => (
              <div key={s.id} className="rounded border p-3">
                <Badge variant="outline" className="mr-2">{s.type}</Badge>
                <span className="text-sm">{s.title}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ManagerMonitoring;
