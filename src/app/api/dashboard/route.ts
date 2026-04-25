import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/dashboard - Returns aggregated stats
export async function GET() {
  try {
    // Run all queries in parallel for performance
    const [
      leadsByStage,
      activeLeadsCount,
      totalTasks,
      tasksByStatus,
      hotLeads,
      stuckOpportunities,
      recentActivities,
      projectsSummary,
      tasksByPriority,
      leadsBySource,
    ] = await Promise.all([
      // Leads by stage
      db.lead.groupBy({
        by: ["pipelineStage"],
        where: { status: "active" },
        _count: { pipelineStage: true },
      }),

      // Active leads count (for quick reference)
      db.lead.count({ where: { status: "active" } }),

      // Total tasks
      db.task.count(),

      // Tasks by status
      db.task.groupBy({
        by: ["status"],
        _count: { status: true },
      }),

      // Hot leads (leads in "Hot Lead" stage or tagged with "hot_lead")
      db.lead.findMany({
        where: {
          status: "active",
          OR: [
            { pipelineStage: "Hot Lead" },
            { tags: { contains: "hot_lead" } },
          ],
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: {
          id: true,
          name: true,
          businessName: true,
          email: true,
          phone: true,
          pipelineStage: true,
          tags: true,
          lastActivityAt: true,
          createdAt: true,
        },
      }),

      // Stuck opportunities (leads that haven't moved in 3+ days, not closed)
      db.lead.findMany({
        where: {
          status: "active",
          pipelineStage: {
            notIn: ["Closed Won", "Closed Lost", "New Lead"],
          },
          lastActivityAt: {
            lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { lastActivityAt: "asc" },
        select: {
          id: true,
          name: true,
          businessName: true,
          email: true,
          pipelineStage: true,
          lastActivityAt: true,
          createdAt: true,
        },
      }),

      // Recent activities
      db.activity.findMany({
        orderBy: { createdAt: "desc" },
        take: 15,
        include: {
          user: { select: { id: true, name: true, avatar: true } },
          lead: { select: { id: true, name: true, businessName: true } },
          task: { select: { id: true, title: true } },
        },
      }),

      // Projects summary
      Promise.all([
        db.project.count({ where: { status: "active" } }),
        db.project.count({ where: { actionRequired: true } }),
        db.project.groupBy({
          by: ["currentPhase"],
          _count: { currentPhase: true },
        }),
      ]),

      // Tasks by priority
      db.task.groupBy({
        by: ["priority"],
        _count: { priority: true },
      }),

      // Leads by source
      db.lead.groupBy({
        by: ["source"],
        _count: { source: true },
      }),
    ]);

    // Format leads by stage into a map
    const stageMap: Record<string, number> = {};
    const pipelineStages = [
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
    for (const stage of pipelineStages) {
      stageMap[stage] = 0;
    }
    for (const item of leadsByStage) {
      stageMap[item.pipelineStage] = item._count.pipelineStage;
    }

    // Format tasks by status
    const statusMap: Record<string, number> = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      overdue: 0,
    };
    for (const item of tasksByStatus) {
      statusMap[item.status] = item._count.status;
    }

    // Format tasks by priority
    const priorityMap: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0,
    };
    for (const item of tasksByPriority) {
      priorityMap[item.priority] = item._count.priority;
    }

    // Format projects
    const [activeProjects, actionRequiredProjects, projectsByPhase] = projectsSummary;
    const phaseMap: Record<string, number> = {};
    for (const item of projectsByPhase) {
      phaseMap[item.currentPhase] = item._count.currentPhase;
    }

    // Format leads by source
    const sourceMap: Record<string, number> = {};
    for (const item of leadsBySource) {
      sourceMap[item.source] = item._count.source;
    }

    return NextResponse.json({
      leads: {
        total: activeLeadsCount,
        byStage: stageMap,
        bySource: sourceMap,
      },
      tasks: {
        total: totalTasks,
        byStatus: statusMap,
        byPriority: priorityMap,
      },
      hotLeads,
      stuckOpportunities,
      recentActivities,
      projects: {
        active: activeProjects,
        actionRequired: actionRequiredProjects,
        byPhase: phaseMap,
      },
    });
  } catch (error) {
    console.error("Dashboard GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
