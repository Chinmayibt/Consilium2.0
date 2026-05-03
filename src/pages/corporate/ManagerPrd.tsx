import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  finalizeConsiliumPrd,
  getConsiliumPrd,
  resolveConsiliumWorkspaceId,
  saveConsiliumPrd,
  type ConsiliumPrd,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { managerNavItems } from "@/pages/corporate/managerNav";

const ManagerPrd = () => {
  const { workspaceId = "" } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [prd, setPrd] = useState<ConsiliumPrd | null>(null);
  const [status, setStatus] = useState("draft");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!token || !workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const consiliumWorkspaceId = await resolveConsiliumWorkspaceId(token, workspaceId);
      const data = await getConsiliumPrd(token, consiliumWorkspaceId);
      setPrd(data.prd);
      setStatus(data.prd_status || "draft");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load PRD");
      setPrd(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [workspaceId, token]);

  const saveAndFinalize = async () => {
    if (!token || !workspaceId || !prd) return;
    setSaving(true);
    setError(null);
    try {
      const consiliumWorkspaceId = await resolveConsiliumWorkspaceId(token, workspaceId);
      await saveConsiliumPrd(token, consiliumWorkspaceId, prd);
      await finalizeConsiliumPrd(token, consiliumWorkspaceId);
      navigate(`/business/manager/workspaces/${workspaceId}/roadmap`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to finalize PRD");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout sidebarItems={managerNavItems(workspaceId)} sidebarTitle="Manager" sidebarSubtitle="Business Dashboard">
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">PRD</h1>
            <p className="text-muted-foreground">Review and finalize requirements before roadmap generation.</p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>Refresh</Button>
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading PRD...</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {!loading && !prd && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">No PRD yet. Generate one from Requirements.</p>
            </CardContent>
          </Card>
        )}

        {prd && (
          <Card>
            <CardHeader>
              <CardTitle>Product Requirements Document</CardTitle>
              <CardDescription>Status: {status}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Overview</Label>
                <Textarea
                  value={String(prd.overview || "")}
                  onChange={(e) => setPrd((prev) => (prev ? { ...prev, overview: e.target.value } : prev))}
                />
              </div>
              <div className="space-y-2">
                <Label>Problem Statement</Label>
                <Textarea
                  value={String(prd.problem_statement || "")}
                  onChange={(e) => setPrd((prev) => (prev ? { ...prev, problem_statement: e.target.value } : prev))}
                />
              </div>
              <div className="space-y-2">
                <Label>Key Features (one per line)</Label>
                <Textarea
                  value={(prd.features || []).join("\n")}
                  onChange={(e) =>
                    setPrd((prev) =>
                      prev
                        ? { ...prev, features: e.target.value.split("\n").map((v) => v.trim()).filter(Boolean) }
                        : prev,
                    )
                  }
                />
              </div>
              <Button onClick={() => void saveAndFinalize()} disabled={saving}>
                {saving ? "Finalizing..." : "Save & Finalize PRD"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ManagerPrd;
