import { db } from "@/lib/db";
import { extractToken, validateSession, PROJECT_STEPS, getPhaseForStep, logActivity, jsonResponse, errorResponse } from "@/lib/auth";

// ═══════════════════════════════════════════════════════
// GET /api/projects/[id] — Get project with steps
// ═══════════════════════════════════════════════════════
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = extractToken(request);
    const user = await validateSession(token ?? "");
    if (!user) return errorResponse("Unauthorized", 401);

    const { id } = await params;

    const project = await db.project.findUnique({
      where: { id },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            businessName: true,
            email: true,
            phone: true,
            pipelineStage: true,
          },
        },
        steps: { orderBy: { stepNumber: "asc" } },
      },
    });

    if (!project) {
      return errorResponse("Project not found", 404);
    }

    // Calculate completion percentage
    const completedSteps = project.steps.filter((s) => s.status === "completed").length;
    const progress = Math.round((completedSteps / project.steps.length) * 100);

    return jsonResponse({ ...project, progress });
  } catch (error) {
    console.error("Get project error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// ═══════════════════════════════════════════════════════
// PATCH /api/projects/[id] — Update project
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

    const existing = await db.project.findUnique({
      where: { id },
      include: { steps: { orderBy: { stepNumber: "asc" } } },
    });
    if (!existing) return errorResponse("Project not found", 404);

    const data: Record<string, unknown> = {};
    const changes: Record<string, unknown> = {};

    if (body.currentPhase !== undefined) {
      data.currentPhase = body.currentPhase;
      changes.phaseChanged = { from: existing.currentPhase, to: body.currentPhase };
    }
    if (body.actionRequired !== undefined) {
      data.actionRequired = body.actionRequired;
      changes.actionRequired = body.actionRequired;
    }
    if (body.actionMessage !== undefined) {
      data.actionMessage = body.actionMessage;
      changes.actionMessage = body.actionMessage;
    }
    if (body.status !== undefined) {
      data.status = body.status;
      changes.statusChanged = { from: existing.status, to: body.status };
    }
    if (body.targetComplete !== undefined) {
      data.targetComplete = body.targetComplete ? new Date(body.targetComplete) : null;
    }
    if (body.clientName !== undefined) {
      data.clientName = body.clientName.trim();
    }
    if (body.businessName !== undefined) {
      data.businessName = body.businessName?.trim() ?? null;
    }

    const project = await db.project.update({
      where: { id },
      data,
      include: {
        lead: { select: { id: true, name: true, businessName: true } },
        steps: { orderBy: { stepNumber: "asc" } },
      },
    });

    await logActivity(
      "system",
      `${user.name} updated project for ${project.clientName}`,
      { ...changes, projectId: project.id },
      user.id,
      project.leadId ?? undefined,
      user.portal
    );

    return jsonResponse({ project });
  } catch (error) {
    console.error("Update project error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// ═══════════════════════════════════════════════════════
// POST /api/projects/[id]/step — Advance a step
// ═══════════════════════════════════════════════════════
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = extractToken(request);
    const user = await validateSession(token ?? "");
    if (!user) return errorResponse("Unauthorized", 401);

    const { id } = await params;
    const body = await request.json();
    const { stepNumber, status: newStatus } = body;

    if (!stepNumber) {
      return errorResponse("Step number is required");
    }

    const project = await db.project.findUnique({
      where: { id },
      include: { steps: { orderBy: { stepNumber: "asc" } } },
    });
    if (!project) return errorResponse("Project not found", 404);

    const step = project.steps.find((s) => s.stepNumber === stepNumber);
    if (!step) return errorResponse("Step not found", 404);

    // Mark step as completed
    const stepStatus = newStatus ?? "completed";
    await db.projectStep.update({
      where: { id: step.id },
      data: {
        status: stepStatus,
        completedAt: stepStatus === "completed" ? new Date() : null,
      },
    });

    // If completing a step, activate the next one
    if (stepStatus === "completed") {
      const nextStep = project.steps.find((s) => s.stepNumber === stepNumber + 1);
      if (nextStep && nextStep.status === "pending") {
        await db.projectStep.update({
          where: { id: nextStep.id },
          data: { status: "active" },
        });
      }

      // Update project's current step and phase
      const newCurrentStep = Math.min(stepNumber + 1, 13);
      const newPhase = getPhaseForStep(newCurrentStep);

      const completedSteps = project.steps.filter(
        (s) => s.status === "completed" || s.stepNumber === stepNumber
      ).length;
      const allDone = completedSteps >= 13;

      await db.project.update({
        where: { id },
        data: {
          currentStep: newCurrentStep,
          currentPhase: allDone ? "live" : newPhase,
          status: allDone ? "completed" : project.status,
          actionRequired: false,
          actionMessage: allDone ? "🎉 Project completed!" : `Step ${stepNumber} completed. Next: Step ${newCurrentStep}`,
        },
      });
    }

    // Refresh project data
    const updatedProject = await db.project.findUnique({
      where: { id },
      include: {
        lead: { select: { id: true, name: true, businessName: true } },
        steps: { orderBy: { stepNumber: "asc" } },
      },
    });

    const stepTitle = PROJECT_STEPS[stepNumber - 1]?.title ?? `Step ${stepNumber}`;

    await logActivity(
      "system",
      `${user.name} ${stepStatus === "completed" ? "completed" : "updated"} step ${stepNumber} (${stepTitle}) for ${project.clientName}`,
      {
        projectId: id,
        stepNumber,
        stepStatus,
        leadId: project.leadId,
      },
      user.id,
      project.leadId ?? undefined,
      user.portal
    );

    const completedCount = updatedProject?.steps.filter((s) => s.status === "completed").length ?? 0;
    const progress = Math.round((completedCount / 13) * 100);

    return jsonResponse({ project: { ...updatedProject, progress } });
  } catch (error) {
    console.error("Advance step error:", error);
    return errorResponse("Internal server error", 500);
  }
}
