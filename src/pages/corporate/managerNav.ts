import {
  LayoutDashboard,
  Calendar,
  ListTodo,
  LayoutGrid,
  Users,
  BarChart3,
  Settings,
  Plug,
  Activity,
  ShieldAlert,
  Bell,
  Bot,
  ClipboardList,
  FileText,
  Route,
} from "lucide-react";
import { SidebarItem } from "@/components/layout/Sidebar";

export const managerNavItems = (workspaceId: string): SidebarItem[] => {
  const basePath = `/business/manager/workspaces/${workspaceId}`;
  return [
    { title: "Dashboard", href: `${basePath}/dashboard`, icon: LayoutDashboard },
    { title: "Meetings", href: `${basePath}/meetings`, icon: Calendar },
    { title: "Tasks", href: `${basePath}/tasks`, icon: ListTodo },
    { title: "Kanban Board", href: `${basePath}/kanban`, icon: LayoutGrid },
    { title: "Team", href: `${basePath}/team`, icon: Users },
    { title: "Analytics", href: `${basePath}/analytics`, icon: BarChart3 },
    { title: "Integrations", href: `${basePath}/integrations`, icon: Plug },
    { title: "Requirements", href: `${basePath}/requirements`, icon: ClipboardList },
    { title: "PRD", href: `${basePath}/prd`, icon: FileText },
    { title: "Roadmap", href: `${basePath}/roadmap`, icon: Route },
    { title: "Monitoring", href: `${basePath}/monitoring`, icon: Activity },
    { title: "Risks", href: `${basePath}/risks`, icon: ShieldAlert },
    { title: "Activity", href: `${basePath}/activity`, icon: Bell },
    { title: "Agents", href: `${basePath}/agents`, icon: Bot },
    { title: "Settings", href: `${basePath}/settings`, icon: Settings },
  ];
};
