import { db } from "@/lib/db";
import { extractToken, validateSession, logActivity, jsonResponse, errorResponse } from "@/lib/auth";

// ═══════════════════════════════════════════════════════
// GET /api/tasks — List tasks with filters
// ═══════════════════════════════════════════════════════
export async function GET(request: Request) {
  try {
    const token = extractToken(request);
    const user = await validateSession(token ?? "");
    if (!user) return errorResponse("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const type = searchParams.get("type");
    const assignedTo = searchParams.get("assignedTo");
    const overdue = searchParams.get("overdue");
    const leadId = searchParams.get("leadId");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "50");

    const where: Record<string, unknown> = {};

    // Non-admin users only see their assigned tasks
    if (user.role === "client" || user.role === "contractor") {
      where.assignedTo = user.id;
    }

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (type) where.type = type;
    if (assignedTo) where.assignedTo = assignedTo;
    if (leadId) where.leadId = leadId;

    // Overdue filter: tasks that are past due and not completed
    if (overdue === "true") {
      where.status = { not: "completed" };
      where.dueDate = { lte: new Date() };
    }

    const [tasks, total] = await Promise.all([
      db.task.findMany({
        where,
        include: {
          assignee: { select: { id: true, name: true, avatar: true } },
          lead: { select: { id: true, name: true, businessName: true, pipelineStage: true } },
        },
        orderBy: [
          { priority: "desc" },
          { dueDate: "asc" },
          { createdAt: "desc" },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.task.count({ where }),
    ]);

    // Status counts for task board
    const statusCounts = await db.task.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    const taskCounts = Object.fromEntries(
      statusCounts.map((s) => [s.status, s._count.id])
    );

    return jsonResponse({
      tasks,
      taskCounts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("List tasks error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// ═══════════════════════════════════════════════════════
// POST /api/tasks — Create task
// ═══════════════════════════════════════════════════════
export async function POST(request: Request) {
  try {
    const token = extractToken(request);
    const user = await validateSession(token ?? "");
    if (!user) return errorResponse("Unauthorized", 401);

    const body = await request.json();
    const {
      title,
      description,
      type,
      priority,
      status,
      assignedTo,
      leadId,
      dueDate,
    } = body;

    if (!title) {
      return errorResponse("Title is required");
    }

    const task = await db.task.create({
      data: {
        title: title.trim(),
        description: description ?? null,
        type: type ?? "general",
        priority: priority ?? "medium",
        status: status ?? "pending",
        assignedTo: assignedTo ?? null,
        leadId: leadId ?? null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    await logActivity(
      "task_created",
      `${user.name} created task: ${task.title}`,
      {
        taskId: task.id,
        priority: task.priority,
        type: task.type,
        leadId: task.leadId,
      },
      user.id,
      task.leadId ?? undefined,
      user.portal
    );

    return jsonResponse({ task }, 201);
  } catch (error) {
    console.error("Create task error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// ═══════════════════════════════════════════════════════
// PATCH /api/tasks — Update task
// ═══════════════════════════════════════════════════════
export async function PATCH(request: Request) {
  try {
    const token = extractToken(request);
    const user = await validateSession(token ?? "");
    if (!user) return errorResponse("Unauthorized", 401);

    const body = await request.json();
    const { id, title, description, type, priority, status, assignedTo, dueDate } = body;

    if (!id) {
      return errorResponse("Task ID is required");
    }

    const existing = await db.task.findUnique({ where: { id } });
    if (!existing) return errorResponse("Task not found", 404);

    const data: Record<string, unknown> = {};
    const changes: { title?: string; type?: string; priority?: string; assignedTo?: string; statusChanged?: { from: string; to: string } } = {};

    if (title !== undefined) { data.title = title.trim(); changes.title = title; }
    if (description !== undefined) { data.description = description; }
    if (type !== undefined) { data.type = type; changes.type = type; }
    if (priority !== undefined) { data.priority = priority; changes.priority = priority; }
    if (assignedTo !== undefined) { data.assignedTo = assignedTo; changes.assignedTo = assignedTo; }
    if (dueDate !== undefined) { data.dueDate = dueDate ? new Date(dueDate) : null; }

    if (status !== undefined) {
      data.status = status;
      changes.statusChanged = { from: existing.status, to: status };
      if (status === "completed") {
        data.completedAt = new Date();
      } else {
        data.completedAt = null;
      }
    }

    const task = await db.task.update({
      where: { id },
      data,
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        lead: { select: { id: true, name: true } },
      },
    });

    const activityType = changes.statusChanged?.to === "completed"
      ? "task_completed"
      : "system";

    await logActivity(
      activityType,
      `${user.name} updated task: ${task.title}`,
      { ...changes, taskId: task.id },
      user.id,
      task.leadId ?? undefined,
      user.portal
    );

    return jsonResponse({ task });
  } catch (error) {
    console.error("Update task error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// ═══════════════════════════════════════════════════════
// DELETE /api/tasks — Delete task (by query param)
// ═══════════════════════════════════════════════════════
export async function DELETE(request: Request) {
  try {
    const token = extractToken(request);
    const user = await validateSession(token ?? "");
    if (!user) return errorResponse("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return errorResponse("Task ID is required");

    const task = await db.task.findUnique({ where: { id } });
    if (!task) return errorResponse("Task not found", 404);

    await db.task.delete({ where: { id } });

    await logActivity(
      "system",
      `${user.name} deleted task: ${task.title}`,
      { taskId: task.id, leadId: task.leadId },
      user.id,
      task.leadId ?? undefined,
      user.portal
    );

    return jsonResponse({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Delete task error:", error);
    return errorResponse("Internal server error", 500);
  }
}
