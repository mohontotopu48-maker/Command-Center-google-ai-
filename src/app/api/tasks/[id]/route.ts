import { db } from "@/lib/db";
import { extractToken, validateSession, logActivity, jsonResponse, errorResponse } from "@/lib/auth";

// ═══════════════════════════════════════════════════════
// PATCH /api/tasks/[id] — Update specific task
// ═══════════════════════════════════════════════════════
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = extractToken(request);
    const user = await validateSession(token ?? "");
    if (!user) return errorResponse("Unauthorized", 401);

    const { id } = await params;
    const body = await request.json();

    const existing = await db.task.findUnique({ where: { id } });
    if (!existing) return errorResponse("Task not found", 404);

    const data: Record<string, unknown> = {};
    const changes: { title?: string; type?: string; priority?: string; assignedTo?: string; statusChanged?: { from: string; to: string } } = {};

    if (body.title !== undefined) { data.title = body.title.trim(); changes.title = body.title; }
    if (body.description !== undefined) { data.description = body.description; }
    if (body.type !== undefined) { data.type = body.type; changes.type = body.type; }
    if (body.priority !== undefined) { data.priority = body.priority; changes.priority = body.priority; }
    if (body.assignedTo !== undefined) { data.assignedTo = body.assignedTo; changes.assignedTo = body.assignedTo; }
    if (body.dueDate !== undefined) { data.dueDate = body.dueDate ? new Date(body.dueDate) : null; }

    if (body.status !== undefined) {
      data.status = body.status;
      changes.statusChanged = { from: existing.status, to: body.status };
      if (body.status === "completed") {
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
// DELETE /api/tasks/[id] — Delete task
// ═══════════════════════════════════════════════════════
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = extractToken(request);
    const user = await validateSession(token ?? "");
    if (!user) return errorResponse("Unauthorized", 401);

    const { id } = await params;

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
