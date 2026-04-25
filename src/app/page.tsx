"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Cpu,
  LayoutDashboard,
  GitBranch,
  Users,
  CheckSquare,
  Monitor,
  Settings,
  LogOut,
  Menu,
  X,
  Plus,
  Bell,
  Search,
  ArrowRight,
  Phone,
  Mail,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Star,
  FileText,
  Rocket,
  Wrench,
  Loader2,
  Eye,
  Info,
  HelpCircle,
  Database,
  UserPlus,
  Calendar,
  Target,
  Copy,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAppStore, type Lead, type Task, type Activity, type User } from "@/store/app-store";
import { formatDistanceToNow, format, parseISO, isPast } from "date-fns";

// ─── Constants ────────────────────────────────────────────────────────
const PIPELINE_STAGES = [
  "New Lead",
  "Mockup Needed",
  "Mockup Sent",
  "Engaged",
  "Video Sent",
  "Proof Stage",
  "Hot Lead",
  "Call Scheduled",
  "Closed Won",
  "Closed Lost",
  "Retention",
];

const STAGE_COLORS: Record<string, string> = {
  "New Lead": "bg-slate-100 text-slate-700 border-slate-200",
  "Mockup Needed": "bg-amber-50 text-amber-700 border-amber-200",
  "Mockup Sent": "bg-blue-50 text-blue-700 border-blue-200",
  "Engaged": "bg-purple-50 text-purple-700 border-purple-200",
  "Video Sent": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Proof Stage": "bg-cyan-50 text-cyan-700 border-cyan-200",
  "Hot Lead": "bg-rose-50 text-rose-700 border-rose-200",
  "Call Scheduled": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Closed Won": "bg-green-50 text-green-700 border-green-200",
  "Closed Lost": "bg-red-50 text-red-700 border-red-200",
  "Retention": "bg-teal-50 text-teal-700 border-teal-200",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 border border-red-200",
  high: "bg-orange-100 text-orange-700 border border-orange-200",
  medium: "bg-amber-100 text-amber-700 border border-amber-200",
  low: "bg-gray-100 text-gray-600 border border-gray-200",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-slate-100 text-slate-600 border border-slate-200",
  in_progress: "bg-blue-100 text-blue-700 border border-blue-200",
  completed: "bg-green-100 text-green-700 border border-green-200",
  overdue: "bg-red-100 text-red-700 border border-red-200",
};

