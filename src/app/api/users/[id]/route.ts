import { db } from "@/lib/db";
import { extractToken, requireSuperAdmin, logActivity, jsonResponse, errorResponse } from "@/lib/auth";

/* eslint-disable @typescript-eslint/no-unused-vars */

// ═══════════════════════════════════════════════════════
// GET /api/users/[id] — Get single user
// ═══════════════════════════════════════════════════════
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = extractToken(request);
    const admin = await requireSuperAdmin(token ?? "");
    if (!admin) return errorResponse("Unauthorized", 401);

    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        portal: true,
        phone: true,
        avatar: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { assignedTasks: true, createdLeads: true, activities: true, notifications: true } },
      },
    });

    if (!user) {
      return errorResponse("User not found", 404);
    }

    return jsonResponse({ user });
  } catch (error) {
    console.error("Get user error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// ═══════════════════════════════════════════════════════
// DELETE /api/users/[id] — Deactivate user (soft delete)
// ═══════════════════════════════════════════════════════
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = extractToken(request);
    const admin = await requireSuperAdmin(token ?? "");
    if (!admin) return errorResponse("Unauthorized", 401);

    const { id } = await params;

    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      return errorResponse("User not found", 404);
    }

    // Prevent deactivating self
    if (admin.id === id) {
      return errorResponse("Cannot deactivate your own account", 400);
    }

    const updated = await db.user.update({
      where: { id },
      data: { isActive: false },
    });

    // Delete all sessions for the deactivated user
    await db.session.deleteMany({ where: { userId: id } });

    await logActivity(
      "system",
      `${admin.name} deactivated user ${user.name} (${user.email})`,
      { deactivatedUserId: id },
      admin.id,
      undefined,
      admin.portal
    );

    const { password: _, ...userWithoutPassword } = updated;

    return jsonResponse({ user: userWithoutPassword, message: "User deactivated successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    return errorResponse("Internal server error", 500);
  }
}
