import { db } from "@/lib/db";
import { extractToken, validateSession, jsonResponse, errorResponse } from "@/lib/auth";

// ═══════════════════════════════════════════════════════
// GET /api/activities — Activity feed
// ═══════════════════════════════════════════════════════
export async function GET(request: Request) {
  try {
    const token = extractToken(request);
    const user = await validateSession(token ?? "");
    if (!user) return errorResponse("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const portal = searchParams.get("portal");
    const userId = searchParams.get("userId");
    const leadId = searchParams.get("leadId");
    const limit = parseInt(searchParams.get("limit") ?? "50");
    const offset = parseInt(searchParams.get("offset") ?? "0");

    const where: Record<string, unknown> = {};

    if (type) where.type = type;
    if (portal) where.portal = portal;
    if (userId) where.userId = userId;
    if (leadId) where.leadId = leadId;

    const [activities, total] = await Promise.all([
      db.activity.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, avatar: true } },
          lead: { select: { id: true, name: true, businessName: true, pipelineStage: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      db.activity.count({ where }),
    ]);

    // Activity type counts for filtering
    const typeCounts = await db.activity.groupBy({
      by: ["type"],
      _count: { id: true },
      take: 20,
    });

    const countsByType = Object.fromEntries(
      typeCounts.map((t) => [t.type, t._count.id])
    );

    return jsonResponse({
      activities,
      countsByType,
      pagination: {
        limit,
        offset,
        total,
      },
    });
  } catch (error) {
    console.error("List activities error:", error);
    return errorResponse("Internal server error", 500);
  }
}
