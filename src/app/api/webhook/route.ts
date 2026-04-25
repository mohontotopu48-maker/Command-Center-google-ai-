import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/webhook - GHL webhook endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // GHL webhook payloads vary, but commonly include:
    // contact fields: first_name, last_name, email, phone, etc.
    // We normalize these to our Lead model

    const firstName = body.first_name || body.firstName || body.name || "";
    const lastName = body.last_name || body.lastName || "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

    const emailRaw =
      body.email ||
      body.contact?.email ||
      body.primary_email ||
      "";
    const email = String(emailRaw);
    const phoneRaw =
      body.phone ||
      body.contact?.phone ||
      body.primary_phone ||
      body.mobile_phone ||
      "";
    const phone = String(phoneRaw);
    const businessNameRaw =
      body.company_name ||
      body.business_name ||
      body.companyName ||
      body.company ||
      "";
    const businessName = String(businessNameRaw);
    const source = body.source || "ghl_webhook";
    const tags = body.tags
      ? Array.isArray(body.tags)
        ? body.tags.join(",")
        : String(body.tags)
      : "";

    // Extract service type from notes or custom fields
    const serviceTypeRaw =
      body.service_type ||
      body.serviceType ||
      body.services_needed ||
      "";
    const serviceType = String(serviceTypeRaw);

    // Validate required fields
    if (!fullName || !email) {
      return NextResponse.json(
        { error: "Name and email are required from webhook payload" },
        { status: 400 }
      );
    }

    // Check if lead already exists by email
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await db.lead.findFirst({
      where: { email: normalizedEmail },
    });

    if (existing) {
      // Update existing lead with new webhook data
      const updateData: Record<string, unknown> = {
        lastActivityAt: new Date(),
        source: "ghl_webhook",
      };

      if (businessName && !existing.businessName) {
        updateData.businessName = businessName;
      }
      if (phone && !existing.phone) {
        updateData.phone = phone;
      }
      if (tags) {
        const existingTags = existing.tags
          ? existing.tags.split(",").map((t: string) => t.trim())
          : [];
        const newTags = tags.split(",").map((t: string) => t.trim());
        updateData.tags = [...new Set([...existingTags, ...newTags])].join(",");
      }

      const lead = await db.lead.update({
        where: { id: existing.id },
        data: updateData,
      });

      // Log automation
      await db.automationLog.create({
        data: {
          trigger: "lead_created",
          action: "webhook_lead_updated",
          leadId: lead.id,
          status: "success",
          message: `Existing lead "${lead.name}" updated via GHL webhook`,
        },
      });

      return NextResponse.json({
        message: "Existing lead updated",
        lead,
        isNew: false,
      });
    }

    // Create new lead
    const lead = await db.lead.create({
      data: {
        name: fullName,
        email: email.toLowerCase().trim(),
        phone: phone || "000-000-0000",
        businessName: businessName || null,
        serviceType: serviceType || null,
        tags: tags || "",
        source: source,
        pipelineStage: "New Lead",
        status: "active",
      },
    });

    // Log activity
    await db.activity.create({
      data: {
        type: "lead_created",
        message: `New lead from GHL webhook: ${lead.name}${lead.businessName ? ` (${lead.businessName})` : ""}`,
        leadId: lead.id,
        metadata: JSON.stringify({ source: "ghl_webhook", rawSource: source }),
      },
    });

    // Log automation
    await db.automationLog.create({
      data: {
        trigger: "lead_created",
        action: "webhook_lead_created",
        leadId: lead.id,
        status: "success",
        message: `Lead "${lead.name}" created from GHL webhook`,
      },
    });

    // Auto-tag based on business name presence
    if (businessName) {
      const updatedTags = lead.tags
        ? `${lead.tags},has_business`
        : "has_business";
      await db.lead.update({
        where: { id: lead.id },
        data: { tags: updatedTags },
      });
    }

    return NextResponse.json(
      {
        message: "Lead created from webhook",
        lead,
        isNew: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Webhook POST error:", error);

    // Log automation failure
    try {
      await db.automationLog.create({
        data: {
          trigger: "lead_created",
          action: "webhook_error",
          status: "failed",
          message: `Webhook processing failed: ${String(error)}`,
        },
      });
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/webhook - Verify webhook endpoint
export async function GET() {
  return NextResponse.json({
    message: "GHL Webhook endpoint is active",
    status: "healthy",
  });
}
