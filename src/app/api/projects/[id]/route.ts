import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/projects/[id] - Get project with details
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const project = await db.project.findUnique({
      where: { id },
    });

    // Manually fetch related lead if leadId exists
    let lead = null;
    if (project?.leadId) {
      lead = await db.lead.findUnique({
        where: { id: project.leadId },
        select: {
          id: true,
          name: true,
          businessName: true,
          email: true,
          phone: true,
          pipelineStage: true,
        },
      });
    }

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ project, lead });
  } catch (error) {
    console.error("Project GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[id] - Update project
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.project.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      "clientName",
      "businessName",
      "currentPhase",
      "currentStep",
      "actionRequired",
      "actionMessage",
      "status",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Auto-advance phase based on step
    if (body.currentStep !== undefined) {
      const step = body.currentStep as number;
      if (step <= 3) updateData.currentPhase = "handover";
      else if (step <= 6) updateData.currentPhase = "game_plan";
      else if (step <= 10) updateData.currentPhase = "foundation";
      else updateData.currentPhase = "live";
    }

    const project = await db.project.update({
      where: { id },
      data: updateData,
    });

    // Manually fetch related lead if leadId exists
    let lead = null;
    if (project.leadId) {
      lead = await db.lead.findUnique({
        where: { id: project.leadId },
        select: {
          id: true,
          name: true,
          businessName: true,
        },
      });
    }

    return NextResponse.json({ project, lead });
  } catch (error) {
    console.error("Project PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
