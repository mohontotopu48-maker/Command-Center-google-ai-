import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/leads/[id] - Get single lead with tasks and activities
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const lead = await db.lead.findUnique({
      where: { id },
      include: {
        tasks: {
          orderBy: { createdAt: "desc" },
        },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!lead) {
      return NextResponse.json(
        { error: "Lead not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ lead });
  } catch (error) {
    console.error("Lead GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/leads/[id] - Update specific lead
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.lead.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Lead not found" },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = { lastActivityAt: new Date() };
    const allowedFields = [
      "name",
      "businessName",
      "phone",
      "email",
      "serviceType",
      "pipelineStage",
      "tags",
      "assignedTo",
      "notes",
      "status",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Log stage change
    if (
      body.pipelineStage &&
      body.pipelineStage !== existing.pipelineStage
    ) {
      await db.activity.create({
        data: {
          type: "stage_changed",
          message: `Lead "${existing.name}" moved from "${existing.pipelineStage}" to "${body.pipelineStage}"`,
          leadId: id,
          userId: body.assignedTo || undefined,
          metadata: JSON.stringify({
            previousStage: existing.pipelineStage,
            newStage: body.pipelineStage,
          }),
        },
      });
    }

    // Log note added
    if (body.notes && body.notes !== existing.notes) {
      await db.activity.create({
        data: {
          type: "note_added",
          message: `Note updated for lead "${existing.name}"`,
          leadId: id,
          metadata: JSON.stringify({ notePreview: body.notes.substring(0, 100) }),
        },
      });
    }

    const lead = await db.lead.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ lead });
  } catch (error) {
    console.error("Lead PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
