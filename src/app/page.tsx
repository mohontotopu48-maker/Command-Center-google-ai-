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
  Search,
  ArrowRight,
  ArrowLeft,
  Phone,
  Mail,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Star,
  FileText,
  Rocket,
  Loader2,
  Info,
  HelpCircle,
  UserPlus,
  Calendar,
  Shield,
  Globe,
  Copy,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationPanel } from "@/components/notification-panel";
import { useAppStore, type Lead, type Task, type Activity, type User } from "@/store/app-store";
import PortalHealthOverview from "@/components/vbos/portal-health";
import AutomationRulesManager from "@/components/vbos/automation-manager";
import ActivityLogViewer from "@/components/vbos/activity-log";
import { formatDistanceToNow, format, parseISO, isPast } from "date-fns";

/* ─── Constants ──────────────────────────────────────────────────────────── */
const PIPELINE_STAGES = [
  "New Lead","Mockup Needed","Mockup Sent","Engaged","Video Sent",
  "Proof Stage","Hot Lead","Call Scheduled","Closed Won","Closed Lost","Retention",
];

const STAGE_COLORS: Record<string,string> = {
  "New Lead":       "bg-slate-100 text-slate-700 border-slate-200",
  "Mockup Needed":  "bg-amber-50 text-amber-700 border-amber-200",
  "Mockup Sent":    "bg-sky-50 text-sky-700 border-sky-200",
  "Engaged":        "bg-violet-50 text-violet-700 border-violet-200",
  "Video Sent":     "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
  "Proof Stage":    "bg-cyan-50 text-cyan-700 border-cyan-200",
  "Hot Lead":       "bg-rose-50 text-rose-700 border-rose-200",
  "Call Scheduled": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Closed Won":     "bg-green-50 text-green-700 border-green-200",
  "Closed Lost":    "bg-red-50 text-red-700 border-red-200",
  "Retention":      "bg-teal-50 text-teal-700 border-teal-200",
};

const PRIORITY_COLORS: Record<string,string> = {
  urgent: "bg-red-100 text-red-700 border border-red-200",
  high:   "bg-orange-100 text-orange-700 border border-orange-200",
  medium: "bg-amber-100 text-amber-700 border border-amber-200",
  low:    "bg-gray-100 text-gray-600 border border-gray-200",
};

const STATUS_COLORS: Record<string,string> = {
  pending:     "bg-slate-100 text-slate-600 border border-slate-200",
  in_progress: "bg-sky-100 text-sky-700 border border-sky-200",
  completed:   "bg-green-100 text-green-700 border border-green-200",
  overdue:     "bg-red-100 text-red-700 border border-red-200",
};

const ROLE_COLORS: Record<string,string> = {
  super_admin: "bg-red-100 text-red-700 border border-red-200",
  admin:       "bg-amber-100 text-amber-700 border border-amber-200",
  client:      "bg-sky-100 text-sky-700 border border-sky-200",
};

