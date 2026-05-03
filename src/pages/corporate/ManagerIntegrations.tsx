import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  Github,
  RefreshCw,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import {
  getConsiliumGithubActivity,
  getConsiliumGithubConnectUrl,
  listConsiliumGithubRepos,
  resolveConsiliumWorkspaceId,
  selectConsiliumGithubRepo,
  type ConsiliumGithubActivity,
  type ConsiliumGithubRepo,
} from "@/lib/api";
import { managerNavItems } from "@/pages/corporate/managerNav";

const ManagerIntegrations = () => {
  const { workspaceId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<ConsiliumGithubActivity | null>(null);
  const [repos, setRepos] = useState<ConsiliumGithubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [savingRepo, setSavingRepo] = useState(false);
  const [repoPickerOpen, setRepoPickerOpen] = useState(false);
  const [consiliumWorkspaceId, setConsiliumWorkspaceId] = useState("");
  const basePath = `/business/manager/workspaces/${workspaceId}`;

  const ensureConsiliumWorkspace = async () => {
    if (!token || !workspaceId) return "";
    const resolvedId = await resolveConsiliumWorkspaceId(token, workspaceId);
    setConsiliumWorkspaceId(resolvedId);
    return resolvedId;
  };

  const loadActivity = async () => {
    if (!token || !workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const resolvedId = consiliumWorkspaceId || (await ensureConsiliumWorkspace());
      if (!resolvedId) return;
      const data = await getConsiliumGithubActivity(token, resolvedId);
      setActivity(data);
    } catch (e) {
      setActivity(null);
      setError(e instanceof Error ? e.message : "Failed to load integration status");
    } finally {
      setLoading(false);
    }
  };

  const loadRepos = async () => {
    if (!token || !workspaceId) return;
    setError(null);
    try {
      const resolvedId = consiliumWorkspaceId || (await ensureConsiliumWorkspace());
      if (!resolvedId) return;
      const data = await listConsiliumGithubRepos(token, resolvedId);
      setRepos(data);
      if (data.length > 0) setSelectedRepo(data[0].full_name);
      setRepoPickerOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load repositories");
      setRepos([]);
    }
  };

  const saveRepo = async () => {
    if (!token || !workspaceId || !selectedRepo) return;
    const [owner, name] = selectedRepo.split("/");
    if (!owner || !name) return;
    setSavingRepo(true);
    setError(null);
    try {
      const resolvedId = consiliumWorkspaceId || (await ensureConsiliumWorkspace());
      if (!resolvedId) return;
      await selectConsiliumGithubRepo(token, resolvedId, { owner, name });
      await loadActivity();
      setRepoPickerOpen(false);
      setRepos([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save repository");
    } finally {
      setSavingRepo(false);
    }
  };

  useEffect(() => {
    void loadActivity();
  }, [workspaceId, token]);

  useEffect(() => {
    const connected = searchParams.get("github") === "connected";
    if (connected) {
      void loadRepos();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, workspaceId, token, setSearchParams]);

  const connectUrl = useMemo(() => {
    if (!consiliumWorkspaceId) return "";
    return getConsiliumGithubConnectUrl(consiliumWorkspaceId);
  }, [consiliumWorkspaceId]);

  const repo = activity?.repo;
  const commitCount = activity?.commits?.length ?? 0;
  const prCount = activity?.pulls?.length ?? 0;

  return (
    <DashboardLayout sidebarItems={managerNavItems(workspaceId)} sidebarTitle="Manager" sidebarSubtitle="Business Dashboard">
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold">Integrations</h1>
          <p className="text-muted-foreground">Connect GitHub for PMZero-style repo activity and planning signals.</p>
        </div>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Github className="h-5 w-5" />
                GitHub OAuth
              </CardTitle>
              <CardDescription>Connect and select a repository for workspace-level monitoring.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => void loadActivity()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {repo ? (
              <div className="space-y-2">
                <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400">
                  Connected
                </Badge>
                <p className="text-sm">
                  Repository:{" "}
                  <a className="underline" target="_blank" rel="noreferrer" href={repo.html_url}>
                    {repo.full_name}
                  </a>
                </p>
                <p className="text-xs text-muted-foreground">
                  {repo.stars} stars · {repo.forks} forks · {commitCount} recent commits · {prCount} recent PRs
                </p>
                <Button type="button" variant="outline" onClick={() => void loadRepos()}>
                  Change repository
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">No GitHub repository connected yet.</p>
                <Button type="button" onClick={() => (window.location.href = connectUrl)} disabled={!consiliumWorkspaceId}>
                  Connect GitHub
                </Button>
              </div>
            )}

            {repoPickerOpen && repos.length > 0 && (
              <div className="space-y-3 rounded-md border p-3">
                <Label>Select repository</Label>
                <Select value={selectedRepo} onValueChange={setSelectedRepo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose repository" />
                  </SelectTrigger>
                  <SelectContent>
                    {repos.map((r) => (
                      <SelectItem key={r.id} value={r.full_name}>
                        {r.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button onClick={() => void saveRepo()} disabled={savingRepo || !selectedRepo}>
                    {savingRepo ? "Saving..." : "Save repository"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setRepoPickerOpen(false);
                      setRepos([]);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Agent Views</CardTitle>
            <CardDescription>Open PMZero agent-specific frontend pages.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link to={`${basePath}/monitoring`}>Monitoring</Link></Button>
            <Button asChild variant="outline"><Link to={`${basePath}/risks`}>Risks</Link></Button>
            <Button asChild variant="outline"><Link to={`${basePath}/activity`}>Activity</Link></Button>
            <Button asChild variant="outline"><Link to={`${basePath}/agents`}>Agents Info</Link></Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ManagerIntegrations;
