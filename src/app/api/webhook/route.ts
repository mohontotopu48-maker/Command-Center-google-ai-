import { db } from "@/lib/db";
import { logActivity, jsonResponse, errorResponse } from "@/lib/auth";

// ═══════════════════════════════════════════════════════
// POST /api/webhook — GHL webhook receiver
// ═══════════════════════════════════════════════════════
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // GHL webhook payload structure
    const {
      first_name,
      last_name,
      email,
      phone,
      business_name,
      source,
      tags,
      // Allow raw data passthrough
      ...rawData
    } = body;

    if (!email) {
      return errorResponse("Email is required from webhook payload");
    }

    // Check if lead already exists by email
    const existingLead = await db.lead.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingLead) {
      // Update existing lead with new data from webhook
      const updateData: Record<string, unknown> = {
        lastActivityAt: new Date(),
      };

      if (first_name || last_name) {
        updateData.name = [first_name, last_name].filter(Boolean).join(" ").trim() || existingLead.name;
      }
      if (business_name) updateData.businessName = business_name;
      if (phone) updateData.phone = phone;
      if (tags) updateData.tags = Array.isArray(tags) ? tags.join(",") : tags;
      if (source) updateData.source = source;

      const updatedLead = await db.lead.update({
        where: { id: existingLead.id },
        data: updateData,
      });

      await logActivity(
        "lead_created",
        `GHL webhook updated lead: ${updatedLead.name}`,
        {
          source: "ghl_webhook",
          leadId: updatedLead.id,
          changes: updateData,
          rawEvent: rawData,
        },
        undefined,
        updatedLead.id,
        updatedLead.portal
      );

      // Trigger automations for updated lead
      await triggerAutomations("stage_changed", updatedLead);

      return jsonResponse({
        lead: updatedLead,
        message: "Existing lead updated from webhook",
      });
    }

    // Create new lead from webhook data
    const fullName = [first_name, last_name].filter(Boolean).join(" ").trim() || "Unknown Lead";

    // Determine pipeline stage
    const initialStage = "New Lead";
    const leadSource = source ?? "ghl_webhook";
    const leadTags = tags ? (Array.isArray(tags) ? tags.join(",") : tags) : "webhook,ghl";

    // Try to find an admin to assign as creator
    const admin = await db.user.findFirst({
      where: { role: "super_admin", isActive: true },
    });

    const lead = await db.lead.create({
      data: {
        name: fullName,
        businessName: business_name ?? null,
        phone: phone ?? "",
        email: email.toLowerCase().trim(),
        pipelineStage: initialStage,
        tags: leadTags,
        source: leadSource,
        portal: "nxl",
        creatorId: admin?.id ?? null,
      },
    });

    await logActivity(
      "lead_created",
      `GHL webhook created new lead: ${lead.name}`,
      {
        source: "ghl_webhook",
        leadId: lead.id,
        email: lead.email,
        rawEvent: rawData,
      },
      admin?.id,
      lead.id,
      "nxl"
    );

    // Trigger automations for new lead
    await triggerAutomations("lead_created", lead);

    // Create notification for super admins
    if (admin) {
      await db.notification.create({
        data: {
          userId: admin.id,
          title: "New Lead from GHL",
          message: `${lead.name} (${lead.email}) was added via webhook`,
          type: "info",
          link: `/leads/${lead.id}`,
        },
      });
    }

    return jsonResponse(
      {
        lead,
        message: "New lead created from webhook",
      },
      201
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// ═══════════════════════════════════════════════════════
// Automation trigger helper
// ═══════════════════════════════════════════════════════
async function triggerAutomations(
  triggerType: string,
  lead: { id: string; name: string; source: string; pipelineStage: string; tags: string; portal: string }
) {
  try {
    const rules = await db.automationRule.findMany({
      where: {
        trigger: triggerType,
        isActive: true,
      },
    });

    for (const rule of rules) {
      // Check conditions if any
      if (rule.conditions) {
        try {
          const conditions = JSON.parse(rule.conditions);
          if (conditions.source && conditions.source !== lead.source) continue;
        } catch {
          // Invalid JSON conditions, skip this rule
          continue;
        }
      }

      // Execute actions
      const actions: { type: string; message?: string; title?: string; priority?: string; value?: string }[] =
        typeof rule.actions === "string" ? JSON.parse(rule.actions) : [];

      for (const action of actions) {
        try {
          if (action.type === "notify") {
            // Find super admins to notify
            const admins = await db.user.findMany({
              where: { role: "super_admin", isActive: true },
            });

            for (const admin of admins) {
              await db.notification.create({
                data: {
                  userId: admin.id,
                  title: `Automation: ${rule.name}`,
                  message: action.message ?? `Triggered for lead: ${lead.name}`,
                  type: "info",
                },
              });
            }
          }

          if (action.type === "tag" && action.value) {
            const currentTags = lead.tags ? lead.tags.split(",").map((t) => t.trim()) : [];
            if (!currentTags.includes(action.value)) {
              await db.lead.update({
                where: { id: lead.id },
                data: { tags: [...currentTags, action.value].join(",") },
              });
            }
          }

          if (action.type === "create_task") {
            const admins = await db.user.findMany({
              where: { role: "super_admin", isActive: true },
              take: 1,
            });

            await db.task.create({
              data: {
                title: action.title ?? `Auto: Follow up ${lead.name}`,
                type: "follow_up",
                priority: action.priority ?? "high",
                status: "pending",
                assignedTo: admins[0]?.id ?? null,
                leadId: lead.id,
                dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
              },
            });
          }
        } catch (actionError) {
          console.error(`Action execution error (${action.type}):`, actionError);
        }
      }

      // Update rule run stats
      await db.automationRule.update({
        where: { id: rule.id },
        data: {
          lastRunAt: new Date(),
          runCount: { increment: 1 },
        },
      });

      // Log the automation run
      await db.automationLog.create({
        data: {
          ruleId: rule.id,
          trigger: triggerType,
          action: JSON.stringify(actions),
          leadId: lead.id,
          status: "success",
          message: `Rule "${rule.name}" executed for lead ${lead.name}`,
        },
      });
    }
  } catch (error) {
    console.error("Automation trigger error:", error);
  }
}