const NAV_ITEMS = [
  { view: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { view: "pipeline", label: "Pipeline", icon: GitBranch },
  { view: "leads", label: "Leads", icon: Users },
  { view: "tasks", label: "Tasks", icon: CheckSquare },
  { view: "portal", label: "Command Center", icon: Monitor },
  { view: "settings", label: "Settings", icon: Settings },
];

const PHASES = [
  {
    id: "handover",
    name: "Phase 1: The Handover",
    description: "Getting everything we need to start",
    steps: [
      "Client onboarding questionnaire received",
      "Brand assets & content delivered",
      "Account access credentials received",
    ],
  },
  {
    id: "game_plan",
    name: "Phase 2: The Game Plan",
    description: "Strategy & creative direction",
    steps: [
      "Brand strategy document approved",
      "Creative brief finalized",
      "Project timeline & milestones set",
    ],
  },
  {
    id: "foundation",
    name: "Phase 3: Technical Foundation",
    description: "Building the core infrastructure",
    steps: [
      "Website wireframe approved",
      "Website design mockup approved",
      "Social media templates created",
      "Ad creative concepts approved",
    ],
  },
  {
    id: "live",
    name: "Phase 4: Live & Running",
    description: "Launch & ongoing optimization",
    steps: [
      "Website development complete & live",
      "Social accounts configured & posting",
      "Ad campaigns launched & tracking",
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────
function timeAgo(dateStr: string) {
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

function formatDate(dateStr: string) {
  try {
    return format(parseISO(dateStr), "MMM d, yyyy");
  } catch {
    return dateStr;
  }
}

function getActivityIcon(type: string) {
  switch (type) {
    case "lead_created": return <UserPlus className="w-4 h-4 text-emerald-600" />;
    case "stage_changed": return <ArrowRight className="w-4 h-4 text-blue-600" />;
    case "task_created": return <Plus className="w-4 h-4 text-purple-600" />;
    case "task_completed": return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    case "hot_lead": return <Star className="w-4 h-4 text-rose-500" />;
    case "call_scheduled": return <Phone className="w-4 h-4 text-emerald-600" />;
    case "mockup_sent": return <FileText className="w-4 h-4 text-cyan-600" />;
    case "note_added": return <FileText className="w-4 h-4 text-amber-600" />;
    default: return <Circle className="w-4 h-4 text-gray-400" />;
  }
}

// ─── Toast Component ─────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: "success" | "error" | "info"; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === "success" ? "bg-emerald-600" : type === "error" ? "bg-red-600" : "bg-blue-600";

  return (
    <div className={`fixed bottom-4 right-4 z-[100] ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-[slideUp_0.3s_ease] max-w-sm`}>
      {type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : type === "error" ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <Info className="w-4 h-4 shrink-0" />}
      <span className="text-sm">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  );
}

// ─── Login View ───────────────────────────────────────────────────────
function LoginView() {
  const { setCurrentUser, setActiveView } = useAppStore();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) {
      setError("Email and name are required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json();
      if (data.user) {
        setCurrentUser(data.user);
        setActiveView("dashboard");
      } else if (data.error) {
        setError(data.error);
      }
    } catch {
      setError("Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-emerald-900 p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      </div>
      <Card className="w-full max-w-md relative z-10 shadow-2xl border-gray-700/50 bg-gray-900/80 backdrop-blur-xl">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
              <Cpu className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">NXL BYLDR</h1>
            <p className="text-gray-400 text-sm">Command Center</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white h-11 text-sm font-medium"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Cpu className="w-4 h-4 mr-2" />}
              Enter Command Center
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────
function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { activeView, setActiveView, currentUser, setCurrentUser, sidebarOpen } = useAppStore();

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveView("login");
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && !collapsed && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onToggle} />
      )}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
          collapsed ? "w-0 lg:w-16 overflow-hidden lg:overflow-visible" : "w-64"
        } ${sidebarOpen || collapsed ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            {!collapsed && <span className="font-bold text-lg tracking-tight">NXL BYLDR</span>}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 overflow-y-auto">
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = activeView === item.view;
              return (
                <button
                  key={item.view}
                  onClick={() => {
                    setActiveView(item.view);
                    if (window.innerWidth < 1024) onToggle();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className={`w-5 h-5 shrink-0 ${isActive ? "text-emerald-600" : ""}`} />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </div>
        </nav>

        {/* User section */}
        {currentUser && (
          <div className="border-t border-gray-100 p-3 shrink-0">
            {!collapsed ? (
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{currentUser.name}</p>
                  <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
                </div>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold mx-auto mb-2">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
            )}
            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all ${
                collapsed ? "justify-center" : ""
              }`}
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              {!collapsed && <span>Logout</span>}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

// ─── Header ───────────────────────────────────────────────────────────
function Header({ onMenuToggle }: { onMenuToggle: () => void }) {
  const { activeView, setIntakeModalOpen } = useAppStore();

  const titles: Record<string, string> = {
    dashboard: "Dashboard",
    pipeline: "Pipeline",
    leads: "Leads",
    tasks: "Tasks",
    portal: "Command Center",
    settings: "Settings",
  };

  const showNewLead = ["dashboard", "pipeline", "leads"].includes(activeView);

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">{titles[activeView] || "Dashboard"}</h1>
      </div>
      <div className="flex items-center gap-2">
        {showNewLead && (
          <Button
            onClick={() => setIntakeModalOpen(true)}
            size="sm"
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Lead</span>
          </Button>
        )}
        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Bell className="w-5 h-5 text-gray-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-pink-500 rounded-full" />
        </button>
      </div>
    </header>
  );
}

// ─── Dashboard View ───────────────────────────────────────────────────
function DashboardView({ toast }: { toast: (msg: string, type?: "success" | "error" | "info") => void }) {
  const { dashboardStats, setDashboardStats, setActiveView, setIntakeModalOpen } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dashboard");
        const data = await res.json();
        if (!cancelled && data.leads) setDashboardStats(data);
      } catch {
        if (!cancelled) toast("Failed to load dashboard", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [setDashboardStats, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!dashboardStats) return null;

  const stats = dashboardStats;
  const activePipeline = PIPELINE_STAGES
    .filter((s) => !["Closed Won", "Closed Lost"].includes(s))
    .reduce((acc, s) => acc + (stats.leads.byStage[s] || 0), 0);
  const tasksDue = (stats.tasks.byStatus.pending || 0) + (stats.tasks.byStatus.in_progress || 0);

  return (
    <div className="space-y-6">
      {/* Action Alert */}
      {stats.projects.actionRequired > 0 && (
        <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-pink-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-pink-800">
              {stats.projects.actionRequired} project{stats.projects.actionRequired > 1 ? "s" : ""} require attention
            </p>
            <button
              onClick={() => setActiveView("portal")}
              className="text-xs text-pink-600 hover:underline mt-0.5"
            >
              View Command Center →
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Total Leads</span>
              <Users className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl font-bold">{stats.leads.total}</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Active Pipeline</span>
              <GitBranch className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl font-bold">{activePipeline}</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Tasks Due</span>
              <CheckSquare className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl font-bold">{tasksDue}</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Hot Leads</span>
              <Star className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-rose-600">{stats.hotLeads.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {PIPELINE_STAGES.map((stage) => {
              const count = stats.leads.byStage[stage] || 0;
              if (count === 0 && ["Closed Lost"].includes(stage)) return null;
              return (
                <div key={stage} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-28 shrink-0 truncate">{stage}</span>
                  <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        ["Closed Won"].includes(stage)
                          ? "bg-emerald-500"
                          : ["Closed Lost"].includes(stage)
                          ? "bg-red-400"
                          : ["Hot Lead"].includes(stage)
                          ? "bg-rose-500"
                          : "bg-emerald-400"
                      }`}
                      style={{ width: `${stats.leads.total ? Math.max((count / stats.leads.total) * 100, 2) : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity + Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {stats.recentActivities.slice(0, 10).map((activity: Activity) => (
                <div key={activity.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="mt-0.5 shrink-0">{getActivityIcon(activity.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">{activity.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{timeAgo(activity.createdAt)}</p>
                  </div>
                </div>
              ))}
              {stats.recentActivities.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                onClick={() => setIntakeModalOpen(true)}
                variant="outline"
                className="w-full justify-start gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Add Lead
              </Button>
              <Button
                onClick={() => setActiveView("pipeline")}
                variant="outline"
                className="w-full justify-start gap-2"
              >
                <GitBranch className="w-4 h-4" />
                View Pipeline
              </Button>
              <Button
                onClick={() => setActiveView("tasks")}
                variant="outline"
                className="w-full justify-start gap-2"
              >
                <CheckSquare className="w-4 h-4" />
                View Tasks
              </Button>
            </CardContent>
          </Card>

          {/* Stuck Leads */}
          {stats.stuckOpportunities.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader>
                <CardTitle className="text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Stuck Leads
                </CardTitle>
                <CardDescription>Leads idle for 3+ days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.stuckOpportunities.slice(0, 5).map((lead: Lead) => (
                    <div key={lead.id} className="text-sm">
                      <span className="font-medium">{lead.name}</span>
                      <span className="text-gray-500 ml-1">({lead.pipelineStage})</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Pipeline View ────────────────────────────────────────────────────
function PipelineView({ toast }: { toast: (msg: string, type?: "success" | "error" | "info") => void }) {
  const { leads, setLeads, selectedLead, setSelectedLead } = useAppStore();
  const [loading, setLoading] = useState(true);

  const doRefresh = async () => {
    try {
      const res = await fetch("/api/leads?limit=100");
      const data = await res.json();
      if (data.leads) setLeads(data.leads);
    } catch {
      toast("Failed to load pipeline", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/leads?limit=100");
        const data = await res.json();
        if (!cancelled && data.leads) setLeads(data.leads);
      } catch {
        if (!cancelled) toast("Failed to load pipeline", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [setLeads, toast]);

  const moveLead = async (lead: Lead, nextStage: string) => {
    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, pipelineStage: nextStage }),
      });
      if (res.ok) {
        toast(`Moved "${lead.name}" to ${nextStage}`);
        doRefresh();
        if (selectedLead?.id === lead.id) {
          setSelectedLead(null);
        }
      }
    } catch {
      toast("Failed to move lead", "error");
    }
  };

  const leadsByStage = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    PIPELINE_STAGES.forEach((s) => (map[s] = []));
    leads.forEach((l) => {
      if (map[l.pipelineStage]) map[l.pipelineStage].push(l);
    });
    return map;
  }, [leads]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 min-w-max h-full pb-4">
          {PIPELINE_STAGES.map((stage) => {
            const stageLeads = leadsByStage[stage] || [];
            const currentIndex = PIPELINE_STAGES.indexOf(stage);
            const nextStage = currentIndex < PIPELINE_STAGES.length - 1 ? PIPELINE_STAGES[currentIndex + 1] : null;
            return (
              <div key={stage} className="w-64 flex flex-col shrink-0">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${STAGE_COLORS[stage]?.split(" ")[0] || "bg-gray-300"}`} />
                    <span className="text-sm font-semibold text-gray-700">{stage}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">{stageLeads.length}</Badge>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className={`bg-white border rounded-lg p-3 cursor-pointer hover:shadow-md transition-all duration-200 ${
                        selectedLead?.id === lead.id ? "ring-2 ring-emerald-500 shadow-md" : "border-gray-200"
                      }`}
                    >
                      <p className="text-sm font-semibold text-gray-900 mb-0.5">{lead.name}</p>
                      {lead.businessName && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mb-1.5">
                          <Building2 className="w-3 h-3" />
                          {lead.businessName}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mb-2">{timeAgo(lead.updatedAt)}</p>
                      {lead.tags && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {lead.tags.split(",").filter(Boolean).slice(0, 3).map((tag) => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                              {tag.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                      {nextStage && !["Closed Won", "Closed Lost", "Retention"].includes(stage) && (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveLead(lead, nextStage);
                          }}
                          className="w-full mt-1 text-xs"
                        >
                          Move to {nextStage}
                        </Button>
                      )}
                    </div>
                  ))}
                  {stageLeads.length === 0 && (
                    <div className="text-xs text-gray-400 text-center py-6">No leads</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lead Detail Panel */}
      {selectedLead && (
        <LeadDetailPanel lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}
    </div>
  );
}

// ─── Lead Detail Panel ────────────────────────────────────────────────
function LeadDetailPanel({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const [leadDetail, setLeadDetail] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/leads/${lead.id}`);
        const data = await res.json();
        if (!cancelled) {
          if (data.lead) setLeadDetail(data.lead);
          else setLeadDetail(lead);
        }
      } catch {
        if (!cancelled) setLeadDetail(lead);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [lead.id, lead]);

  if (loading) {
    return (
      <div className="w-80 border-l bg-white p-4 flex items-center justify-center shrink-0">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  const d = leadDetail || lead;

  return (
    <div className="w-80 border-l bg-white overflow-y-auto shrink-0 hidden md:block">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Lead Details</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-base font-bold">{d.name}</p>
            {d.businessName && <p className="text-sm text-gray-500">{d.businessName}</p>}
          </div>

          <div className="space-y-2">
            <p className="text-xs text-gray-500">Contact</p>
            <div className="space-y-1.5">
              <p className="text-sm flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-gray-400" />{d.email}</p>
              <p className="text-sm flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-gray-400" />{d.phone}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs text-gray-500">Stage</p>
            <Badge className={`${STAGE_COLORS[d.pipelineStage] || ""} border`}>{d.pipelineStage}</Badge>
          </div>

          {d.serviceType && (
            <div className="space-y-1.5">
              <p className="text-xs text-gray-500">Service</p>
              <p className="text-sm">{d.serviceType}</p>
            </div>
          )}

          {d.source && (
            <div className="space-y-1.5">
              <p className="text-xs text-gray-500">Source</p>
              <p className="text-sm capitalize">{d.source.replace("_", " ")}</p>
            </div>
          )}

          {d.tags && (
            <div className="space-y-1.5">
              <p className="text-xs text-gray-500">Tags</p>
              <div className="flex flex-wrap gap-1">
                {d.tags.split(",").filter(Boolean).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[10px]">{tag.trim()}</Badge>
                ))}
              </div>
            </div>
          )}

          {d.notes && (
            <div className="space-y-1.5">
              <p className="text-xs text-gray-500">Notes</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-2.5">{d.notes}</p>
            </div>
          )}

          {d.tasks && d.tasks.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-gray-500">Tasks ({d.tasks.length})</p>
              <div className="space-y-1">
                {d.tasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${task.status === "completed" ? "bg-green-500" : task.status === "in_progress" ? "bg-blue-500" : "bg-gray-300"}`} />
                    <span className="truncate">{task.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-gray-400 space-y-0.5 pt-2 border-t">
            <p>Created: {formatDate(d.createdAt)}</p>
            <p>Last Activity: {timeAgo(d.lastActivityAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Leads View ───────────────────────────────────────────────────────
function LeadsView({ toast }: { toast: (msg: string, type?: "success" | "error" | "info") => void }) {
  const { leads, setLeads, setSelectedLead, setActiveView } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [sortField, setSortField] = useState("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const doSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (stageFilter) params.set("stage", stageFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (sourceFilter) params.set("source", sourceFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/leads?${params}`);
      const data = await res.json();
      if (data.leads) setLeads(data.leads);
    } catch {
      toast("Failed to load leads", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/leads?limit=100");
        const data = await res.json();
        if (!cancelled && data.leads) setLeads(data.leads);
      } catch {
        if (!cancelled) toast("Failed to load leads", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [setLeads, toast]);

  const filteredLeads = useMemo(() => {
    const sorted = [...leads].sort((a, b) => {
      const aVal = a[sortField as keyof Lead] || "";
      const bVal = b[sortField as keyof Lead] || "";
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [leads, sortField, sortDir]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  if (loading && leads.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search leads..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doSearch()}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="">All Stages</option>
              {PIPELINE_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="">All Sources</option>
              <option value="manual">Manual</option>
              <option value="referral">Referral</option>
              <option value="ghl_webhook">GHL Webhook</option>
            </select>
            <Button onClick={() => { setSearch(""); setStageFilter(""); setStatusFilter(""); setSourceFilter(""); }} variant="outline" size="sm">
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  {[
                    { key: "name", label: "Name" },
                    { key: "businessName", label: "Business" },
                    { key: "email", label: "Email" },
                    { key: "phone", label: "Phone" },
                    { key: "pipelineStage", label: "Stage" },
                    { key: "updatedAt", label: "Last Activity" },
                  ].map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className="text-left text-xs font-medium text-gray-500 px-4 py-3 cursor-pointer hover:text-gray-700 whitespace-nowrap"
                    >
                      {col.label}
                      {sortField === col.key && (
                        <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>
                      )}
                    </th>
                  ))}
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{lead.name}</p>
                        {lead.tags && (
                          <div className="flex gap-1 mt-0.5">
                            {lead.tags.split(",").filter(Boolean).slice(0, 2).map((t) => (
                              <span key={t} className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">{t.trim()}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{lead.businessName || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{lead.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{lead.phone}</td>
                    <td className="px-4 py-3">
                      <Badge className={`${STAGE_COLORS[lead.pipelineStage] || ""} border text-[10px]`}>{lead.pipelineStage}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{timeAgo(lead.updatedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => {
                          setSelectedLead(lead);
                          setActiveView("pipeline");
                        }}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-sm text-gray-400">
                      No leads found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <p className="text-xs text-gray-400 text-right">{filteredLeads.length} lead{filteredLeads.length !== 1 ? "s" : ""}</p>
    </div>
  );
}

// ─── Lead Intake Modal ────────────────────────────────────────────────
function LeadIntakeModal({ toast }: { toast: (msg: string, type?: "success" | "error" | "info") => void }) {
  const { intakeModalOpen, setIntakeModalOpen, setLeads } = useAppStore();
  const [form, setForm] = useState({ name: "", businessName: "", phone: "", email: "", serviceType: "", assignedTo: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (intakeModalOpen) {
      const loadUsers = async () => {
        try {
          const res = await fetch("/api/auth");
          const data = await res.json();
          if (data.users) setUsers(data.users);
        } catch { /* ignore */ }
      };
      loadUsers();
    }
  }, [intakeModalOpen]);

  if (!intakeModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.email) {
      setError("Name, phone, and email are required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.lead) {
        toast(`Lead "${form.name}" created successfully!`);
        setForm({ name: "", businessName: "", phone: "", email: "", serviceType: "", assignedTo: "" });
        setIntakeModalOpen(false);
        // Refresh leads
        const leadsRes = await fetch("/api/leads?limit=100");
        const leadsData = await leadsRes.json();
        if (leadsData.leads) setLeads(leadsData.leads);
      } else if (data.error) {
        setError(data.error);
      }
    } catch {
      setError("Failed to create lead");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setError("");
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Add New Lead</CardTitle>
            <button onClick={() => setIntakeModalOpen(false)} className="p-1 rounded hover:bg-gray-100">
              <X className="w-5 h-5" />
            </button>
          </div>
          <CardDescription>Enter lead information below</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input type="text" value={form.name} onChange={(e) => updateField("name", e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="Full name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
              <input type="text" value={form.businessName} onChange={(e) => updateField("businessName", e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="Business name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input type="tel" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="+1 (555) 000-0000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="email@example.com" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
              <select value={form.serviceType} onChange={(e) => updateField("serviceType", e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                <option value="">Select service...</option>
                <option value="Branding">Branding</option>
                <option value="Website Design">Website Design</option>
                <option value="Social Media Management">Social Media Management</option>
                <option value="Branding + Social Media">Branding + Social Media</option>
                <option value="Branding + Website">Branding + Website</option>
                <option value="Full Package">Full Package</option>
                <option value="Social Media + PPC">Social Media + PPC</option>
                <option value="Website Redesign">Website Redesign</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
              <select value={form.assignedTo} onChange={(e) => updateField("assignedTo", e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIntakeModalOpen(false)} className="flex-1">Cancel</Button>
              <Button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Create Lead
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tasks View ───────────────────────────────────────────────────────
function TasksView({ toast }: { toast: (msg: string, type?: "success" | "error" | "info") => void }) {
  const { tasks, setTasks } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [assignedFilter, setAssignedFilter] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "medium", leadId: "", dueDate: "" });
  const [leads, setLeadsLocal] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const doRefreshTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (statusFilter) params.set("status", statusFilter);
      if (priorityFilter) params.set("priority", priorityFilter);
      if (assignedFilter) params.set("assignedTo", assignedFilter);
      const res = await fetch(`/api/tasks?${params}`);
      const data = await res.json();
      if (data.tasks) setTasks(data.tasks);
    } catch {
      toast("Failed to load tasks", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: "100" });
        if (statusFilter) params.set("status", statusFilter);
        if (priorityFilter) params.set("priority", priorityFilter);
        if (assignedFilter) params.set("assignedTo", assignedFilter);
        const res = await fetch(`/api/tasks?${params}`);
        const data = await res.json();
        if (!cancelled && data.tasks) setTasks(data.tasks);
      } catch {
        if (!cancelled) toast("Failed to load tasks", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [setTasks, toast, statusFilter, priorityFilter, assignedFilter]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [leadsRes, usersRes] = await Promise.all([fetch("/api/leads?limit=100"), fetch("/api/auth")]);
      const leadsData = await leadsRes.json();
      const usersData = await usersRes.json();
      if (!cancelled) {
        if (leadsData.leads) setLeadsLocal(leadsData.leads);
        if (usersData.users) setUsers(usersData.users);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const toggleComplete = async (task: Task) => {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      toast(newStatus === "completed" ? "Task completed!" : "Task reopened");
      doRefreshTasks();
    } catch {
      toast("Failed to update task", "error");
    }
  };

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title) return;
    setSubmitting(true);
    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask),
      });
      toast("Task created!");
      setNewTask({ title: "", description: "", priority: "medium", leadId: "", dueDate: "" });
      setShowAddForm(false);
      doRefreshTasks();
    } catch {
      toast("Failed to create task", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </select>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select value={assignedFilter} onChange={(e) => setAssignedFilter(e.target.value)} className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
              <option value="">All Assigned</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <div className="flex-1" />
            <Button size="sm" onClick={() => setShowAddForm(!showAddForm)} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
              <Plus className="w-4 h-4 mr-1" />
              Add Task
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add Task Form */}
      {showAddForm && (
        <Card className="border-emerald-200">
          <CardContent className="p-4">
            <form onSubmit={createTask} className="space-y-3">
              <input type="text" value={newTask.title} onChange={(e) => setNewTask((t) => ({ ...t, title: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="Task title *" required />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select value={newTask.priority} onChange={(e) => setNewTask((t) => ({ ...t, priority: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent</option>
                </select>
                <select value={newTask.leadId} onChange={(e) => setNewTask((t) => ({ ...t, leadId: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                  <option value="">No Lead</option>
                  {leads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <input type="date" value={newTask.dueDate} onChange={(e) => setNewTask((t) => ({ ...t, dueDate: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddForm(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                  Create Task
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tasks Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map((task) => (
          <Card key={task.id} className={`hover:shadow-lg transition-all duration-200 ${task.status === "completed" ? "opacity-60" : ""}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleComplete(task)}
                  className={`mt-0.5 shrink-0 transition-all ${
                    task.status === "completed"
                      ? "text-emerald-500"
                      : "text-gray-300 hover:text-emerald-400"
                  }`}
                >
                  {task.status === "completed" ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${task.status === "completed" ? "line-through text-gray-400" : "text-gray-900"}`}>
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${PRIORITY_COLORS[task.priority] || ""}`}>
                      {task.priority}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLORS[task.status] || ""}`}>
                      {task.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    {task.lead && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{task.lead.name}</span>}
                    {task.dueDate && (
                      <span className={`flex items-center gap-1 ${task.status !== "completed" && isPast(parseISO(task.dueDate)) ? "text-red-500" : ""}`}>
                        <Calendar className="w-3 h-3" />
                        {formatDate(task.dueDate)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {tasks.length === 0 && (
          <div className="col-span-full text-center py-12 text-sm text-gray-400">No tasks found</div>
        )}
      </div>
    </div>
  );
}

// ─── Client Portal / Command Center View ──────────────────────────────
function PortalView({ toast }: { toast: (msg: string, type?: "success" | "error" | "info") => void }) {
  const { projects, setProjects, instructionsOpen, setInstructionsOpen, selectedProject, setSelectedProject } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/projects?limit=50");
        const data = await res.json();
        if (data.projects) {
          setProjects(data.projects);
          if (data.projects.length > 0 && !selectedProject) {
            setSelectedProject(data.projects[0]);
          }
        }
      } catch {
        toast("Failed to load projects", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [setProjects, setSelectedProject, selectedProject, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-16">
        <Monitor className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No active projects</p>
      </div>
    );
  }

  const project = selectedProject || projects[0];
  const currentStep = project.currentStep;

  const getStepGlobalIndex = (phaseIndex: number, stepIndex: number) => {
    let idx = 0;
    for (let i = 0; i < phaseIndex; i++) {
      idx += PHASES[i].steps.length;
    }
    return idx + stepIndex + 1;
  };

  const allSteps: { label: string; globalIndex: number; phaseId: string }[] = [];
  PHASES.forEach((phase, pi) => {
    phase.steps.forEach((step, si) => {
      allSteps.push({ label: step, globalIndex: getStepGlobalIndex(pi, si), phaseId: phase.id });
    });
  });

  return (
    <div className="space-y-6">
      {/* Project Selector */}
      {projects.length > 1 && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Project:</span>
          <select
            value={project.id}
            onChange={(e) => {
              const p = projects.find((p) => p.id === e.target.value);
              if (p) setSelectedProject(p);
            }}
            className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.clientName} {p.businessName ? `— ${p.businessName}` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Action Bar */}
      <div
        className={`rounded-lg p-4 flex items-center gap-3 ${
          project.actionRequired
            ? "bg-pink-600 text-white"
            : "bg-emerald-50 border border-emerald-200 text-emerald-800"
        }`}
      >
        {project.actionRequired ? (
          <>
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">ACTION REQUIRED</p>
              <p className="text-sm opacity-90">{project.actionMessage || "Please complete the required task immediately."}</p>
            </div>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">All Systems Go — Project on Schedule</p>
            </div>
          </>
        )}
      </div>

      {/* Instructions Button */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setInstructionsOpen(true)}>
          <HelpCircle className="w-4 h-4 mr-1" />
          How to use this Command Center
        </Button>
      </div>

      {/* Setup Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Progress</CardTitle>
          <CardDescription>Step {currentStep} of {allSteps.length} complete</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Progress bar */}
          <div className="w-full h-2 bg-gray-100 rounded-full mb-6 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-pink-500 to-rose-500 transition-all duration-500"
              style={{ width: `${(currentStep / allSteps.length) * 100}%` }}
            />
          </div>

          {/* Steps list */}
          <div className="space-y-1">
            {allSteps.map((step) => {
              const isCompleted = step.globalIndex < currentStep;
              const isCurrent = step.globalIndex === currentStep;
              return (
                <div
                  key={step.globalIndex}
                  className={`flex items-center gap-3 py-2.5 px-3 rounded-lg transition-all ${
                    isCurrent ? "bg-pink-50" : ""
                  }`}
                >
                  <div className="shrink-0">
                    {isCompleted ? (
                      <div className="w-6 h-6 rounded-full bg-pink-600 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                    ) : isCurrent ? (
                      <div className="w-6 h-6 rounded-full bg-pink-400 animate-pulse flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-300" />
                    )}
                  </div>
                  <span className={`text-sm ${
                    isCompleted ? "text-gray-500 line-through" : isCurrent ? "text-pink-700 font-medium" : "text-gray-400"
                  }`}>
                    {step.label}
                  </span>
                  {isCurrent && (
                    <Badge className="bg-pink-100 text-pink-700 border-pink-200 border ml-auto text-[10px]">Current</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Phase Cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        {PHASES.map((phase) => {
          const phaseStartIdx = getStepGlobalIndex(PHASES.indexOf(phase), 0);
          const phaseEndIdx = phaseStartIdx + phase.steps.length - 1;
          const isPhaseComplete = currentStep > phaseEndIdx;
          const isPhaseActive = currentStep >= phaseStartIdx && currentStep <= phaseEndIdx;

          const PhaseIcon = phase.id === "handover" ? FileText : phase.id === "game_plan" ? Target : phase.id === "foundation" ? Wrench : Rocket;

          return (
            <Card
              key={phase.id}
              className={`transition-all duration-200 ${
                isPhaseActive ? "ring-2 ring-pink-300 shadow-lg" : isPhaseComplete ? "opacity-70" : ""
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isPhaseComplete ? "bg-pink-100" : isPhaseActive ? "bg-pink-50" : "bg-gray-100"
                  }`}>
                    <PhaseIcon className={`w-5 h-5 ${isPhaseComplete || isPhaseActive ? "text-pink-600" : "text-gray-400"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{phase.name}</p>
                    <p className="text-xs text-gray-500">{phase.description}</p>
                  </div>
                  {isPhaseComplete && (
                    <CheckCircle2 className="w-5 h-5 text-pink-600 ml-auto shrink-0" />
                  )}
                </div>
                <div className="space-y-1.5">
                  {phase.steps.map((step, si) => {
                    const globalIdx = getStepGlobalIndex(PHASES.indexOf(phase), si);
                    const stepDone = globalIdx < currentStep;
                    return (
                      <div key={si} className="flex items-center gap-2 text-sm">
                        <div className={`w-2 h-2 rounded-full ${stepDone ? "bg-pink-600" : "bg-gray-300"}`} />
                        <span className={stepDone ? "text-gray-500" : "text-gray-400"}>{step}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Instructions Modal */}
      {instructionsOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>How to Use This Command Center</CardTitle>
                <button onClick={() => setInstructionsOpen(false)} className="p-1 rounded hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Check once per day</p>
                    <p className="text-xs text-gray-500">Visit this dashboard daily to stay on track.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">All Systems Go = No action needed</p>
                    <p className="text-xs text-gray-500">Green status means everything is on schedule.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4 text-pink-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">ACTION REQUIRED = Complete task immediately</p>
                    <p className="text-xs text-gray-500">Pink alert means we need something from you right away.</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium mb-2">Status Light Legend</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-5 h-5 rounded-full bg-pink-600" />
                    <span>Completed</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-5 h-5 rounded-full bg-pink-400 animate-pulse" />
                    <span>Current Step</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-5 h-5 rounded-full bg-gray-300" />
                    <span>Pending</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Settings View ────────────────────────────────────────────────────
function SettingsView({ toast }: { toast: (msg: string, type?: "success" | "error" | "info") => void }) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [settingsRes, usersRes] = await Promise.all([fetch("/api/settings"), fetch("/api/auth")]);
        const settingsData = await settingsRes.json();
        const usersData = await usersRes.json();
        if (settingsData.settings) setSettings(settingsData.settings);
        if (usersData.users) setUsers(usersData.users);
      } catch {
        toast("Failed to load settings", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [toast]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (data.seeded) {
        toast(`Database seeded! ${data.summary.leads} leads, ${data.summary.tasks} tasks, ${data.summary.projects} projects`);
        // Reload
        const [settingsRes, usersRes] = await Promise.all([fetch("/api/settings"), fetch("/api/auth")]);
        const settingsData = await settingsRes.json();
        const usersData = await usersRes.json();
        if (settingsData.settings) setSettings(settingsData.settings);
        if (usersData.users) setUsers(usersData.users);
      } else {
        toast(data.message || "Seed failed", "info");
      }
    } catch {
      toast("Failed to seed database", "error");
    } finally {
      setSeeding(false);
    }
  };

  const copyWebhook = () => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/api/webhook`;
    navigator.clipboard.writeText(url).then(() => {
      toast("Webhook URL copied to clipboard!");
    }).catch(() => {
      setWebhookUrl(url);
      toast("Webhook URL: " + url, "info");
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Users */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Users</CardTitle>
          <CardDescription>Registered system users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
                <Badge className={user.role === "admin" ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-600 border border-gray-200"}>
                  {user.role}
                </Badge>
              </div>
            ))}
            {users.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No users found</p>}
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Config */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Stages</CardTitle>
          <CardDescription>Defined pipeline stages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {PIPELINE_STAGES.map((stage, i) => (
              <Badge key={stage} className={`${STAGE_COLORS[stage] || ""} border`}>
                {i + 1}. {stage}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Automation Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Automation & System Settings</CardTitle>
          <CardDescription>Key configuration values</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(settings)
              .filter(([key]) => !["pipeline_stages", "webhook_secret"].includes(key))
              .map(([key, value]) => (
                <div key={key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-600 capitalize">{key.replace(/_/g, " ")}</span>
                  <span className="text-sm font-medium text-gray-900">{value}</span>
                </div>
              ))}
            {Object.keys(settings).length === 0 && <p className="text-sm text-gray-400 text-center py-4">No settings configured</p>}
          </div>
        </CardContent>
      </Card>

      {/* Webhook URL */}
      <Card>
        <CardHeader>
          <CardTitle>GHL Webhook Integration</CardTitle>
          <CardDescription>Use this URL in your GoHighLevel workflow</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 overflow-x-auto">
              {typeof window !== "undefined" ? `${window.location.origin}/api/webhook` : "/api/webhook"}
            </code>
            <Button variant="outline" size="sm" onClick={copyWebhook}>
              <Copy className="w-4 h-4 mr-1" />
              Copy
            </Button>
          </div>
          {webhookUrl && <p className="text-xs text-gray-500 mt-2 break-all">{webhookUrl}</p>}
        </CardContent>
      </Card>

      {/* Seed Data */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Seed Sample Data</CardTitle>
          <CardDescription>Populate the database with demo data</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleSeed}
            disabled={seeding}
            variant="outline"
            className="bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
          >
            {seeding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Database className="w-4 h-4 mr-2" />}
            {seeding ? "Seeding..." : "Seed Database"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────
export default function Home() {
  const { activeView, currentUser, sidebarOpen, setSidebarOpen } = useAppStore();
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("success");

  const toast = useCallback((msg: string, type: "success" | "error" | "info" = "success") => {
    setToastMsg(msg);
    setToastType(type);
  }, []);

  // Login view
  if (!currentUser) {
    return (
      <>
        <LoginView />
        {toastMsg && <Toast message={toastMsg} type={toastType} onClose={() => setToastMsg("")} />}
      </>
    );
  }

  const handleMenuToggle = () => setSidebarOpen(!sidebarOpen);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;
  const sidebarCollapsed = !sidebarOpen || isMobile;

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar collapsed={sidebarCollapsed} onToggle={handleMenuToggle} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuToggle={handleMenuToggle} />

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {activeView === "dashboard" && <DashboardView toast={toast} />}
          {activeView === "pipeline" && <PipelineView toast={toast} />}
          {activeView === "leads" && <LeadsView toast={toast} />}
          {activeView === "tasks" && <TasksView toast={toast} />}
          {activeView === "portal" && <PortalView toast={toast} />}
          {activeView === "settings" && <SettingsView toast={toast} />}
        </main>

        {/* Footer */}
        <footer className="border-t bg-white px-4 lg:px-6 py-3 text-center text-xs text-gray-400 mt-auto shrink-0">
          &copy; {new Date().getFullYear()} NXL BYLDR Command Center. All rights reserved.
        </footer>
      </div>

      {/* Modals */}
      <LeadIntakeModal toast={toast} />

      {/* Toast */}
      {toastMsg && <Toast message={toastMsg} type={toastType} onClose={() => setToastMsg("")} />}
    </div>
  );
}
