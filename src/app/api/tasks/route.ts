import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/tasks - List all tasks with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const assignedTo = searchParams.get("assignedTo");
    const type = searchParams.get("type");
    const leadId = searchParams.get("leadId");
    const overdue = searchParams.get("overdue") === "true";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedTo) where.assignedTo = assignedTo;
    if (type) where.type = type;
    if (leadId) where.leadId = leadId;

    if (overdue) {
      where.status = { not: "completed" };
      where.dueDate = { lt: new Date() };
    }

    const [tasks, total] = await Promise.all([
      db.task.findMany({
        where,
        orderBy: [
          { priority: "desc" },
          { createdAt: "desc" },
        ],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          lead: {
            select: {
              id: true,
              name: true,
              businessName: true,
              pipelineStage: true,
            },
          },
        },
      }),
      db.task.count({ where }),
    ]);

    return NextResponse.json({
      tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Tasks GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create new task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      type,
      priority,
      assignedTo,
      leadId,
      dueDate,
    } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Task title is required" },
        { status: 400 }
      );
    }

    const task = await db.task.create({
      data: {
        title,
        description: description || null,
        type: type || "general",
        priority: priority || "medium",
        assignedTo: assignedTo || null,
        leadId: leadId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
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

    // Log activity
    await db.activity.create({
      data: {
        type: "task_created",
        message: `Task "${task.title}" created${task.leadId ? ` for ${task.lead?.name || "lead"}` : ""}`,
        leadId: leadId || null,
        taskId: task.id,
        userId: assignedTo || null,
      },
    });

    // Update lead's lastActivityAt if task is linked to a lead
    if (leadId) {
      await db.lead.update({
        where: { id: leadId },
        data: { lastActivityAt: new Date() },
      });
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error("Tasks POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/tasks - Update task (mark complete, change priority, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }

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

    // Handle task completion
    if (updateData.status === "completed" && existing.status !== "completed") {
      updateData.completedAt = new Date();
    } else if (updateData.status && updateData.status !== "completed") {
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

    // Log activity for status changes
    if (updateData.status && updateData.status !== existing.status) {
      if (updateData.status === "completed") {
        await db.activity.create({
          data: {
            type: "task_completed",
            message: `Task "${task.title}" completed${existing.lead ? ` for ${existing.lead.name}` : ""}`,
            leadId: existing.leadId,
            taskId: task.id,
          },
        });
      }
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
    console.error("Tasks PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
