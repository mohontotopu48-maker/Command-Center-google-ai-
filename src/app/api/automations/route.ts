import { db } from "@/lib/db";
import { extractToken, validateSession, requireSuperAdmin, logActivity, jsonResponse, errorResponse } from "@/lib/auth";

// ═══════════════════════════════════════════════════════
// GET /api/automations — List automation rules
// ═══════════════════════════════════════════════════════
export async function GET(request: Request) {
  try {
    const token = extractToken(request);
    const user = await validateSession(token ?? "");
    if (!user) return errorResponse("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get("isActive");
    const trigger = searchParams.get("trigger");

    const where: Record<string, unknown> = {};
    if (isActive !== null && isActive !== "" && isActive !== undefined) {
      where.isActive = isActive === "true";
    }
    if (trigger) where.trigger = trigger;

    const rules = await db.automationRule.findMany({
      where,
      include: {
        _count: { select: { logs: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return jsonResponse({ rules });
  } catch (error) {
    console.error("List automations error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// ═══════════════════════════════════════════════════════
// POST /api/automations — Create automation rule (SUPER_ADMIN only)
// ═══════════════════════════════════════════════════════
export async function POST(request: Request) {
  try {
    const token = extractToken(request);
    const admin = await requireSuperAdmin(token ?? "");
    if (!admin) return errorResponse("Unauthorized", 401);

    const body = await request.json();
    const { name, trigger, conditions, actions, isActive } = body;

    if (!name || !trigger || !actions) {
      return errorResponse("Name, trigger, and actions are required");
    }

    const rule = await db.automationRule.create({
      data: {
        name: name.trim(),
        trigger,
        conditions: conditions ? JSON.stringify(conditions) : null,
        actions: JSON.stringify(actions),
        isActive: isActive ?? true,
      },
    });

    await logActivity(
      "automation",
      `${admin.name} created automation rule: ${rule.name}`,
      { ruleId: rule.id, trigger, actions },
      admin.id,
      undefined,
      admin.portal
    );

    return jsonResponse({ rule }, 201);
  } catch (error) {
    console.error("Create automation error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// ═══════════════════════════════════════════════════════
// PATCH /api/automations — Update rule
// ═══════════════════════════════════════════════════════
export async function PATCH(request: Request) {
  try {
    const token = extractToken(request);
    const user = await validateSession(token ?? "");
    if (!user) return errorResponse("Unauthorized", 401);

    // Only super_admin can update automations
    if (user.role !== "super_admin") {
      return errorResponse("Unauthorized", 401);
    }

    const body = await request.json();
    const { id, name, trigger, conditions, actions, isActive } = body;

    if (!id) return errorResponse("Rule ID is required");

    const existing = await db.automationRule.findUnique({ where: { id } });
    if (!existing) return errorResponse("Automation rule not found", 404);

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (trigger !== undefined) data.trigger = trigger;
    if (conditions !== undefined) data.conditions = conditions ? JSON.stringify(conditions) : null;
    if (actions !== undefined) data.actions = JSON.stringify(actions);
    if (isActive !== undefined) data.isActive = isActive;

    const rule = await db.automationRule.update({
      where: { id },
      data,
    });

    await logActivity(
      "automation",
      `${user.name} updated automation rule: ${rule.name}`,
      { ruleId: rule.id, changes: data },
      user.id,
      undefined,
      user.portal
    );

    return jsonResponse({ rule });
  } catch (error) {
    console.error("Update automation error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// ═══════════════════════════════════════════════════════
// DELETE /api/automations — Delete rule
// ═══════════════════════════════════════════════════════
export async function DELETE(request: Request) {
  try {
    const token = extractToken(request);
    const admin = await requireSuperAdmin(token ?? "");
    if (!admin) return errorResponse("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return errorResponse("Rule ID is required");

    const rule = await db.automationRule.findUnique({ where: { id } });
    if (!rule) return errorResponse("Automation rule not found", 404);

    await db.automationRule.delete({ where: { id } });

    await logActivity(
      "automation",
      `${admin.name} deleted automation rule: ${rule.name}`,
      { ruleId: rule.id },
      admin.id,
      undefined,
      admin.portal
    );

    return jsonResponse({ message: "Automation rule deleted successfully" });
  } catch (error) {
    console.error("Delete automation error:", error);
    return errorResponse("Internal server error", 500);
  }
}
