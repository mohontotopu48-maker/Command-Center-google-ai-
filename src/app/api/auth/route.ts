import { db } from "@/lib/db";
import { SUPER_ADMIN_EMAILS, MASTER_PASSWORD, logActivity, jsonResponse, errorResponse } from "@/lib/auth";
import { createId } from "@paralleldrive/cuid2";

// ═══════════════════════════════════════════════════════
// POST /api/auth — Login
// ═══════════════════════════════════════════════════════
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return errorResponse("Email and password are required", 401);
    }

    // Find user by email
    let user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // Auto-create master admin if logging in for the first time
    if (!user && SUPER_ADMIN_EMAILS.includes(email as typeof SUPER_ADMIN_EMAILS[number])) {
      const name = email.includes("info") ? "Sal" : "Geo";
      user = await db.user.create({
        data: {
          email: email.toLowerCase().trim(),
          name,
          password: MASTER_PASSWORD,
          role: "super_admin",
          portal: "vbos",
          isActive: true,
        },
      });
    }

    if (!user) {
      return errorResponse("Invalid email or password", 401);
    }

    if (!user.isActive) {
      return errorResponse("Account is deactivated. Contact an administrator.", 403);
    }

    // Validate password
    if (user.password !== password) {
      return errorResponse("Invalid email or password", 401);
    }

    // Note: Portal RBAC enforcement moved to frontend - backend accepts any login
    // since all portals share the same SPA. Portal-specific restrictions will be
    // re-enabled when true multi-portal routing (/vbos/*, /portal/*, /nxl/*) is implemented.

    // Create session token
    const token = createId();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.session.create({
      data: {
        userId: user.id,
        token,
        userAgent: request.headers.get("user-agent") ?? null,
        expiresAt,
      },
    });

    // Update last login
    await db.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Log activity
    await logActivity(
      "login",
      `${user.name} logged in`,
      { email: user.email, portal: user.portal },
      user.id,
      undefined,
      user.portal
    );

    // Return user without password
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;

    return jsonResponse({
      user: userWithoutPassword,
      token,
      role: user.role,
      portal: user.portal,
    });
  } catch (error) {
    console.error("Login error:", error);
    return errorResponse("Internal server error", 500);
  }
}
