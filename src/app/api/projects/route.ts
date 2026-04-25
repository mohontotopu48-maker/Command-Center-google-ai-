import { db } from "@/lib/db";
import { extractToken, validateSession, PROJECT_STEPS, logActivity, jsonResponse, errorResponse } from "@/lib/auth";

// ═══════════════════════════════════════════════════════
// GET /api/projects — List projects with filters
// ═══════════════════════════════════════════════════════
export async function GET(request: Request) {
  try {
    const token = extractToken(request);
    const user = await validateSession(token ?? "");
    if (!user) return errorResponse("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const currentPhase = searchParams.get("currentPhase");
    const actionRequired = searchParams.get("actionRequired");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "50");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (currentPhase) where.currentPhase = currentPhase;
    if (actionRequired === "true") where.actionRequired = true;

    const [projects, total] = await Promise.all([
      db.project.findMany({
        where,
        include: {
          lead: {
            select: { id: true, name: true, businessName: true, email: true, phone: true },
          },
          steps: { orderBy: { stepNumber: "asc" } },
          _count: { select: { steps: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.project.count({ where }),
    ]);

    return jsonResponse({
      projects,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("List projects error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// ═══════════════════════════════════════════════════════
// POST /api/projects — Create project with 13 default steps
// ═══════════════════════════════════════════════════════
export async function POST(request: Request) {
  try {
    const token = extractToken(request);
    const user = await validateSession(token ?? "");
    if (!user) return errorResponse("Unauthorized", 401);

    const body = await request.json();
    const { clientName, businessName, leadId, targetComplete } = body;

    if (!clientName) {
      return errorResponse("Client name is required");
    }

    // Check if lead already has a project
    if (leadId) {
      const existingProject = await db.project.findUnique({ where: { leadId } });
      if (existingProject) {
        return errorResponse("This lead already has a project", 409);
      }
    }

    const project = await db.project.create({
      data: {
        clientName: clientName.trim(),
        businessName: businessName?.trim() ?? null,
        leadId: leadId ?? null,
        targetComplete: targetComplete ? new Date(targetComplete) : null,
        steps: {
          create: PROJECT_STEPS.map((step, index) => ({
            stepNumber: step.stepNumber,
            title: step.title,
            description: step.description,
            status: index === 0 ? "active" : "pending",
          })),
        },
      },
      include: {
        lead: { select: { id: true, name: true, businessName: true } },
        steps: { orderBy: { stepNumber: "asc" } },
      },
    });

    await logActivity(
      "system",
      `${user.name} created project for ${project.clientName}`,
      { projectId: project.id, leadId: project.leadId },
      user.id,
      project.leadId ?? undefined,
      user.portal
    );

    return jsonResponse({ project }, 201);
  } catch (error) {
    console.error("Create project error:", error);
    return errorResponse("Internal server error", 500);
  }
}
