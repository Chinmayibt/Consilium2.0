import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Strategic Roadmap</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(roadmap.phases || []).map((phase, idx) => (
                  <div key={`${phase.phase || "phase"}-${idx}`} className="rounded border p-3">
                    <p className="font-medium">{phase.phase || `Phase ${idx + 1}`}: {phase.title || ""}</p>
                    {phase.date_range && <p className="text-xs text-muted-foreground mt-1">{phase.date_range}</p>}
                    {phase.goal && <p className="text-sm mt-2">{phase.goal}</p>}
                    {(phase.streams || []).length > 0 && (
                      <div className="mt-3 space-y-2">
                        {(phase.streams || []).map((stream, sidx) => (
                          <div key={`${phase.phase || idx}-stream-${sidx}`} className="rounded bg-muted/40 p-2">
                            <p className="text-sm font-medium capitalize">
                              {stream.stream} {stream.owner ? `(${stream.owner})` : ""}
                            </p>
                            <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
                              {(stream.actions || []).map((action, aidx) => (
                                <li key={`${phase.phase || idx}-stream-${sidx}-action-${aidx}`}>{action}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                    {(phase.deliverables || []).length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium">Deliverables</p>
                        <ul className="list-disc pl-5 text-sm text-muted-foreground">
                          {(phase.deliverables || []).map((d, didx) => (
                            <li key={`${phase.phase || idx}-deliv-${didx}`}>{d}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {phase.execution_notes && (
                      <p className="text-xs text-muted-foreground mt-2">{phase.execution_notes}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Milestone Tracker</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(roadmap.milestone_tracker || []).length === 0 && (
                  <p className="text-sm text-muted-foreground">No milestones available yet.</p>
                )}
                {(roadmap.milestone_tracker || []).map((m, idx) => (
                  <div key={`${m.milestone}-${idx}`} className="grid grid-cols-1 gap-1 rounded border p-3 md:grid-cols-3">
                    <p className="text-sm font-medium">{m.milestone}</p>
                    <p className="text-sm text-muted-foreground">{m.deliverable}</p>
                    <p className="text-sm">{m.primary_owner}</p>
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
