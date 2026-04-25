import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// PATCH /api/tasks/[id] - Update specific task
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.task.findUnique({
      where: { id },
      include: {
        lead: { select: { id: true, name: true } },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      "title",
      "description",
      "type",
      "priority",
      "status",
      "assignedTo",
      "leadId",
      "dueDate",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] =
          field === "dueDate" && body[field]
            ? new Date(body[field] as string)
            : body[field];
      }
    }

    // Handle completion
    if (body.status === "completed" && existing.status !== "completed") {
      updateData.completedAt = new Date();
    } else if (body.status && body.status !== "completed") {
      updateData.completedAt = null;
    }

    const task = await db.task.update({
      where: { id },
      data: updateData,
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            businessName: true,
          },
        },
      },
    });

    // Log activity for completion
    if (body.status === "completed" && existing.status !== "completed") {
      await db.activity.create({
        data: {
          type: "task_completed",
          message: `Task "${task.title}" completed${existing.lead ? ` for ${existing.lead.name}` : ""}`,
          leadId: existing.leadId,
          taskId: task.id,
        },
      });
    }

    // Update lead's lastActivityAt
    if (existing.leadId) {
      await db.lead.update({
        where: { id: existing.leadId },
        data: { lastActivityAt: new Date() },
      });
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error("Task PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] - Delete task
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.task.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    await db.task.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Task deleted" });
  } catch (error) {
    console.error("Task DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
