import { validateSession, jsonResponse, errorResponse } from "@/lib/auth";

// ═══════════════════════════════════════════════════════
// GET /api/auth/[token] — Validate session
// ═══════════════════════════════════════════════════════
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return errorResponse("Token is required", 401);
    }

    const user = await validateSession(token);

    if (!user) {
      return errorResponse("Invalid or expired session", 401);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;

    return jsonResponse({
      user: userWithoutPassword,
      token,
      role: user.role,
      portal: user.portal,
    });
  } catch (error) {
    console.error("Session validation error:", error);
    return errorResponse("Internal server error", 500);
  }
}
