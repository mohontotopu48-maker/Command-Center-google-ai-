import { db } from "@/lib/db";
import { extractToken, validateSession, logActivity, jsonResponse, errorResponse } from "@/lib/auth";

// ═══════════════════════════════════════════════════════
// GET /api/leads — List leads with filters
// ═══════════════════════════════════════════════════════
export async function GET(request: Request) {
  try {
    const token = extractToken(request);
    const user = await validateSession(token ?? "");
    if (!user) return errorResponse("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const stage = searchParams.get("stage");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const portal = searchParams.get("portal");
    const tag = searchParams.get("tag");
    const source = searchParams.get("source");
    const assignedTo = searchParams.get("assignedTo");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "50");

    const where: Record<string, unknown> = {};

    // Non-admin users only see their own leads
    if (user.role === "client" || user.role === "contractor") {
      where.assignedTo = user.id;
    }

    if (stage) where.pipelineStage = stage;
    if (status) where.status = status;
    if (portal) where.portal = portal;
    if (source) where.source = source;
    if (assignedTo) where.assignedTo = assignedTo;
    if (tag) where.tags = { contains: tag };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { businessName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const [leads, total] = await Promise.all([
      db.lead.findMany({
        where,
        include: {
          creator: { select: { id: true, name: true, avatar: true } },
          _count: { select: { tasks: true, activities: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.lead.count({ where }),
    ]);

    // Pipeline stage counts for kanban view
    const stageCounts = await db.lead.groupBy({
      by: ["pipelineStage"],
      where: { status: "active" },
      _count: { id: true },
    });

    const pipelineCounts = Object.fromEntries(
      stageCounts.map((s) => [s.pipelineStage, s._count.id])
    );

    return jsonResponse({
      leads,
      pipelineCounts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("List leads error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// ═══════════════════════════════════════════════════════
// POST /api/leads — Create lead
// ═══════════════════════════════════════════════════════
export async function POST(request: Request) {
  try {
    const token = extractToken(request);
    const user = await validateSession(token ?? "");
    if (!user) return errorResponse("Unauthorized", 401);

    const body = await request.json();
    const {
      name,
      businessName,
      phone,
      email,
      serviceType,
      pipelineStage,
      tags,
      assignedTo,
      notes,
      source,
      portal,
      estimatedValue,
    } = body;

    if (!name || !phone || !email) {
      return errorResponse("Name, phone, and email are required");
    }

    const lead = await db.lead.create({
      data: {
        name: name.trim(),
        businessName: businessName?.trim() ?? null,
        phone: phone.trim(),
        email: email.toLowerCase().trim(),
        serviceType: serviceType ?? null,
        pipelineStage: pipelineStage ?? "New Lead",
        tags: tags ?? "",
        assignedTo: assignedTo ?? null,
        notes: notes ?? null,
        source: source ?? "manual",
        portal: portal ?? user.portal,
        estimatedValue: estimatedValue ?? null,
        creatorId: user.id,
      },
    });

    await logActivity(
      "lead_created",
      `${user.name} created lead: ${lead.name}`,
      {
        leadId: lead.id,
        email: lead.email,
        stage: lead.pipelineStage,
        source: lead.source,
      },
      user.id,
      lead.id,
      lead.portal
    );

    return jsonResponse({ lead }, 201);
  } catch (error) {
    console.error("Create lead error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// ═══════════════════════════════════════════════════════
// PATCH /api/leads — Update lead
// ═══════════════════════════════════════════════════════
export async function PATCH(request: Request) {
  try {
    const token = extractToken(request);
    const user = await validateSession(token ?? "");
    if (!user) return errorResponse("Unauthorized", 401);

    const body = await request.json();
    const { id, pipelineStage, tags, notes, status, assignedTo, hotLeadScore, estimatedValue } = body;

    if (!id) {
      return errorResponse("Lead ID is required");
    }

    const existing = await db.lead.findUnique({ where: { id } });
    if (!existing) return errorResponse("Lead not found", 404);

    const data: Record<string, unknown> = { lastActivityAt: new Date() };
    const changes: Record<string, unknown> = {};

    if (pipelineStage !== undefined && pipelineStage !== existing.pipelineStage) {
      data.pipelineStage = pipelineStage;
      changes.stageChanged = { from: existing.pipelineStage, to: pipelineStage };
    }
    if (tags !== undefined) {
      data.tags = tags;
      changes.tags = tags;
    }
    if (notes !== undefined) {
      data.notes = notes;
      changes.noteAdded = true;
    }
    if (status !== undefined) {
      data.status = status;
      changes.statusChanged = { from: existing.status, to: status };
    }
    if (assignedTo !== undefined) {
      data.assignedTo = assignedTo;
      changes.assignedTo = assignedTo;
    }
    if (hotLeadScore !== undefined) {
      data.hotLeadScore = hotLeadScore;
      changes.hotLeadScore = hotLeadScore;
    }
    if (estimatedValue !== undefined) {
      data.estimatedValue = estimatedValue;
      changes.estimatedValue = estimatedValue;
    }

    const lead = await db.lead.update({
      where: { id },
      data,
    });

    // Determine activity type
    let activityType = "note_added";
    if (changes.stageChanged) activityType = "stage_changed";
    else if (changes.statusChanged) activityType = "system";
    else if (changes.hotLeadScore && lead.hotLeadScore >= 80) activityType = "hot_lead";
    else if (changes.tags) activityType = "system";

    await logActivity(
      activityType,
      `${user.name} updated lead: ${lead.name}`,
      { ...changes, leadId: lead.id },
      user.id,
      lead.id,
      lead.portal
    );

    return jsonResponse({ lead });
  } catch (error) {
    console.error("Update lead error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// ═══════════════════════════════════════════════════════
// DELETE /api/leads — Archive lead
// ═══════════════════════════════════════════════════════
export async function DELETE(request: Request) {
  try {
    const token = extractToken(request);
    const user = await validateSession(token ?? "");
    if (!user) return errorResponse("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return errorResponse("Lead ID is required");
    }

    const lead = await db.lead.findUnique({ where: { id } });
    if (!lead) return errorResponse("Lead not found", 404);

    const updated = await db.lead.update({
      where: { id },
      data: { status: "archived", lastActivityAt: new Date() },
    });

    await logActivity(
      "system",
      `${user.name} archived lead: ${lead.name}`,
      { leadId: lead.id, previousStatus: lead.status },
      user.id,
      lead.id,
      lead.portal
    );

    return jsonResponse({ lead: updated, message: "Lead archived successfully" });
  } catch (error) {
    console.error("Archive lead error:", error);
    return errorResponse("Internal server error", 500);
  }
}
