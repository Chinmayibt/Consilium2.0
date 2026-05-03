import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getConsiliumRoadmap, resolveConsiliumWorkspaceId, type ConsiliumRoadmap } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { managerNavItems } from "@/pages/corporate/managerNav";

const ManagerRoadmap = () => {
  const { workspaceId = "" } = useParams();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roadmap, setRoadmap] = useState<ConsiliumRoadmap | null>(null);

  const load = async () => {
    if (!token || !workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const consiliumWorkspaceId = await resolveConsiliumWorkspaceId(token, workspaceId);
      const data = await getConsiliumRoadmap(token, consiliumWorkspaceId);
      setRoadmap(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load roadmap");
      setRoadmap(null);
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
            <h1 className="text-2xl font-bold">Roadmap</h1>
            <p className="text-muted-foreground">Planning agent output and generated execution tasks.</p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!loading && !roadmap && <p className="text-sm text-muted-foreground">No roadmap available yet.</p>}

        {roadmap && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Phases</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(roadmap.phases || []).map((phase, idx) => (
                  <div key={`${phase.phase || "phase"}-${idx}`} className="rounded border p-3">
                    <p className="font-medium">{phase.phase || `Phase ${idx + 1}`}</p>
                    <p className="text-sm">{phase.title || ""}</p>
                    {phase.date_range && <p className="text-xs text-muted-foreground mt-1">{phase.date_range}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Tasks</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(roadmap.tasks || []).map((task, idx) => (
                  <div key={`${task.id || "task"}-${idx}`} className="rounded border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{task.title || "Untitled task"}</p>
                      <Badge variant="outline">{task.status || "todo"}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{task.description || ""}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ManagerRoadmap;
