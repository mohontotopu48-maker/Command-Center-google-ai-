import { extractToken, validateSession, jsonResponse, errorResponse } from "@/lib/auth";

// ═══════════════════════════════════════════════════════
// GET /api/notifications — List notifications for a user
// ═══════════════════════════════════════════════════════
export async function GET(request: Request) {
  try {
    const token = extractToken(request);
    const user = await validateSession(token ?? "");
    if (!user) return errorResponse("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") ?? user.id;
    const unreadOnly = searchParams.get("unread") === "true";
    const limit = parseInt(searchParams.get("limit") ?? "50");
    const offset = parseInt(searchParams.get("offset") ?? "0");

    // Users can only see their own notifications (unless super_admin)
    if (userId !== user.id && user.role !== "super_admin") {
      return errorResponse("Unauthorized to view these notifications", 403);
    }

    const where: Record<string, unknown> = { userId };
    if (unreadOnly) where.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      db.notification.count({ where }),
      db.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return jsonResponse({
      notifications,
      unreadCount,
      pagination: {
        limit,
        offset,
        total,
      },
    });
  } catch (error) {
    console.error("List notifications error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// ═══════════════════════════════════════════════════════
// PATCH /api/notifications — Mark notification as read
// ═══════════════════════════════════════════════════════
export async function PATCH(request: Request) {
  try {
    const token = extractToken(request);
    const user = await validateSession(token ?? "");
    if (!user) return errorResponse("Unauthorized", 401);

    const body = await request.json();
    const { id, markAllRead } = body;

    if (markAllRead) {
      // Mark all notifications for the user as read
      const result = await db.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true },
      });

      return jsonResponse({
        message: `Marked ${result.count} notifications as read`,
        count: result.count,
      });
    }

    if (!id) return errorResponse("Notification ID is required");

    const notification = await db.notification.findUnique({ where: { id } });
    if (!notification) return errorResponse("Notification not found", 404);

    if (notification.userId !== user.id && user.role !== "super_admin") {
      return errorResponse("Unauthorized", 403);
    }

    const updated = await db.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return jsonResponse({ notification: updated });
  } catch (error) {
    console.error("Update notification error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// ═══════════════════════════════════════════════════════
// POST /api/notifications — Create notification
// ═══════════════════════════════════════════════════════
export async function POST(request: Request) {
  try {
    const token = extractToken(request);
    const user = await validateSession(token ?? "");
    if (!user) return errorResponse("Unauthorized", 401);

    const body = await request.json();
    const { userId, title, message, type, link } = body;

    if (!userId || !title || !message) {
      return errorResponse("userId, title, and message are required");
    }

    // Users can only create notifications for themselves (unless super_admin)
    if (userId !== user.id && user.role !== "super_admin") {
      return errorResponse("Unauthorized to create notification for this user", 403);
    }

    const notification = await db.notification.create({
      data: {
        userId,
        title: title.trim(),
        message: message.trim(),
        type: type ?? "info",
        link: link ?? null,
      },
    });

    return jsonResponse({ notification }, 201);
  } catch (error) {
    console.error("Create notification error:", error);
    return errorResponse("Internal server error", 500);
  }
}
