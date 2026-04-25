import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Helper to log activity
async function logActivity(data: {
  type: string;
  message: string;
  leadId?: string;
  taskId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}) {
  await db.activity.create({
    data: {
      type: data.type,
      message: data.message,
      leadId: data.leadId,
      taskId: data.taskId,
      userId: data.userId,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    },
  });
}

// GET /api/leads - List all leads with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stage = searchParams.get("stage");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const assignedTo = searchParams.get("assignedTo");
    const tag = searchParams.get("tag");
    const source = searchParams.get("source");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: Record<string, unknown> = {};

    if (stage) where.pipelineStage = stage;
    if (status) where.status = status;
    if (assignedTo) where.assignedTo = assignedTo;
    if (source) where.source = source;
    if (tag) {
      where.tags = { contains: tag };
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { businessName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const [leads, total] = await Promise.all([
      db.lead.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          tasks: {
            orderBy: { createdAt: "desc" },
          },
          _count: {
            select: { activities: true },
          },
        },
      }),
      db.lead.count({ where }),
    ]);

    return NextResponse.json({
      leads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Leads GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/leads - Create new lead
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      businessName,
      phone,
      email,
      serviceType,
      pipelineStage,
      tags,
      assignedTo,
      notes,
      source,
    } = body;

    if (!name || !phone || !email) {
      return NextResponse.json(
        { error: "Name, phone, and email are required" },
        { status: 400 }
      );
    }

    const lead = await db.lead.create({
      data: {
        name,
        businessName: businessName || null,
        phone,
        email: email.toLowerCase().trim(),
        serviceType: serviceType || null,
        pipelineStage: pipelineStage || "New Lead",
        tags: tags || "",
        assignedTo: assignedTo || null,
        notes: notes || null,
        source: source || "manual",
      },
    });

    // Log activity
    await logActivity({
      type: "lead_created",
      message: `New lead created: ${lead.name}`,
      leadId: lead.id,
      userId: assignedTo || undefined,
    });

    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    console.error("Leads POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/leads - Update lead (change stage, add tags, update info)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Lead ID is required" },
        { status: 400 }
      );
    }

    const existing = await db.lead.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Lead not found" },
        { status: 404 }
      );
    }

    // Track stage change for activity
    let activityType: string | null = null;
    let activityMessage: string | null = null;

    if (updateData.pipelineStage && updateData.pipelineStage !== existing.pipelineStage) {
      activityType = "stage_changed";
      activityMessage = `Lead "${existing.name}" moved from "${existing.pipelineStage}" to "${updateData.pipelineStage}"`;

      // Special activity for hot leads
      if (updateData.pipelineStage === "Hot Lead") {
        await logActivity({
          type: "hot_lead",
          message: `Lead "${existing.name}" is now a Hot Lead!`,
          leadId: id,
          metadata: { previousStage: existing.pipelineStage },
        });
      }

      if (updateData.pipelineStage === "Call Scheduled") {
        activityType = "call_scheduled";
        activityMessage = `Call scheduled for lead "${existing.name}"`;
      }
    }

    // Handle tags
    if (updateData.tags !== undefined && updateData.appendTag) {
      const existingTags = existing.tags
        ? existing.tags.split(",").map((t: string) => t.trim())
        : [];
      const newTags = Array.isArray(updateData.appendTag)
        ? updateData.appendTag
        : [updateData.appendTag];
      const merged = [...new Set([...existingTags, ...newTags.map((t: string) => t.trim()).filter(Boolean)])];
      updateData.tags = merged.join(",");
      delete updateData.appendTag;
    }

    const lead = await db.lead.update({
      where: { id },
      data: {
        ...updateData,
        lastActivityAt: new Date(),
      },
    });

    // Log stage change activity
    if (activityType && activityMessage) {
      await logActivity({
        type: activityType,
        message: activityMessage,
        leadId: id,
        userId: updateData.assignedTo || undefined,
        metadata: { previousStage: existing.pipelineStage, newStage: updateData.pipelineStage },
      });
    }

    return NextResponse.json({ lead });
  } catch (error) {
    console.error("Leads PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/leads - Archive a lead
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Lead ID is required" },
        { status: 400 }
      );
    }

    const existing = await db.lead.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Lead not found" },
        { status: 404 }
      );
    }

    const lead = await db.lead.update({
      where: { id },
      data: { status: "archived" },
    });

    await logActivity({
      type: "note_added",
      message: `Lead "${existing.name}" has been archived`,
      leadId: id,
    });

    return NextResponse.json({ lead });
  } catch (error) {
    console.error("Leads DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
