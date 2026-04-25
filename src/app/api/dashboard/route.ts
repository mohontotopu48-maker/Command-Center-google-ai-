import { db } from "@/lib/db";
import { extractToken, validateSession, jsonResponse, errorResponse } from "@/lib/auth";

// ═══════════════════════════════════════════════════════
// GET /api/dashboard — Dashboard stats
// ═══════════════════════════════════════════════════════
export async function GET(request: Request) {
  try {
    const token = extractToken(request);
    const user = await validateSession(token ?? "");
    if (!user) return errorResponse("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const portal = searchParams.get("portal");

    const leadWhere: Record<string, unknown> = portal ? { portal } : {};

    // Run all queries in parallel for performance
    const [
      leadsByStage,
      leadsBySource,
      leadsByStatus,
      tasksByStatus,
      tasksByPriority,
      hotLeads,
      stuckOpportunities,
      recentActivities,
      projectsSummary,
      notificationsCount,
      activeAutomations,
      activeLeadsCount,
      closedWonCount,
      totalRevenue,
    ] = await Promise.all([
      // Leads by pipeline stage
      db.lead.groupBy({
        by: ["pipelineStage"],
        where: { ...leadWhere, status: "active" },
        _count: { id: true },
      }),

      // Leads by source
      db.lead.groupBy({
        by: ["source"],
        where: leadWhere,
        _count: { id: true },
      }),

      // Leads by status
      db.lead.groupBy({
        by: ["status"],
        where: leadWhere,
        _count: { id: true },
      }),

      // Tasks by status
      db.task.groupBy({
        by: ["status"],
        _count: { id: true },
      }),

      // Tasks by priority
      db.task.groupBy({
        by: ["priority"],
        where: { status: { not: "completed" } },
        _count: { id: true },
      }),

      // Hot leads (score >= 80)
      db.lead.findMany({
        where: { ...leadWhere, hotLeadScore: { gte: 80 }, status: "active" },
        select: { id: true, name: true, businessName: true, pipelineStage: true, hotLeadScore: true, email: true, phone: true },
        orderBy: { hotLeadScore: "desc" },
        take: 10,
      }),

      // Stuck opportunities (leads in "Engaged" or "Video Sent" for > 7 days)
      db.lead.findMany({
        where: {
          ...leadWhere,
          status: "active",
          pipelineStage: { in: ["Engaged", "Video Sent", "Proof Stage"] },
          lastActivityAt: { lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        select: { id: true, name: true, businessName: true, pipelineStage: true, lastActivityAt: true, email: true },
        orderBy: { lastActivityAt: "asc" },
        take: 10,
      }),

      // Recent activities
      db.activity.findMany({
        where: portal ? { portal } : undefined,
        include: {
          user: { select: { id: true, name: true, avatar: true } },
          lead: { select: { id: true, name: true, businessName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 15,
      }),

      // Projects summary
      db.project.findMany({
        include: {
          steps: { where: { status: "pending" } },
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),

      // Unread notifications count
      db.notification.count({
        where: { userId: user.id, isRead: false },
      }),

      // Active automations count
      db.automationRule.count({
        where: { isActive: true },
      }),

      // Total active leads
      db.lead.count({
        where: { ...leadWhere, status: "active" },
      }),

      // Closed won count (this month)
      db.lead.count({
        where: {
          ...leadWhere,
          status: "active",
          pipelineStage: "Closed Won",
        },
      }),

      // Total estimated revenue
      db.lead.findMany({
        where: { ...leadWhere, pipelineStage: "Closed Won", estimatedValue: { not: null } },
        select: { estimatedValue: true },
      }),
    ]);

    // Overdue tasks count
    const overdueTasksCount = await db.task.count({
      where: {
        status: { not: "completed" },
        dueDate: { lte: new Date() },
      },
    });

    // Project phase distribution
    const projectsByPhase = await db.project.groupBy({
      by: ["currentPhase"],
      where: { status: "active" },
      _count: { id: true },
    });

    return jsonResponse({
      leads: {
        byStage: Object.fromEntries(leadsByStage.map((l) => [l.pipelineStage, l._count.id])),
        bySource: Object.fromEntries(leadsBySource.map((l) => [l.source, l._count.id])),
        byStatus: Object.fromEntries(leadsByStatus.map((l) => [l.status, l._count.id])),
        activeCount: activeLeadsCount,
        closedWonCount,
        totalRevenue: totalRevenue.reduce((sum, l) => sum + (parseFloat(l.estimatedValue || "0")), 0),
      },
      tasks: {
        byStatus: Object.fromEntries(tasksByStatus.map((t) => [t.status, t._count.id])),
        byPriority: Object.fromEntries(tasksByPriority.map((t) => [t.priority, t._count.id])),
        overdueCount: overdueTasksCount,
      },
      hotLeads,
      stuckOpportunities,
      recentActivities,
      projects: {
        summary: projectsSummary.map((p) => ({
          id: p.id,
          clientName: p.clientName,
          businessName: p.businessName,
          currentPhase: p.currentPhase,
          currentStep: p.currentStep,
          status: p.status,
          actionRequired: p.actionRequired,
          actionMessage: p.actionMessage,
          pendingSteps: p.steps.length,
          totalSteps: 13,
        })),
        byPhase: Object.fromEntries(projectsByPhase.map((p) => [p.currentPhase, p._count.id])),
      },
      notifications: {
        unreadCount: notificationsCount,
      },
      automation: {
        activeCount: activeAutomations,
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return errorResponse("Internal server error", 500);
  }
}
