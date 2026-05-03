import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { apiBaseUrl, getAuthHeaders, resolveConsiliumWorkspaceId } from "@/lib/api";
import { managerNavItems } from "@/pages/corporate/managerNav";

type ActivityLog = { action_type: string; description: string; timestamp: string };
type Notification = { type?: string; message?: string; read?: boolean; created_at?: string };

const ManagerActivity = () => {
  const { workspaceId = "" } = useParams();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [consiliumWorkspaceId, setConsiliumWorkspaceId] = useState("");

  const load = async () => {
    if (!token || !workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const resolvedId =
        consiliumWorkspaceId || (await resolveConsiliumWorkspaceId(token, workspaceId));
      setConsiliumWorkspaceId(resolvedId);
      const [aRes, nRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/workspaces/${encodeURIComponent(resolvedId)}/activity`, {
          headers: getAuthHeaders(token),
        }),
        fetch(`${apiBaseUrl}/api/workspaces/${encodeURIComponent(resolvedId)}/notifications`, {
          headers: getAuthHeaders(token),
        }),
      ]);
      if (!aRes.ok || !nRes.ok) throw new Error("Failed to load workspace activity");
      const aData = (await aRes.json()) as { activity_log?: ActivityLog[] };
      const nData = (await nRes.json()) as { notifications?: Notification[] };
      setActivity(aData.activity_log ?? []);
      setNotifications(nData.notifications ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load activity");
      setActivity([]);
      setNotifications([]);
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
            <h1 className="text-2xl font-bold">Activity Feed</h1>
            <p className="text-muted-foreground">Notification agent + activity stream output.</p>
          </div>
          <Button onClick={() => void load()} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Activity ({activity.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {activity.length === 0 && <p className="text-sm text-muted-foreground">No events yet.</p>}
              {activity.map((a, idx) => (
                <div key={`${a.timestamp}-${idx}`} className="rounded border p-3">
                  <Badge variant="outline">{a.action_type}</Badge>
                  <p className="text-sm mt-1">{a.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Notifications ({notifications.filter((n) => !n.read).length} unread)</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {notifications.length === 0 && <p className="text-sm text-muted-foreground">No notifications yet.</p>}
              {notifications.map((n, idx) => (
                <div key={`${n.created_at || idx}`} className="rounded border p-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{n.type || "notification"}</Badge>
                    {!n.read && <Badge variant="secondary">unread</Badge>}
                  </div>
                  <p className="text-sm mt-1">{n.message || "-"}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ManagerActivity;
