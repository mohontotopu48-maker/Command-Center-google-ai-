import { db } from "@/lib/db";
import { extractToken, validateSession, jsonResponse, errorResponse } from "@/lib/auth";

// ═══════════════════════════════════════════════════════
// GET /api/leads/[id] — Get lead with tasks and activities
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

    const lead = await db.lead.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true, avatar: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, avatar: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        activities: {
          include: {
            user: { select: { id: true, name: true, avatar: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        project: {
          include: {
            steps: { orderBy: { stepNumber: "asc" } },
          },
        },
      },
    });

    if (!lead) {
      return errorResponse("Lead not found", 404);
    }

    return jsonResponse({ lead });
  } catch (error) {
    console.error("Get lead error:", error);
    return errorResponse("Internal server error", 500);
  }
}
