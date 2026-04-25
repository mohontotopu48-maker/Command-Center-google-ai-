import { create } from "zustand";

// ─── Types ───────────────────────────────────────────────
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
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  tasks?: Task[];
  _count?: { tasks: number; activities: number };
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
  lead?: Lead;
}

export interface Activity {
  id: string;
  type: string;
  message: string;
  metadata: string | null;
  userId: string | null;
  leadId: string | null;
  taskId: string | null;
  createdAt: string;
  user?: { id: string; name: string; email: string; role: string } | null;
  lead?: { id: string; name: string; businessName: string | null } | null;
  task?: { id: string; title: string } | null;
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
}

export interface DashboardStats {
  leads: {
    total: number;
    byStage: Record<string, number>;
    bySource: Record<string, number>;
  };
  tasks: {
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
  };
  hotLeads: Lead[];
  stuckOpportunities: Lead[];
  recentActivities: Activity[];
  projects: {
    active: number;
    actionRequired: number;
    byPhase: Record<string, number>;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
}

// ─── Store ───────────────────────────────────────────────
interface AppState {
  // Auth
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;

  // Navigation
  activeView: string;
  setActiveView: (view: string) => void;

  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // Leads
  leads: Lead[];
  setLeads: (leads: Lead[]) => void;
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

  // Dashboard
  dashboardStats: DashboardStats | null;
  setDashboardStats: (stats: DashboardStats) => void;

  // Loading
  loading: boolean;
  setLoading: (loading: boolean) => void;

  // Lead Intake Modal
  intakeModalOpen: boolean;
  setIntakeModalOpen: (open: boolean) => void;

  // Command Center Instructions Modal
  instructionsOpen: boolean;
  setInstructionsOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),

  activeView: "dashboard",
  setActiveView: (view) => set({ activeView: view }),

  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  leads: [],
  setLeads: (leads) => set({ leads }),

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

  dashboardStats: null,
  setDashboardStats: (stats) => set({ dashboardStats: stats }),

  loading: false,
  setLoading: (loading) => set({ loading }),

  intakeModalOpen: false,
  setIntakeModalOpen: (open) => set({ intakeModalOpen: open }),

  instructionsOpen: false,
  setInstructionsOpen: (open) => set({ instructionsOpen: open }),
}));
