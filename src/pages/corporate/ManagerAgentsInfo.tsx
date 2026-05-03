import { Brain, Lightbulb, Eye, Zap, RefreshCw, Bell } from "lucide-react";
import { useParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { managerNavItems } from "@/pages/corporate/managerNav";

const agents = [
  { name: "Requirements Agent", icon: Brain, description: "Generates PRD and requirement artifacts." },
  { name: "Planning Agent", icon: Lightbulb, description: "Builds roadmap, tasks, and assignment plan." },
  { name: "Monitoring Agent", icon: Eye, description: "Monitors GitHub signals and project progress." },
  { name: "Risk Agent", icon: Zap, description: "Detects blockers and delivery risks." },
  { name: "Replanning Agent", icon: RefreshCw, description: "Replans when risk thresholds are triggered." },
  { name: "Notification Agent", icon: Bell, description: "Publishes in-app status notifications." },
];

const ManagerAgentsInfo = () => {
  const { workspaceId = "" } = useParams();
  return (
    <DashboardLayout sidebarItems={managerNavItems(workspaceId)} sidebarTitle="Manager" sidebarSubtitle="Business Dashboard">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Agents Info</h1>
          <p className="text-muted-foreground">All PMZero agents available in meeting-monitor-main.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {agents.map((agent) => (
            <Card key={agent.name}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <agent.icon className="h-4 w-4" />
                  {agent.name}
                </CardTitle>
                <Badge variant="secondary">active</Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{agent.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ManagerAgentsInfo;
