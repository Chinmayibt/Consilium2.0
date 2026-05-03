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

type DocMode = "preview" | "edit";

type ListField = {
  key: keyof ConsiliumPrd;
  label: string;
};

const listFields: ListField[] = [
  { key: "target_users", label: "Target Users" },
  { key: "market_analysis", label: "Market Analysis" },
  { key: "features", label: "Key Features" },
  { key: "user_stories", label: "User Stories" },
  { key: "functional_requirements", label: "Functional Requirements" },
  { key: "non_functional_requirements", label: "Non-Functional Requirements" },
  { key: "system_architecture", label: "System Architecture" },
  { key: "tech_stack", label: "Tech Stack" },
  { key: "database_design", label: "Data Schema Design" },
  { key: "api_design", label: "API Design" },
  { key: "security", label: "Security" },
  { key: "performance", label: "Performance" },
  { key: "deployment", label: "Deployment" },
  { key: "risks_and_mitigations", label: "Technical Constraints and Risks" },
  { key: "milestones", label: "Roadmap" },
  { key: "mvp_scope", label: "MVP Scope" },
  { key: "future_enhancements", label: "Future Enhancements" },
  { key: "assumptions_and_out_of_scope", label: "Assumptions and Out of Scope" },
  { key: "implementation_notes", label: "Implementation Notes" },
  { key: "observability_and_reason_codes", label: "Observability and Reason Codes" },
];

const ManagerPrd = () => {
  const { workspaceId = "" } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [prd, setPrd] = useState<ConsiliumPrd | null>(null);
  const [mode, setMode] = useState<DocMode>("preview");
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
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">PRD</h1>
            <p className="text-muted-foreground">Review and finalize requirements before roadmap generation.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={mode === "preview" ? "default" : "outline"} onClick={() => setMode("preview")}>
              Preview
            </Button>
            <Button variant={mode === "edit" ? "default" : "outline"} onClick={() => setMode("edit")}>
              Edit
            </Button>
            <Button variant="outline" onClick={() => void load()} disabled={loading}>Refresh</Button>
          </div>
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

        {prd && mode === "preview" && (
          <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
            <Card className="h-fit lg:sticky lg:top-4">
              <CardHeader>
                <CardTitle className="text-sm">Contents</CardTitle>
                <CardDescription>Status: {status}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {(prd.doc_sections || []).map((section) => (
                  <a key={section.id} href={`#${section.id}`} className="block text-muted-foreground hover:text-foreground">
                    {section.title}
                  </a>
                ))}
              </CardContent>
            </Card>

            <article className="rounded-xl border bg-white p-8 shadow-sm">
              <h1 className="mb-2 text-3xl font-semibold">Technical Product Requirements Document</h1>
              <p className="mb-8 text-sm text-muted-foreground">Generated PRD • Status: {status}</p>

              {(prd.doc_sections || []).map((section) => (
                <section key={section.id} id={section.id} className="mb-8 scroll-mt-24">
                  <h2 className="mb-3 text-xl font-semibold">{section.title}</h2>
                  {section.type === "paragraphs" && (
                    <div className="space-y-3">
                      {section.content.map((block, idx) => (
                        <p key={`${section.id}-p-${idx}`} className="leading-7 text-[15px] text-slate-800">
                          {block}
                        </p>
                      ))}
                    </div>
                  )}
                  {section.type !== "paragraphs" && (
                    <ul className="list-disc space-y-2 pl-6">
                      {section.content.map((item, idx) => (
                        <li key={`${section.id}-l-${idx}`} className="leading-7 text-[15px] text-slate-800">
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </article>
          </div>
        )}

        {prd && mode === "edit" && (
          <Card>
            <CardHeader>
              <CardTitle>Edit PRD Document</CardTitle>
              <CardDescription>Document-style editing for all generated PRD sections.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Executive Summary</Label>
                <Textarea
                  className="min-h-28"
                  value={String(prd.executive_summary || "")}
                  onChange={(e) => setPrd((prev) => (prev ? { ...prev, executive_summary: e.target.value } : prev))}
                />
              </div>
              <div className="space-y-2">
                <Label>Overview</Label>
                <Textarea
                  className="min-h-28"
                  value={String(prd.overview || "")}
                  onChange={(e) => setPrd((prev) => (prev ? { ...prev, overview: e.target.value } : prev))}
                />
              </div>
              <div className="space-y-2">
                <Label>Problem Statement</Label>
                <Textarea
                  className="min-h-36"
                  value={String(prd.problem_statement || "")}
                  onChange={(e) => setPrd((prev) => (prev ? { ...prev, problem_statement: e.target.value } : prev))}
                />
              </div>

              {listFields.map(({ key, label }) => {
                const value = Array.isArray(prd[key]) ? (prd[key] as string[]) : [];
                return (
                  <div key={String(key)} className="space-y-2">
                    <Label>{label} (one per line)</Label>
                    <Textarea
                      className="min-h-28"
                      value={value.join("\n")}
                      onChange={(e) =>
                        setPrd((prev) =>
                          prev
                            ? {
                                ...prev,
                                [key]: e.target.value
                                  .split("\n")
                                  .map((v) => v.trim())
                                  .filter(Boolean),
                              }
                            : prev,
                        )
                      }
                    />
                  </div>
                );
              })}

              <div className="flex items-center gap-3">
                <Button onClick={() => void saveAndFinalize()} disabled={saving}>
                  {saving ? "Finalizing..." : "Save & Finalize PRD"}
                </Button>
                <Button variant="outline" onClick={() => setMode("preview")}>
                  Back to Preview
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ManagerPrd;
