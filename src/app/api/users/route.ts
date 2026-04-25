import { db } from "@/lib/db";
import { extractToken, requireSuperAdmin, logActivity, jsonResponse, errorResponse } from "@/lib/auth";

/* eslint-disable @typescript-eslint/no-unused-vars */

// ═══════════════════════════════════════════════════════
// GET /api/users — List all users (SUPER_ADMIN only)
// ═══════════════════════════════════════════════════════
export async function GET(request: Request) {
  try {
    const token = extractToken(request);
    const admin = await requireSuperAdmin(token ?? "");
    if (!admin) return errorResponse("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const portal = searchParams.get("portal");
    const isActive = searchParams.get("isActive");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "50");

    const where: Record<string, unknown> = {};
    if (role) where.role = role;
    if (portal) where.portal = portal;
    if (isActive !== null && isActive !== "" && isActive !== undefined) {
      where.isActive = isActive === "true";
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
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
          _count: { select: { assignedTasks: true, createdLeads: true, activities: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.user.count({ where }),
    ]);

    return jsonResponse({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("List users error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// ═══════════════════════════════════════════════════════
// POST /api/users — Create user (SUPER_ADMIN only)
// ═══════════════════════════════════════════════════════
export async function POST(request: Request) {
  try {
    const token = extractToken(request);
    const admin = await requireSuperAdmin(token ?? "");
    if (!admin) return errorResponse("Unauthorized", 401);

    const body = await request.json();
    const { email, name, role, portal, phone, avatar } = body;

    if (!email || !name) {
      return errorResponse("Email and name are required");
    }

    // Prevent creating additional super_admin users (only Sal and Geo allowed)
    const requestedRole = role ?? "client";
    if (requestedRole === "super_admin") {
      return errorResponse("Cannot create additional Super Admin accounts. Only designated administrators have this access.", 403);
    }

    const existing = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return errorResponse("User with this email already exists", 409);
    }

    const user = await db.user.create({
      data: {
        email: email.toLowerCase().trim(),
        name: name.trim(),
        role: role ?? "client",
        portal: portal ?? "nxl",
        phone: phone ?? null,
        avatar: avatar ?? null,
        password: "changeme",
      },
    });

    await logActivity(
      "user_created",
      `${admin.name} created user ${user.name} (${user.email})`,
      { userId: user.id, role: user.role, portal: user.portal },
      admin.id,
      undefined,
      admin.portal
    );

    const { password: _, ...userWithoutPassword } = user;

    return jsonResponse({ user: userWithoutPassword }, 201);
  } catch (error) {
    console.error("Create user error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// ═══════════════════════════════════════════════════════
// PATCH /api/users — Update user (SUPER_ADMIN only)
// ═══════════════════════════════════════════════════════
export async function PATCH(request: Request) {
  try {
    const token = extractToken(request);
    const admin = await requireSuperAdmin(token ?? "");
    if (!admin) return errorResponse("Unauthorized", 401);

    const body = await request.json();
    const { id, name, role, portal, isActive, phone } = body;

    if (!id) {
      return errorResponse("User ID is required");
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (role !== undefined) {
      // Prevent escalating to super_admin
      if (role === "super_admin") {
        return errorResponse("Cannot assign Super Admin role. Only designated administrators have this access.", 403);
      }
      // Prevent demoting existing super_admins
      const existingUser = await db.user.findUnique({ where: { id } });
      if (existingUser?.role === "super_admin" && role !== "super_admin") {
        return errorResponse("Cannot modify Super Admin roles.", 403);
      }
      data.role = role;
    }
    if (portal !== undefined) data.portal = portal;
    if (isActive !== undefined) data.isActive = isActive;
    if (phone !== undefined) data.phone = phone;

    const user = await db.user.update({
      where: { id },
      data,
    });

    await logActivity(
      "system",
      `${admin.name} updated user ${user.name}`,
      { changes: data },
      admin.id,
      undefined,
      admin.portal
    );

    const { password: _, ...userWithoutPassword } = user;

    return jsonResponse({ user: userWithoutPassword });
  } catch (error) {
    console.error("Update user error:", error);
    return errorResponse("Internal server error", 500);
  }
}
