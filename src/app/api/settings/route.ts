import { db } from "@/lib/db";
import { extractToken, validateSession, requireSuperAdmin, logActivity, jsonResponse, errorResponse } from "@/lib/auth";

// ═══════════════════════════════════════════════════════
// GET /api/settings — Get all settings (grouped)
// ═══════════════════════════════════════════════════════
export async function GET(request: Request) {
  try {
    const token = extractToken(request);
    const user = await validateSession(token ?? "");
    if (!user) return errorResponse("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const group = searchParams.get("group");

    const where = group ? { group } : {};

    const settings = await db.setting.findMany({
      where,
      orderBy: [{ group: "asc" }, { key: "asc" }],
    });

    // Group settings by group field
    const grouped: Record<string, typeof settings> = {};
    for (const setting of settings) {
      if (!grouped[setting.group]) {
        grouped[setting.group] = [];
      }
      grouped[setting.group].push(setting);
    }

    return jsonResponse({
      settings: grouped,
      allSettings: settings,
    });
  } catch (error) {
    console.error("Get settings error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// ═══════════════════════════════════════════════════════
// PUT /api/settings — Upsert setting (SUPER_ADMIN only)
// ═══════════════════════════════════════════════════════
export async function PUT(request: Request) {
  try {
    const token = extractToken(request);
    const admin = await requireSuperAdmin(token ?? "");
    if (!admin) return errorResponse("Unauthorized", 401);

    const body = await request.json();
    const { key, value, type, group } = body;

    if (!key || value === undefined) {
      return errorResponse("Key and value are required");
    }

    const setting = await db.setting.upsert({
      where: { key },
      update: {
        value: String(value),
        type: type ?? "string",
        group: group ?? "general",
      },
      create: {
        key,
        value: String(value),
        type: type ?? "string",
        group: group ?? "general",
      },
    });

    await logActivity(
      "system",
      `${admin.name} updated setting: ${key}`,
      { key, value: String(value), group: setting.group },
      admin.id,
      undefined,
      admin.portal
    );

    return jsonResponse({ setting });
  } catch (error) {
    console.error("Upsert setting error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// ═══════════════════════════════════════════════════════
// DELETE /api/settings — Delete setting (SUPER_ADMIN only)
// ═══════════════════════════════════════════════════════
export async function DELETE(request: Request) {
  try {
    const token = extractToken(request);
    const admin = await requireSuperAdmin(token ?? "");
    if (!admin) return errorResponse("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) return errorResponse("Setting key is required");

    const setting = await db.setting.findUnique({ where: { key } });
    if (!setting) return errorResponse("Setting not found", 404);

    await db.setting.delete({ where: { key } });

    await logActivity(
      "system",
      `${admin.name} deleted setting: ${key}`,
      { key, group: setting.group },
      admin.id,
      undefined,
      admin.portal
    );

    return jsonResponse({ message: "Setting deleted successfully" });
  } catch (error) {
    console.error("Delete setting error:", error);
    return errorResponse("Internal server error", 500);
  }
}