const PHASES = [
  { id:"handover", name:"Phase 1: The Handover", description:"Getting everything we need to start",
    steps:["Client Questionnaire","Brand Asset Collection","Account Access Handover"] },
  { id:"game_plan", name:"Phase 2: The Game Plan", description:"Strategy & creative direction",
    steps:["Sitemap & IA","Wireframes","Content Strategy"] },
  { id:"foundation", name:"Phase 3: Technical Foundation", description:"Building the core infrastructure",
    steps:["Homepage Design","Inner Pages Design","Development Build","QA & Revisions"] },
  { id:"live", name:"Phase 4: Live & Running", description:"Launch & ongoing optimization",
    steps:["Content Population","SEO & Analytics Setup","Launch & Handoff"] },
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function timeAgo(d: string) { try { return formatDistanceToNow(parseISO(d),{addSuffix:true}); } catch { return d; } }
function fmtDate(d: string) { try { return format(parseISO(d),"MMM d, yyyy"); } catch { return d; } }

function actIcon(type: string) {
  switch (type) {
    case "lead_created":    return <UserPlus className="w-4 h-4 text-emerald-600" />;
    case "stage_changed":   return <ArrowRight className="w-4 h-4 text-sky-600" />;
    case "task_created":    return <Plus className="w-4 h-4 text-fuchsia-600" />;
    case "task_completed":  return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    case "hot_lead":        return <Star className="w-4 h-4 text-rose-500" />;
    case "call_scheduled":  return <Phone className="w-4 h-4 text-emerald-600" />;
    case "mockup_sent":     return <FileText className="w-4 h-4 text-cyan-600" />;
    case "note_added":      return <FileText className="w-4 h-4 text-amber-600" />;
    default:                return <Circle className="w-4 h-4 text-gray-400" />;
  }
}

/* ─── Toast ──────────────────────────────────────────────────────────────── */
function Toast({ message, type, onClose }: { message:string; type:"success"|"error"|"info"; onClose:()=>void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const bg = type === "success" ? "bg-emerald-600" : type === "error" ? "bg-red-600" : "bg-sky-600";
  return (
    <div className={`fixed bottom-4 right-4 z-[100] ${bg} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-[slideUp_0.3s_ease] max-w-sm`}>
      {type==="success" ? <CheckCircle2 className="w-4 h-4 shrink-0"/> : type==="error" ? <AlertTriangle className="w-4 h-4 shrink-0"/> : <Info className="w-4 h-4 shrink-0"/>}
      <span className="text-sm">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-4 h-4"/></button>
    </div>
  );
}

/* ─── Loading ────────────────────────────────────────────────────────────── */
function Spinner() {
  return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-emerald-500"/></div>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. LANDING PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
function LandingPage() {
  const { setSelectedPortal, setActiveView } = useAppStore();
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-slate-800 to-emerald-950 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-emerald-500/20 blur-[120px] animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute top-1/3 -right-40 w-[400px] h-[400px] rounded-full bg-teal-500/15 blur-[100px] animate-[pulse_10s_ease-in-out_infinite_2s]" />
        <div className="absolute -bottom-32 left-1/3 w-[450px] h-[450px] rounded-full bg-pink-500/10 blur-[110px] animate-[pulse_12s_ease-in-out_infinite_4s]" />
      </div>
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-4 text-center">
        <div className="mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30">
            <Cpu className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-white tracking-tight mb-3">VISUAL BUSINESS OS</h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">Unified Command Center for Modern Business</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {["Multi-Portal Management","Pipeline Automation","Real-time Dashboards"].map((f) => (
            <span key={f} className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 backdrop-blur-sm">{f}</span>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <button onClick={() => { setSelectedPortal("visual_os"); setActiveView("login"); }}
            className="px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold text-base shadow-lg shadow-emerald-500/30 transition-all duration-200 hover:scale-105 flex items-center gap-3">
            <Globe className="w-5 h-5"/>Login to Visual OS Portal
          </button>
          <button onClick={() => { setSelectedPortal("nxl"); setActiveView("login"); }}
            className="px-8 py-4 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white font-semibold text-base shadow-lg shadow-teal-500/30 transition-all duration-200 hover:scale-105 flex items-center gap-3">
            <Rocket className="w-5 h-5"/>Login to NXL Builder
          </button>
        </div>
        <button onClick={() => { setSelectedPortal("vbos"); setActiveView("login"); }}
          className="text-sm text-gray-500 hover:text-gray-300 underline underline-offset-4 transition-colors">VBOS Super Admin Login</button>
      </main>
      <footer className="relative z-10 py-6 text-center">
        <p className="text-sm text-gray-600">&copy; 2026 VSUAL Digital Media. All rights reserved.</p>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. LOGIN VIEW
   ═══════════════════════════════════════════════════════════════════════════ */
function LoginView() {
  const { selectedPortal, setCurrentUser, setSessionToken, setActiveView } = useAppStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const portalLabel = selectedPortal === "vbos" ? "VBOS Admin" : selectedPortal === "visual_os" ? "Visual OS Portal" : "NXL Builder Command Center";

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Email and password are required"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth", { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ email, password, portal:selectedPortal }) });
      const data = await res.json();
      if (data.user && data.token) { setCurrentUser(data.user); setSessionToken(data.token); setActiveView("dashboard"); }
      else { setError(data.error || "Invalid credentials"); }
    } catch { setError("Connection failed. Please try again."); }
    finally { setLoading(false); }
  }, [email, password, selectedPortal, setCurrentUser, setSessionToken, setActiveView]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-emerald-950 p-4 relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      <Card className="w-full max-w-md relative z-10 shadow-2xl border-gray-700/50 bg-gray-900/80 backdrop-blur-xl">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <button onClick={() => setActiveView("landing")} className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4"/> Back
            </button>
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
              <Cpu className="w-8 h-8 text-white"/>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">{portalLabel}</h1>
            <p className="text-gray-400 text-sm">Sign in to continue</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password"
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"/>
            </div>
            {error && <p className="text-red-400 text-sm flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5"/>{error}</p>}
            <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white h-11 text-sm font-medium">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Cpu className="w-4 h-4 mr-2"/>}Sign In
            </Button>
          </form>
          <p className="text-center text-xs text-gray-500 mt-6">Demo: test@customer.com / test123</p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. SIDEBAR
   ═══════════════════════════════════════════════════════════════════════════ */
function Sidebar({ onToggle }: { onToggle: () => void }) {
  const { activeView, setActiveView, currentUser, setCurrentUser, setSessionToken, selectedPortal, sidebarOpen } = useAppStore();
  const isSuperAdmin = currentUser?.role === "super_admin";
  const isNxl = selectedPortal === "nxl";
  const logoText = isSuperAdmin ? "VBOS" : "NXL BYLDR";

  const navItems = [
    { view:"dashboard", label:"Dashboard", icon:LayoutDashboard },
    { view:"pipeline",  label:"Pipeline",  icon:GitBranch },
    { view:"leads",     label:"Leads",     icon:Users },
    { view:"tasks",     label:"Tasks",     icon:CheckSquare },
    ...(isNxl ? [{ view:"portal", label:"Command Center", icon:Monitor }] : []),
    ...(isSuperAdmin ? [{ view:"admin", label:"Admin Panel", icon:Shield }] : []),
    ...(isSuperAdmin ? [{ view:"settings", label:"Settings", icon:Settings }] : []),
  ];

  const handleLogout = useCallback(() => {
    setCurrentUser(null); setSessionToken(null); setActiveView("landing");
  }, [setCurrentUser, setSessionToken, setActiveView]);

  return (
    <>
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onToggle}/>}
      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 w-[260px] ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="h-16 flex items-center px-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0"><Cpu className="w-5 h-5 text-white"/></div>
            <span className="font-bold text-lg tracking-tight dark:text-gray-100">{logoText}</span>
          </div>
        </div>
        <nav className="flex-1 py-4 px-2 overflow-y-auto">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = activeView === item.view;
              return (
                <button key={item.view} onClick={() => { setActiveView(item.view); if (window.innerWidth < 1024) onToggle(); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"}`}>
                  <item.icon className={`w-5 h-5 shrink-0 ${isActive ? "text-emerald-600 dark:text-emerald-400" : ""}`}/>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
        {currentUser && (
          <div className="border-t border-gray-100 dark:border-gray-800 p-3 shrink-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold shrink-0">{currentUser.name.charAt(0).toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate dark:text-gray-100">{currentUser.name}</p>
                <Badge className={`text-[10px] ${ROLE_COLORS[currentUser.role] || ""}`}>{currentUser.role}</Badge>
              </div>
            </div>
            <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 transition-all">
              <LogOut className="w-4 h-4"/><span>Logout</span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. HEADER
   ═══════════════════════════════════════════════════════════════════════════ */
function Header({ onMenuToggle }: { onMenuToggle: () => void }) {
  const { activeView, setIntakeModalOpen, sessionToken } = useAppStore();
  const titles: Record<string,string> = {
    dashboard:"Dashboard", pipeline:"Pipeline", leads:"Leads",
    tasks:"Tasks", portal:"Command Center", admin:"Admin Panel", settings:"Settings",
  };
  const showNewLead = ["dashboard","pipeline","leads"].includes(activeView);
  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={onMenuToggle} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><Menu className="w-5 h-5"/></button>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{titles[activeView] || "Dashboard"}</h1>
      </div>
      <div className="flex items-center gap-1">
        {showNewLead && (
          <Button onClick={() => setIntakeModalOpen(true)} size="sm" className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
            <Plus className="w-4 h-4"/><span className="hidden sm:inline ml-1">New Lead</span>
          </Button>
        )}
        {sessionToken && <NotificationPanel token={sessionToken} />}
        <ThemeToggle />
      </div>
    </header>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. DASHBOARD VIEW
   ═══════════════════════════════════════════════════════════════════════════ */
interface DashboardData {
  leads: { activeCount:number; byStage:Record<string,number> };
  tasks: { byStatus:Record<string,number> };
  projects: { summary:{ actionRequired:boolean }[] };
  notifications: { unreadCount:number };
  hotLeads: Lead[];
  recentActivities: Activity[];
  stuckOpportunities: Lead[];
}

function DashboardView({ toast }: { toast:(m:string,t?:string)=>void }) {
  const { sessionToken, setActiveView, setIntakeModalOpen, setPipelineCounts } = useAppStore();
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async (token: string) => {
    try {
      const res = await fetch("/api/dashboard", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      return data;
    } catch { return null; }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!sessionToken) return;
    setLoading(true);
    loadDashboard(sessionToken).then(data => {
      if (cancelled) return;
      if (data?.leads) {
        setStats(data as DashboardData);
        if (data.leads.byStage) setPipelineCounts(data.leads.byStage);
        if (data.notifications?.unreadCount) useAppStore.getState().setUnreadCount(data.notifications.unreadCount);
      } else {
        toast("Failed to load dashboard","error");
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [sessionToken, loadDashboard, toast, setPipelineCounts]);

  if (loading) return <Spinner/>;
  if (!stats) return null;

  const totalLeads = PIPELINE_STAGES.reduce((a,s) => a + (stats.leads.byStage[s]||0), 0);
  const activePipeline = PIPELINE_STAGES.filter(s => !["Closed Won","Closed Lost"].includes(s)).reduce((a,s) => a + (stats.leads.byStage[s]||0), 0);
  const tasksDue = (stats.tasks.byStatus.pending||0) + (stats.tasks.byStatus.in_progress||0);
  const actionRequiredCount = (stats.projects.summary||[]).filter(p => p.actionRequired).length;

  return (
    <div className="space-y-6">
      {actionRequiredCount > 0 && (
        <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-pink-600 shrink-0"/>
          <div>
            <p className="text-sm font-medium text-pink-800">{actionRequiredCount} project(s) require attention</p>
            <button onClick={() => setActiveView("portal")} className="text-xs text-pink-600 hover:underline mt-0.5">View Command Center &rarr;</button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:"Active Leads", val:totalLeads, Icon:Users, color:"text-gray-900" },
          { label:"Active Pipeline", val:activePipeline, Icon:GitBranch, color:"text-gray-900" },
          { label:"Tasks Due", val:tasksDue, Icon:CheckSquare, color:"text-gray-900" },
          { label:"Hot Leads", val:stats.hotLeads.length, Icon:Star, color:"text-rose-600" },
        ].map(c => (
          <Card key={c.label} className="hover:shadow-lg transition-shadow duration-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2"><span className="text-sm text-gray-500">{c.label}</span><c.Icon className="w-4 h-4 text-gray-400"/></div>
              <p className={`text-2xl font-bold ${c.color}`}>{c.val}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Pipeline Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {PIPELINE_STAGES.map(stage => {
              const count = stats.leads.byStage[stage] || 0;
              if (count === 0 && stage === "Closed Lost") return null;
              return (
                <div key={stage} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-28 shrink-0 truncate">{stage}</span>
                  <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${stage==="Closed Won"?"bg-emerald-500":stage==="Closed Lost"?"bg-red-400":stage==="Hot Lead"?"bg-rose-500":"bg-emerald-400"}`}
                      style={{ width: `${totalLeads ? Math.max((count/totalLeads)*100, 2) : 0}%` }}/>
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {(stats.recentActivities||[]).slice(0,10).map((a:Activity) => (
                <div key={a.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="mt-0.5 shrink-0">{actIcon(a.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">{a.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{timeAgo(a.createdAt)}</p>
                  </div>
                </div>
              ))}
              {(!stats.recentActivities || stats.recentActivities.length === 0) && <p className="text-sm text-gray-400 text-center py-8">No recent activity</p>}
            </div>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button onClick={() => setIntakeModalOpen(true)} variant="outline" className="w-full justify-start gap-2"><UserPlus className="w-4 h-4"/>Add Lead</Button>
              <Button onClick={() => setActiveView("pipeline")} variant="outline" className="w-full justify-start gap-2"><GitBranch className="w-4 h-4"/>View Pipeline</Button>
              <Button onClick={() => setActiveView("tasks")} variant="outline" className="w-full justify-start gap-2"><CheckSquare className="w-4 h-4"/>View Tasks</Button>
            </CardContent>
          </Card>
          {stats.stuckOpportunities && stats.stuckOpportunities.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader>
                <CardTitle className="text-amber-800 flex items-center gap-2"><AlertTriangle className="w-4 h-4"/>Stuck Leads</CardTitle>
                <CardDescription>Leads idle for 3+ days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.stuckOpportunities.slice(0,5).map((l:Lead) => (
                    <div key={l.id} className="text-sm"><span className="font-medium">{l.name}</span><span className="text-gray-500 ml-1">({l.pipelineStage})</span></div>
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

/* ═══════════════════════════════════════════════════════════════════════════
   5. PIPELINE VIEW (Kanban)
   ═══════════════════════════════════════════════════════════════════════════ */
function PipelineView({ toast }: { toast:(m:string,t?:string)=>void }) {
  const { sessionToken, leads, setLeads, selectedLead, setSelectedLead } = useAppStore();
  const [loading, setLoading] = useState(true);

  const doLoadLeads = useCallback(async (token: string) => {
    try {
      const res = await fetch("/api/leads?limit=100", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      return data;
    } catch { return null; }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!sessionToken) return;
    setLoading(true);
    doLoadLeads(sessionToken).then(data => {
      if (cancelled) return;
      if (data?.leads) setLeads(data.leads);
      else toast("Failed to load pipeline","error");
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [sessionToken, doLoadLeads, toast, setLeads]);

  const refreshLeads = useCallback(() => {
    if (!sessionToken) return;
    doLoadLeads(sessionToken).then(data => { if (data?.leads) setLeads(data.leads); });
  }, [sessionToken, doLoadLeads, setLeads]);

  const moveLead = useCallback(async (lead:Lead, nextStage:string) => {
    if (!sessionToken) return;
    try {
      const res = await fetch("/api/leads", {
        method:"PATCH",
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${sessionToken}` },
        body:JSON.stringify({ id:lead.id, pipelineStage:nextStage }),
      });
      if (res.ok) {
        toast(`Moved "${lead.name}" to ${nextStage}`);
        refreshLeads();
        if (selectedLead?.id === lead.id) setSelectedLead(null);
      }
    } catch { toast("Failed to move lead","error"); }
  }, [sessionToken, toast, refreshLeads, selectedLead, setSelectedLead]);

  const leadsByStage = useMemo(() => {
    const m: Record<string,Lead[]> = {};
    PIPELINE_STAGES.forEach(s => m[s] = []);
    leads.forEach(l => { if (m[l.pipelineStage]) m[l.pipelineStage].push(l); });
    return m;
  }, [leads]);

  if (loading) return <Spinner/>;

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 min-w-max h-full pb-4">
          {PIPELINE_STAGES.map(stage => {
            const sl = leadsByStage[stage] || [];
            const ci = PIPELINE_STAGES.indexOf(stage);
            const next = ci < PIPELINE_STAGES.length - 1 ? PIPELINE_STAGES[ci+1] : null;
            return (
              <div key={stage} className="w-64 flex flex-col shrink-0">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${STAGE_COLORS[stage]?.split(" ")[0]||"bg-gray-300"}`}/>
                    <span className="text-sm font-semibold text-gray-700">{stage}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">{sl.length}</Badge>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {sl.map(lead => (
                    <div key={lead.id} onClick={() => setSelectedLead(lead)}
                      className={`bg-white border rounded-lg p-3 cursor-pointer hover:shadow-md transition-all duration-200 ${selectedLead?.id===lead.id?"ring-2 ring-emerald-500 shadow-md":"border-gray-200"}`}>
                      <p className="text-sm font-semibold text-gray-900 mb-0.5">{lead.name}</p>
                      {lead.businessName && <p className="text-xs text-gray-500 flex items-center gap-1 mb-1.5"><Building2 className="w-3 h-3"/>{lead.businessName}</p>}
                      <p className="text-xs text-gray-400 mb-2">{timeAgo(lead.updatedAt)}</p>
                      {lead.tags && <div className="flex flex-wrap gap-1 mb-2">{lead.tags.split(",").filter(Boolean).slice(0,3).map(tag => <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{tag.trim()}</span>)}</div>}
                      {next && !["Closed Won","Closed Lost","Retention"].includes(stage) && (
                        <button onClick={(e) => { e.stopPropagation(); moveLead(lead, next); }}
                          className="w-full mt-1 text-xs px-2 py-1.5 rounded-md border border-gray-200 text-gray-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all flex items-center justify-center gap-1">
                          Move &rarr;
                        </button>
                      )}
                    </div>
                  ))}
                  {sl.length === 0 && <div className="text-xs text-gray-400 text-center py-6">No leads</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {selectedLead && <LeadDetailPanel lead={selectedLead} onClose={() => setSelectedLead(null)} toast={toast}/>}
    </div>
  );
}

/* ─── Lead Detail Panel ───────────────────────────────────────────────────── */
function LeadDetailPanel({ lead, onClose }: { lead:Lead; onClose:()=>void; toast:(m:string,t?:string)=>void }) {
  const { sessionToken } = useAppStore();
  const [detail, setDetail] = useState<Lead|null>(null);
  const [loading, setLoading] = useState(true);

  const loadDetail = useCallback(async (token: string, leadId: string, fallback: Lead) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      return data.lead || fallback;
    } catch { return fallback; }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!sessionToken) return;
    setLoading(true);
    loadDetail(sessionToken, lead.id, lead).then(d => {
      if (!cancelled) { setDetail(d); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [sessionToken, lead.id, lead, loadDetail]);

  if (loading) return <div className="w-80 border-l bg-white p-4 flex items-center justify-center shrink-0"><Loader2 className="w-6 h-6 animate-spin text-emerald-500"/></div>;
  const d = detail || lead;
  return (
    <div className="w-80 border-l bg-white overflow-y-auto shrink-0 hidden md:block">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-semibold text-gray-900">Lead Details</h3><button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="w-4 h-4"/></button></div>
        <div><p className="text-base font-bold">{d.name}</p>{d.businessName && <p className="text-sm text-gray-500">{d.businessName}</p>}</div>
        <div className="space-y-1.5">
          <p className="text-xs text-gray-500">Contact</p>
          <p className="text-sm flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-gray-400"/>{d.email}</p>
          <p className="text-sm flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-gray-400"/>{d.phone}</p>
        </div>
        <div><p className="text-xs text-gray-500 mb-1">Stage</p><Badge className={`${STAGE_COLORS[d.pipelineStage]||""} border`}>{d.pipelineStage}</Badge></div>
        {d.serviceType && <div><p className="text-xs text-gray-500">Service</p><p className="text-sm">{d.serviceType}</p></div>}
        {d.source && <div><p className="text-xs text-gray-500">Source</p><p className="text-sm capitalize">{d.source.replace("_"," ")}</p></div>}
        {d.tags && <div><p className="text-xs text-gray-500 mb-1">Tags</p><div className="flex flex-wrap gap-1">{d.tags.split(",").filter(Boolean).map(tag => <Badge key={tag} variant="secondary" className="text-[10px]">{tag.trim()}</Badge>)}</div></div>}
        {d.notes && <div><p className="text-xs text-gray-500">Notes</p><p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-2.5">{d.notes}</p></div>}
        {d.tasks && d.tasks.length > 0 && (
          <div><p className="text-xs text-gray-500 mb-1">Tasks ({d.tasks.length})</p>
            <div className="space-y-1">{d.tasks.slice(0,5).map(t => (
              <div key={t.id} className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${t.status==="completed"?"bg-green-500":t.status==="in_progress"?"bg-sky-500":"bg-gray-300"}`}/>
                <span className="truncate">{t.title}</span>
              </div>
            ))}</div>
          </div>
        )}
        <div className="text-xs text-gray-400 space-y-0.5 pt-2 border-t"><p>Created: {fmtDate(d.createdAt)}</p><p>Last Activity: {timeAgo(d.lastActivityAt)}</p></div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. LEADS VIEW
   ═══════════════════════════════════════════════════════════════════════════ */
function LeadsView({ toast }: { toast:(m:string,t?:string)=>void }) {
  const { sessionToken, leads, setLeads, setSelectedLead } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  const doFetchLeads = useCallback(async (token: string, params: URLSearchParams) => {
    try {
      const res = await fetch(`/api/leads?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      return data;
    } catch { return null; }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!sessionToken) return;
    setLoading(true);
    const p = new URLSearchParams({ limit:"100" });
    doFetchLeads(sessionToken, p).then(data => {
      if (cancelled) return;
      if (data?.leads) setLeads(data.leads);
      else toast("Failed to load leads","error");
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [sessionToken, doFetchLeads, toast, setLeads]);

  const doSearch = useCallback(() => {
    if (!sessionToken) return;
    setLoading(true);
    const p = new URLSearchParams({ limit:"100" });
    if (stageFilter) p.set("stage", stageFilter);
    if (statusFilter) p.set("status", statusFilter);
    if (sourceFilter) p.set("source", sourceFilter);
    if (search) p.set("search", search);
    doFetchLeads(sessionToken, p).then(data => {
      if (data?.leads) setLeads(data.leads);
      setLoading(false);
    });
  }, [sessionToken, search, stageFilter, statusFilter, sourceFilter, doFetchLeads, setLeads]);

  const clearFilters = useCallback(() => {
    setSearch(""); setStageFilter(""); setStatusFilter(""); setSourceFilter("");
    if (!sessionToken) return;
    setLoading(true);
    doFetchLeads(sessionToken, new URLSearchParams({ limit:"100" })).then(data => {
      if (data?.leads) setLeads(data.leads);
      setLoading(false);
    });
  }, [sessionToken, doFetchLeads, setLeads]);

  if (loading && leads.length === 0) return <Spinner/>;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input type="text" placeholder="Search leads..." value={search} onChange={(e)=>setSearch(e.target.value)}
                onKeyDown={(e) => e.key==="Enter" && doSearch()}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"/>
            </div>
            <select value={stageFilter} onChange={(e)=>setStageFilter(e.target.value)} className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
              <option value="">All Stages</option>
              {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)} className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
            <select value={sourceFilter} onChange={(e)=>setSourceFilter(e.target.value)} className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
              <option value="">All Sources</option>
              <option value="manual">Manual</option>
              <option value="referral">Referral</option>
              <option value="ghl_webhook">GHL Webhook</option>
            </select>
            <Button onClick={clearFilters} variant="outline" size="sm">Clear</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-gray-200">
                {["Name","Business","Email","Phone","Stage","Tags","Updated"].map(h => <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">{h}</th>)}
                <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Actions</th>
              </tr></thead>
              <tbody>
                {leads.map(lead => (
                  <tr key={lead.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3"><p className="text-sm font-medium">{lead.name}</p></td>
                    <td className="px-4 py-3 text-sm text-gray-600">{lead.businessName || "\u2014"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{lead.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{lead.phone}</td>
                    <td className="px-4 py-3"><Badge className={`${STAGE_COLORS[lead.pipelineStage]||""} border text-[10px]`}>{lead.pipelineStage}</Badge></td>
                    <td className="px-4 py-3"><div className="flex gap-1">{(lead.tags||"").split(",").filter(Boolean).slice(0,2).map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">{t.trim()}</span>)}</div></td>
                    <td className="px-4 py-3 text-xs text-gray-400">{timeAgo(lead.updatedAt)}</td>
                    <td className="px-4 py-3 text-right"><Button size="sm" variant="ghost" onClick={() => setSelectedLead(lead)}><Search className="w-3.5 h-3.5"/></Button></td>
                  </tr>
                ))}
                {leads.length === 0 && <tr><td colSpan={8} className="text-center py-12 text-sm text-gray-400">No leads found</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <p className="text-xs text-gray-400 text-right">{leads.length} lead(s)</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. LEAD INTAKE MODAL
   ═══════════════════════════════════════════════════════════════════════════ */
function LeadIntakeModal({ toast }: { toast:(m:string,t?:string)=>void }) {
  const { sessionToken, intakeModalOpen, setIntakeModalOpen, setLeads } = useAppStore();
  const [form, setForm] = useState({ name:"", businessName:"", phone:"", email:"", serviceType:"", assignedTo:"" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<User[]>([]);

  const loadUsers = useCallback(async (token: string) => {
    try {
      const res = await fetch("/api/users", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      return data.users || [];
    } catch { return []; }
  }, []);

  useEffect(() => {
    if (!intakeModalOpen || !sessionToken) return;
    let cancelled = false;
    loadUsers(sessionToken).then(u => { if (!cancelled) setUsers(u); });
    return () => { cancelled = true; };
  }, [intakeModalOpen, sessionToken, loadUsers]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.email) { setError("Name, phone, and email are required"); return; }
    if (!sessionToken) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/leads", { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${sessionToken}` }, body:JSON.stringify(form) });
      const data = await res.json();
      if (data.lead) {
        toast(`Lead "${form.name}" created!`);
        setForm({ name:"", businessName:"", phone:"", email:"", serviceType:"", assignedTo:"" });
        setIntakeModalOpen(false);
        const lr = await fetch("/api/leads?limit=100", { headers: { Authorization: `Bearer ${sessionToken}` } });
        const ld = await lr.json();
        if (ld.leads) setLeads(ld.leads);
      } else if (data.error) setError(data.error);
    } catch { setError("Failed to create lead"); }
    finally { setLoading(false); }
  }, [form, sessionToken, toast, setIntakeModalOpen, setLeads]);

  if (!intakeModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader>
          <div className="flex items-center justify-between"><CardTitle>Add New Lead</CardTitle><button onClick={() => setIntakeModalOpen(false)} className="p-1 rounded hover:bg-gray-100"><X className="w-5 h-5"/></button></div>
          <CardDescription>Enter lead information below</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Name *</label><input type="text" value={form.name} onChange={(e)=>setForm(f=>({...f,name:e.target.value}))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="Full name"/></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label><input type="text" value={form.businessName} onChange={(e)=>setForm(f=>({...f,businessName:e.target.value}))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="Business name"/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label><input type="tel" value={form.phone} onChange={(e)=>setForm(f=>({...f,phone:e.target.value}))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="+1 (555) 000-0000"/></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email *</label><input type="email" value={form.email} onChange={(e)=>setForm(f=>({...f,email:e.target.value}))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="email@example.com"/></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
              <select value={form.serviceType} onChange={(e)=>setForm(f=>({...f,serviceType:e.target.value}))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                <option value="">Select service...</option>
                {["Branding","Website Design","Social Media Management","Branding + Social Media","Branding + Website","Full Package","Social Media + PPC","Website Redesign"].map(s => <option key={s} value={s}>{s}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
              <select value={form.assignedTo} onChange={(e)=>setForm(f=>({...f,assignedTo:e.target.value}))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
              </select></div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIntakeModalOpen(false)} className="flex-1">Cancel</Button>
              <Button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">{loading && <Loader2 className="w-4 h-4 animate-spin mr-1"/>}Create Lead</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   8. TASKS VIEW
   ═══════════════════════════════════════════════════════════════════════════ */
function TasksView({ toast }: { toast:(m:string,t?:string)=>void }) {
  const { sessionToken, tasks, setTasks } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState({ title:"", priority:"medium", leadId:"", dueDate:"" });
  const [submitting, setSubmitting] = useState(false);

  const doLoadTasks = useCallback(async (token: string, params: URLSearchParams) => {
    try {
      const res = await fetch(`/api/tasks?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      return data;
    } catch { return null; }
  }, []);

  const loadTasks = useCallback(() => {
    if (!sessionToken) return;
    const p = new URLSearchParams({ limit:"100" });
    if (statusFilter) p.set("status", statusFilter);
    if (priorityFilter) p.set("priority", priorityFilter);
    setLoading(true);
    doLoadTasks(sessionToken, p).then(data => {
      if (data?.tasks) setTasks(data.tasks);
      else toast("Failed to load tasks","error");
      setLoading(false);
    });
  }, [sessionToken, statusFilter, priorityFilter, doLoadTasks, toast, setTasks]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const toggleComplete = useCallback(async (task:Task) => {
    if (!sessionToken) return;
    const ns = task.status === "completed" ? "pending" : "completed";
    try {
      await fetch(`/api/tasks/${task.id}`, { method:"PATCH", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${sessionToken}` }, body:JSON.stringify({ status:ns }) });
      toast(ns==="completed"?"Task completed!":"Task reopened");
      loadTasks();
    } catch { toast("Failed to update task","error"); }
  }, [sessionToken, toast, loadTasks]);

  const createTask = useCallback(async (e:React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || !sessionToken) return;
    setSubmitting(true);
    try {
      await fetch("/api/tasks", { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${sessionToken}` }, body:JSON.stringify(newTask) });
      toast("Task created!");
      setNewTask({ title:"", priority:"medium", leadId:"", dueDate:"" });
      setShowAdd(false);
      loadTasks();
    } catch { toast("Failed to create task","error"); }
    finally { setSubmitting(false); }
  }, [newTask, sessionToken, toast, loadTasks]);

  if (loading && tasks.length === 0) return <Spinner/>;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)} className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
              <option value="">All Statuses</option>
              <option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="completed">Completed</option>
            </select>
            <select value={priorityFilter} onChange={(e)=>setPriorityFilter(e.target.value)} className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
            </select>
            <div className="flex-1"/>
            <Button size="sm" onClick={() => setShowAdd(!showAdd)} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"><Plus className="w-4 h-4 mr-1"/>Add Task</Button>
          </div>
        </CardContent>
      </Card>
      {showAdd && (
        <Card className="border-emerald-200">
          <CardContent className="p-4">
            <form onSubmit={createTask} className="space-y-3">
              <input type="text" value={newTask.title} onChange={(e)=>setNewTask(t=>({...t,title:e.target.value}))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="Task title *" required/>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select value={newTask.priority} onChange={(e)=>setNewTask(t=>({...t,priority:e.target.value}))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
                </select>
                <input type="text" value={newTask.leadId} onChange={(e)=>setNewTask(t=>({...t,leadId:e.target.value}))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="Lead ID (optional)"/>
                <input type="date" value={newTask.dueDate} onChange={(e)=>setNewTask(t=>({...t,dueDate:e.target.value}))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"/>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={()=>setShowAdd(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={submitting}>{submitting && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1"/>}Create Task</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map(task => (
          <Card key={task.id} className={`hover:shadow-lg transition-all duration-200 ${task.status==="completed"?"opacity-60":""}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <button onClick={() => toggleComplete(task)} className={`mt-0.5 shrink-0 transition-all ${task.status==="completed"?"text-emerald-500":"text-gray-300 hover:text-emerald-400"}`}>
                  {task.status==="completed" ? <CheckCircle2 className="w-5 h-5"/> : <Circle className="w-5 h-5"/>}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${task.status==="completed"?"line-through text-gray-400":"text-gray-900"}`}>{task.title}</p>
                  {task.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${PRIORITY_COLORS[task.priority]||""}`}>{task.priority}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLORS[task.status]||""}`}>{task.status.replace("_"," ")}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    {task.lead && <span className="flex items-center gap-1"><Users className="w-3 h-3"/>{task.lead.name}</span>}
                    {task.dueDate && <span className={`flex items-center gap-1 ${task.status!=="completed"&&isPast(parseISO(task.dueDate))?"text-red-500":""}`}><Calendar className="w-3 h-3"/>{fmtDate(task.dueDate)}</span>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {tasks.length === 0 && <div className="col-span-full text-center py-12 text-sm text-gray-400">No tasks found</div>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   9. COMMAND CENTER (NXL only)
   ═══════════════════════════════════════════════════════════════════════════ */
function PortalView({ toast }: { toast:(m:string,t?:string)=>void }) {
  const { sessionToken, projects, setProjects, selectedProject, setSelectedProject, instructionsOpen, setInstructionsOpen } = useAppStore();
  const [loading, setLoading] = useState(true);

  const doLoadProjects = useCallback(async (token: string) => {
    try {
      const res = await fetch("/api/projects?limit=50", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      return data;
    } catch { return null; }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!sessionToken) return;
    setLoading(true);
    doLoadProjects(sessionToken).then(data => {
      if (cancelled) return;
      if (data?.projects) {
        setProjects(data.projects);
        if (data.projects.length > 0 && !selectedProject) setSelectedProject(data.projects[0]);
      } else toast("Failed to load projects","error");
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [sessionToken, doLoadProjects, toast, setProjects, setSelectedProject, selectedProject]);

  if (loading) return <Spinner/>;
  if (projects.length === 0) return <div className="text-center py-16"><Monitor className="w-12 h-12 text-gray-300 mx-auto mb-4"/><p className="text-gray-500">No active projects</p></div>;

  const project = selectedProject || projects[0];
  const hasAction = projects.some(p => p.actionRequired);

  const allSteps: { title:string; status:string; number:number }[] = [];
  const useProjectSteps = project.steps && project.steps.length > 0;
  if (useProjectSteps) {
    project.steps!.forEach(s => allSteps.push({ title:s.title, status:s.status, number:s.stepNumber }));
  } else {
    let idx = 0;
    PHASES.forEach(phase => phase.steps.forEach(step => {
      idx++;
      allSteps.push({ title:step, status: idx < project.currentStep ? "completed" : idx === project.currentStep ? "active" : "pending", number:idx });
    }));
  }

  return (
    <div className="space-y-6">
      <div className={`rounded-lg p-4 flex items-center justify-between ${hasAction ? "bg-pink-50 border border-pink-200" : "bg-emerald-50 border border-emerald-200"}`}>
        <div className="flex items-center gap-3">
          {hasAction ? <AlertTriangle className="w-5 h-5 text-pink-600"/> : <CheckCircle2 className="w-5 h-5 text-emerald-600"/>}
          <p className={`text-sm font-medium ${hasAction ? "text-pink-800" : "text-emerald-800"}`}>{hasAction ? "Action required on some projects" : "All Systems Go"}</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setInstructionsOpen(true)}><HelpCircle className="w-4 h-4 mr-1"/>How to use</Button>
      </div>

      {projects.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {projects.map(p => (
            <button key={p.id} onClick={() => setSelectedProject(p)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${selectedProject?.id===p.id?"bg-emerald-100 text-emerald-700 font-medium":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {p.clientName}{p.actionRequired && <span className="ml-1 w-2 h-2 inline-block rounded-full bg-pink-500"/>}
            </button>
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {PHASES.map(phase => {
          const isActive = project.currentPhase === phase.id;
          return (
            <Card key={phase.id} className={`transition-all ${isActive ? "ring-2 ring-emerald-500 shadow-md" : ""}`}>
              <CardHeader>
                <CardTitle className="text-base">{phase.name}</CardTitle>
                <CardDescription>{phase.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {phase.steps.map((step, si) => {
                    const ps = allSteps.find(s => s.title === step);
                    const st = ps?.status || "pending";
                    return (
                      <div key={si} className="flex items-center gap-2 text-sm">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${st==="completed"?"bg-pink-600 text-white":st==="active"?"bg-pink-400 text-white animate-pulse":"bg-gray-200 text-gray-400"}`}>
                          {st==="completed" ? "\u2713" : si+1}
                        </div>
                        <span className={st==="completed"?"text-gray-400 line-through":st==="active"?"text-gray-900 font-medium":"text-gray-500"}>
                          {useProjectSteps && ps ? ps.title : step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {instructionsOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setInstructionsOpen(false)}>
          <Card className="w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-center justify-between"><CardTitle>How to use Command Center</CardTitle><button onClick={() => setInstructionsOpen(false)} className="p-1 rounded hover:bg-gray-100"><X className="w-5 h-5"/></button></div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-600">
              <p>The Command Center tracks your client project through 4 phases and 13 steps.</p>
              <p><strong>Completed steps</strong> appear with a pink checkmark. The <strong>active step</strong> pulses pink. Pending steps are gray.</p>
              <p>Select a project from the tabs above to view its progress. Use this view to coordinate with your team and ensure nothing falls through the cracks.</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   10. ADMIN PANEL (super_admin only)
   ═══════════════════════════════════════════════════════════════════════════ */
function AdminView({ toast }: { toast:(m:string,t?:string)=>void }) {
  const { sessionToken, users, setUsers } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name:"", email:"", password:"", role:"client", portal:"visual_os" });
  const [creating, setCreating] = useState(false);

  const doLoadUsers = useCallback(async (token: string) => {
    try {
      const res = await fetch("/api/users", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      return data;
    } catch { return null; }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!sessionToken) return;
    setLoading(true);
    doLoadUsers(sessionToken).then(data => {
      if (cancelled) return;
      if (data?.users) setUsers(data.users);
      else toast("Failed to load users","error");
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [sessionToken, doLoadUsers, toast, setUsers]);

  const refreshUsers = useCallback(() => {
    if (!sessionToken) return;
    doLoadUsers(sessionToken).then(data => { if (data?.users) setUsers(data.users); });
  }, [sessionToken, doLoadUsers, setUsers]);

  const byRole = useMemo(() => {
    const m: Record<string,number> = {};
    users.forEach(u => { m[u.role] = (m[u.role]||0)+1; });
    return m;
  }, [users]);

  const createUser = useCallback(async (e:React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken) return;
    setCreating(true);
    try {
      const res = await fetch("/api/users", { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${sessionToken}` }, body:JSON.stringify(form) });
      const data = await res.json();
      if (data.user) { toast("User created!"); setShowCreate(false); setForm({ name:"", email:"", password:"", role:"client", portal:"visual_os" }); refreshUsers(); }
      else if (data.error) toast(data.error, "error");
    } catch { toast("Failed to create user","error"); }
    finally { setCreating(false); }
  }, [sessionToken, form, toast, refreshUsers]);

  if (loading) return <Spinner/>;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Total Users</p><p className="text-2xl font-bold">{users.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Admins</p><p className="text-2xl font-bold">{(byRole.admin||0)+(byRole.super_admin||0)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Clients</p><p className="text-2xl font-bold">{byRole.client||0}</p></CardContent></Card>
      </div>

      {/* Portal Health Overview */}
      {sessionToken && <PortalHealthOverview token={sessionToken} />}

      {/* User Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>User Management</CardTitle>
            <Button size="sm" onClick={() => setShowCreate(!showCreate)} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"><UserPlus className="w-4 h-4 mr-1"/>Create User</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {showCreate && (
            <form onSubmit={createUser} className="p-4 border-b border-gray-100 bg-gray-50/50 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" placeholder="Name *" value={form.name} onChange={(e)=>setForm(f=>({...f,name:e.target.value}))} required className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"/>
                <input type="email" placeholder="Email *" value={form.email} onChange={(e)=>setForm(f=>({...f,email:e.target.value}))} required className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"/>
                <input type="password" placeholder="Password *" value={form.password} onChange={(e)=>setForm(f=>({...f,password:e.target.value}))} required className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"/>
                <select value={form.role} onChange={(e)=>setForm(f=>({...f,role:e.target.value}))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                  <option value="client">Client</option><option value="admin">Admin</option><option value="super_admin">Super Admin</option>
                </select>
                <select value={form.portal} onChange={(e)=>setForm(f=>({...f,portal:e.target.value}))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                  <option value="visual_os">Visual OS</option><option value="nxl">NXL Builder</option><option value="vbos">VBOS</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={()=>setShowCreate(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={creating}>{creating && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1"/>}Create</Button>
              </div>
            </form>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-gray-200">{["Name","Email","Role","Portal","Status"].map(h => <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-3">{h}</th>)}</tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                    <td className="px-4 py-3"><Badge className={`text-[10px] ${ROLE_COLORS[u.role]||""}`}>{u.role}</Badge></td>
                    <td className="px-4 py-3 text-sm text-gray-600">{u.portal}</td>
                    <td className="px-4 py-3"><span className={`inline-block w-2 h-2 rounded-full ${u.isActive?"bg-green-500":"bg-gray-300"}`}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Automation Rules Manager */}
      {sessionToken && <AutomationRulesManager token={sessionToken} toast={toast} />}

      {/* Activity Log Viewer */}
      {sessionToken && <ActivityLogViewer token={sessionToken} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   11. SETTINGS (super_admin only)
   ═══════════════════════════════════════════════════════════════════════════ */
function SettingsView({ toast }: { toast:(m:string,t?:string)=>void }) {
  const { sessionToken } = useAppStore();
  const [settings, setSettings] = useState<Array<{id:string;key:string;value:string;type:string;group:string}>|null>(null);
  const [loading, setLoading] = useState(true);

  const doLoadSettings = useCallback(async (token: string) => {
    try {
      const res = await fetch("/api/settings", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      return data;
    } catch { return null; }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!sessionToken) return;
    setLoading(true);
    doLoadSettings(sessionToken).then(data => {
      if (cancelled) return;
      if (data?.allSettings) setSettings(data.allSettings);
      else { setSettings([]); toast("Failed to load settings","error"); }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [sessionToken, doLoadSettings, toast]);

  if (loading) return <Spinner/>;

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader><CardTitle>System Settings</CardTitle></CardHeader>
        <CardContent>
          {settings && settings.length > 0 ? (
            <div className="space-y-3">
              {settings.map((s) => (
                <div key={s.key} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                  <p className="text-sm font-medium text-gray-700 w-44 shrink-0">{s.key.replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase())}</p>
                  <Badge variant="secondary" className="text-[10px] shrink-0 mt-0.5">{s.group}</Badge>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{s.value || "\u2014"}</p>
                    <button onClick={() => { navigator.clipboard.writeText(s.value); toast("Copied!","info"); }} className="p-1 rounded hover:bg-gray-100 shrink-0"><Copy className="w-3.5 h-3.5 text-gray-400"/></button>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400">No settings configured yet.</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Webhook Configuration</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">GHL Webhook URL</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 truncate">{typeof window !== "undefined" ? `${window.location.origin}/api/webhook` : "/api/webhook"}</code>
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/api/webhook`); toast("Webhook URL copied!","info"); }}><Copy className="w-4 h-4"/></Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function Page() {
  const { activeView, currentUser, setSidebarOpen, selectedPortal } = useAppStore();
  const [toastState, setToastState] = useState<{ message:string; type:"success"|"error"|"info" } | null>(null);

  const toast = useCallback((message:string, type:"success"|"error"|"info"="success") => {
    setToastState({ message, type });
  }, []);

  if (!currentUser || activeView === "landing") return <LandingPage />;
  if (activeView === "login") return <LoginView/>;

  const renderView = () => {
    switch (activeView) {
      case "dashboard": return <DashboardView toast={toast}/>;
      case "pipeline":  return <PipelineView toast={toast}/>;
      case "leads":     return <LeadsView toast={toast}/>;
      case "tasks":     return <TasksView toast={toast}/>;
      case "portal":    return selectedPortal === "nxl" ? <PortalView toast={toast}/> : <DashboardView toast={toast}/>;
      case "admin":     return currentUser.role === "super_admin" ? <AdminView toast={toast}/> : <DashboardView toast={toast}/>;
      case "settings":  return currentUser.role === "super_admin" ? <SettingsView toast={toast}/> : <DashboardView toast={toast}/>;
      default:          return <DashboardView toast={toast}/>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      <Sidebar onToggle={() => setSidebarOpen(prev => !prev)}/>
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuToggle={() => setSidebarOpen(prev => !prev)}/>
        <main className="flex-1 p-4 lg:p-6">{renderView()}</main>
      </div>
      {toastState && <Toast message={toastState.message} type={toastState.type} onClose={() => setToastState(null)}/>}
      <LeadIntakeModal toast={toast}/>
    </div>
  );
}
