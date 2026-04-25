import { create } from "zustand";

// ─── Resilient API Fetch ───────────────────────────────────
const RETRY_DELAYS = [300, 800, 1500];
const MAX_RETRIES = 3;

export async function apiFetch(
  url: string,
  options: RequestInit = {},
  retries = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(options.signal ? 30000 : 15000),
      });
      return res;
    } catch (err) {
      lastError = err as Error;
      // Don't retry on 4xx errors
      if ((err as Error).name === "AbortError" && attempt < retries) continue;
      if (attempt < retries && RETRY_DELAYS[attempt]) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
      }
    }
  }
  throw lastError ?? new Error("Request failed after retries");
}

export async function apiGet<T>(url: string, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await apiFetch(url, { headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function apiPost<T>(url: string, body: unknown, token?: string | null): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await apiFetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  return res.json();
}

// ─── Types ───────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  portal: string;
  phone?: string | null;
  avatar?: string | null;
  isActive: boolean;
}

export interface Lead {
  id: string;
  name: string;
  businessName: string | null;
  phone: string;
  email: string;
  serviceType: string | null;
  pipelineStage: string;
  tags: string;
  assignedTo: string | null;
  notes: string | null;
  source: string;
  status: string;
  estimatedValue?: string | null;
  hotLeadScore?: number;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  tasks?: Task[];
  _count?: { tasks: number; activities: number };
  creator?: { id: string; name: string; avatar: string | null } | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  type: string;
  priority: string;
  status: string;
  assignedTo: string | null;
  leadId: string | null;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lead?: Lead | null;
  assignee?: { id: string; name: string; avatar: string | null } | null;
}

export interface Activity {
  id: string;
  type: string;
  message: string;
  metadata: string | null;
  portal?: string | null;
  userId: string | null;
  leadId: string | null;
  taskId: string | null;
  createdAt: string;
  user?: { id: string; name: string; avatar: string | null } | null;
  lead?: { id: string; name: string; businessName: string | null } | null;
}

export interface Project {
  id: string;
  leadId: string | null;
  clientName: string;
  businessName: string | null;
  currentPhase: string;
  currentStep: number;
  actionRequired: boolean;
  actionMessage: string;
  status: string;
  startedAt: string;
  updatedAt: string;
  steps?: ProjectStep[];
}

export interface ProjectStep {
  id: string;
  stepNumber: number;
  title: string;
  description?: string | null;
  status: string;
  completedAt?: string | null;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link?: string | null;
  createdAt: string;
}

// ─── Store ───────────────────────────────────────────────
interface AppState {
  // Auth
  currentUser: User | null;
  sessionToken: string | null;
  setCurrentUser: (user: User | null) => void;
  setSessionToken: (token: string | null) => void;

  // Navigation
  activeView: string;
  setActiveView: (view: string) => void;
  selectedPortal: string;
  setSelectedPortal: (portal: string) => void;

  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;

  // Leads
  leads: Lead[];
  setLeads: (leads: Lead[]) => void;
  pipelineCounts: Record<string, number>;
  setPipelineCounts: (counts: Record<string, number>) => void;
  selectedLead: Lead | null;
  setSelectedLead: (lead: Lead | null) => void;

  // Tasks
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;

  // Activities
  activities: Activity[];
  setActivities: (activities: Activity[]) => void;

  // Projects
  projects: Project[];
  setProjects: (projects: Project[]) => void;
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;

  // Users (admin)
  users: User[];
  setUsers: (users: User[]) => void;

  // Notifications
  notifications: Notification[];
  setNotifications: (n: Notification[]) => void;
  unreadCount: number;
  setUnreadCount: (c: number) => void;

  // Loading
  loading: boolean;
  setLoading: (loading: boolean) => void;

  // Modals
  intakeModalOpen: boolean;
  setIntakeModalOpen: (open: boolean) => void;
  instructionsOpen: boolean;
  setInstructionsOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  sessionToken: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  setSessionToken: (token) => set({ sessionToken: token }),

  activeView: "landing",
  setActiveView: (view) => set({ activeView: view }),
  selectedPortal: "nxl",
  setSelectedPortal: (portal) => set({ selectedPortal: portal }),

  sidebarOpen: true,
  setSidebarOpen: (open) => set((state) => ({ sidebarOpen: typeof open === "function" ? open(state.sidebarOpen) : open })),

  leads: [],
  setLeads: (leads) => set({ leads }),
  pipelineCounts: {},
  setPipelineCounts: (counts) => set({ pipelineCounts: counts }),
  selectedLead: null,
  setSelectedLead: (lead) => set({ selectedLead: lead }),

  tasks: [],
  setTasks: (tasks) => set({ tasks }),

  activities: [],
  setActivities: (activities) => set({ activities }),

  projects: [],
  setProjects: (projects) => set({ projects }),
  selectedProject: null,
  setSelectedProject: (project) => set({ selectedProject: project }),

  users: [],
  setUsers: (users) => set({ users }),

  notifications: [],
  setNotifications: (n) => set({ notifications: n }),
  unreadCount: 0,
  setUnreadCount: (c) => set({ unreadCount: c }),

  loading: false,
  setLoading: (loading) => set({ loading }),

  intakeModalOpen: false,
  setIntakeModalOpen: (open) => set({ intakeModalOpen: open }),
  instructionsOpen: false,
  setInstructionsOpen: (open) => set({ instructionsOpen: open }),
}));
