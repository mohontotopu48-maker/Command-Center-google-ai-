import { db } from "@/lib/db";
import { MASTER_PASSWORD, PROJECT_STEPS, jsonResponse, errorResponse } from "@/lib/auth";

// ═══════════════════════════════════════════════════════
// POST /api/seed — Seed comprehensive demo data
// ═══════════════════════════════════════════════════════
export async function POST() {
  try {
    // Idempotency check: skip if users already exist
    const existingUsers = await db.user.count();
    if (existingUsers > 0) {
      return jsonResponse({
        message: "Database already seeded. Skipping.",
        users: existingUsers,
      });
    }

    // ═══════════════════════════════════════════════════
    // 1. USERS (2 super_admins + 1 test client)
    // ═══════════════════════════════════════════════════
    const sal = await db.user.create({
      data: {
        email: "info.vsualdm@gmail.com",
        name: "Sal",
        password: MASTER_PASSWORD,
        role: "super_admin",
        portal: "vbos",
        phone: "+1 (555) 100-0001",
        avatar: null,
        isActive: true,
      },
    });

    const geo = await db.user.create({
      data: {
        email: "geovsualdm@gmail.com",
        name: "Geo",
        password: MASTER_PASSWORD,
        role: "super_admin",
        portal: "vbos",
        phone: "+1 (555) 100-0002",
        avatar: null,
        isActive: true,
      },
    });

    const testClient = await db.user.create({
      data: {
        email: "test@customer.com",
        name: "Test Customer",
        password: "test123",
        role: "client",
        portal: "nxl",
        phone: "+1 (555) 200-0001",
        avatar: null,
        isActive: true,
      },
    });

    const users = [sal, geo, testClient];

    // ═══════════════════════════════════════════════════
    // 2. LEADS (15 leads across all stages)
    // ═══════════════════════════════════════════════════
    const leadsData = [
      { name: "Marcus Johnson", businessName: "Urban Style Co.", phone: "+1 (555) 301-0001", email: "marcus@urbanstyle.com", stage: "New Lead", source: "organic", tags: "fashion,branding", portal: "nxl", value: 5000 },
      { name: "Sarah Mitchell", businessName: "FreshBite Kitchen", phone: "+1 (555) 301-0002", email: "sarah@freshbite.com", stage: "Mockup Needed", source: "referral", tags: "restaurant,logo", portal: "nxl", value: 7500 },
      { name: "David Chen", businessName: "TechFlow Solutions", phone: "+1 (555) 301-0003", email: "david@techflow.com", stage: "Mockup Sent", source: "manual", tags: "saas,web-app", portal: "visual_os", value: 12000 },
      { name: "Emma Rodriguez", businessName: "Bloom Wellness Spa", phone: "+1 (555) 301-0004", email: "emma@bloomwellness.com", stage: "Engaged", source: "organic", tags: "spa,wellness,booking", portal: "nxl", value: 4500 },
      { name: "James Wilson", businessName: "Wilson Legal Group", phone: "+1 (555) 301-0005", email: "james@wilsonlegal.com", stage: "Video Sent", source: "referral", tags: "law firm,professional", portal: "nxl", value: 8000 },
      { name: "Lisa Park", businessName: "GreenLeaf Landscaping", phone: "+1 (555) 301-0006", email: "lisa@greenleaf.com", stage: "Proof Stage", source: "manual", tags: "landscaping,home-services", portal: "nxl", value: 3500 },
      { name: "Robert Taylor", businessName: "Apex Fitness", phone: "+1 (555) 301-0007", email: "robert@apexfitness.com", stage: "Hot Lead", source: "organic", tags: "gym,fitness,high-priority", portal: "visual_os", value: 6000, hotScore: 95 },
      { name: "Amanda Foster", businessName: "Cloud9 Coffee", phone: "+1 (555) 301-0008", email: "amanda@cloud9coffee.com", stage: "Call Scheduled", source: "referral", tags: "coffee shop,cafe", portal: "nxl", value: 4000 },
      { name: "Chris Thompson", businessName: "Digital Edge Marketing", phone: "+1 (555) 301-0009", email: "chris@digitaledge.com", stage: "Closed Won", source: "organic", tags: "marketing,agency", portal: "visual_os", value: 15000 },
      { name: "Nicole Brown", businessName: "Bella Rose Boutique", phone: "+1 (555) 301-0010", email: "nicole@bellarose.com", stage: "Closed Won", source: "referral", tags: "boutique,fashion", portal: "nxl", value: 5500 },
      { name: "Michael Davis", businessName: "Swift Auto Repair", phone: "+1 (555) 301-0011", email: "michael@swiftauto.com", stage: "Closed Lost", source: "manual", tags: "auto,repair", portal: "nxl", value: 3000 },
      { name: "Jennifer Lee", businessName: "Zen Yoga Studio", phone: "+1 (555) 301-0012", email: "jennifer@zenyoga.com", stage: "Retention", source: "organic", tags: "yoga,wellness,retention", portal: "visual_os", value: 2500 },
      { name: "Andrew Moore", businessName: "Skyline Roofing", phone: "+1 (555) 301-0013", email: "andrew@skylineroofing.com", stage: "New Lead", source: "ghl_webhook", tags: "roofing,construction", portal: "nxl", value: 6000 },
      { name: "Rachel Kim", businessName: "Pacific Dental Care", phone: "+1 (555) 301-0014", email: "rachel@pacificdental.com", stage: "Mockup Needed", source: "organic", tags: "dental,medical", portal: "nxl", value: 9000 },
      { name: "Daniel Garcia", businessName: "El Sabor Restaurant", phone: "+1 (555) 301-0015", email: "daniel@elsabor.com", stage: "Engaged", source: "referral", tags: "restaurant,latino", portal: "nxl", value: 5500 },
    ];

    const leads = await Promise.all(
      leadsData.map((l, i) =>
        db.lead.create({
          data: {
            name: l.name,
            businessName: l.businessName,
            phone: l.phone,
            email: l.email,
            pipelineStage: l.stage,
            tags: l.tags,
            source: l.source,
            portal: l.portal,
            estimatedValue: l.value,
            hotLeadScore: l.hotScore ?? 0,
            creatorId: i % 2 === 0 ? sal.id : geo.id,
            assignedTo: i % 3 === 0 ? null : users[i % 3].id,
            status: ["Closed Won", "Closed Lost"].includes(l.stage) && l.stage === "Closed Lost" ? "lost" : "active",
          },
        })
      )
    );

    // ═══════════════════════════════════════════════════
    // 3. TASKS (8 tasks)
    // ═══════════════════════════════════════════════════
    const tasksData = [
      { title: "Design mockup for FreshBite Kitchen", type: "mockup", priority: "high", status: "in_progress", assignedTo: sal.id, leadId: leads[1].id, dueDate: "2025-02-01" },
      { title: "Follow up with Marcus Johnson", type: "follow_up", priority: "medium", status: "pending", assignedTo: geo.id, leadId: leads[0].id, dueDate: "2025-01-28" },
      { title: "Review TechFlow mockup feedback", type: "review", priority: "high", status: "pending", assignedTo: sal.id, leadId: leads[2].id, dueDate: "2025-01-30" },
      { title: "Call Bloom Wellness for appointment", type: "call", priority: "medium", status: "completed", assignedTo: geo.id, leadId: leads[3].id, dueDate: "2025-01-25" },
      { title: "Create Apex Fitness video proposal", type: "design", priority: "urgent", status: "in_progress", assignedTo: sal.id, leadId: leads[6].id, dueDate: "2025-01-29" },
      { title: "Update Wilson Legal contract", type: "general", priority: "low", status: "pending", assignedTo: geo.id, leadId: leads[4].id, dueDate: "2025-02-05" },
      { title: "Develop Cloud9 Coffee homepage", type: "development", priority: "high", status: "pending", assignedTo: sal.id, leadId: leads[7].id, dueDate: "2025-02-10" },
      { title: "Prepare GreenLeaf proof document", type: "review", priority: "medium", status: "in_progress", assignedTo: geo.id, leadId: leads[5].id, dueDate: "2025-02-03" },
    ];

    const tasks = await Promise.all(
      tasksData.map((t) =>
        db.task.create({
          data: {
            title: t.title,
            type: t.type,
            priority: t.priority,
            status: t.status,
            assignedTo: t.assignedTo,
            leadId: t.leadId,
            dueDate: new Date(t.dueDate),
            completedAt: t.status === "completed" ? new Date("2025-01-25") : null,
          },
        })
      )
    );

    // ═══════════════════════════════════════════════════
    // 4. PROJECTS (3 projects with 13 steps each)
    // ═══════════════════════════════════════════════════
    const projectsData = [
      {
        clientName: "Digital Edge Marketing",
        businessName: "Digital Edge Marketing",
        leadId: leads[8].id,
        completedSteps: [1, 2, 3, 4, 5, 6, 7], // in foundation phase
      },
      {
        clientName: "Bella Rose Boutique",
        businessName: "Bella Rose Boutique",
        leadId: leads[9].id,
        completedSteps: [1, 2, 3], // in game_plan phase
      },
      {
        clientName: "Zen Yoga Studio",
        businessName: "Zen Yoga Studio",
        leadId: leads[11].id,
        completedSteps: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], // completed
      },
    ];

    const projects = await Promise.all(
      projectsData.map((p) => {
        const lastCompleted = Math.max(...p.completedSteps);
        const currentStep = Math.min(lastCompleted + 1, 13);
        const isComplete = lastCompleted >= 13;

        return db.project.create({
          data: {
            clientName: p.clientName,
            businessName: p.businessName,
            leadId: p.leadId,
            currentStep: isComplete ? 13 : currentStep,
            currentPhase: isComplete ? "live" : getPhaseForStep(currentStep),
            status: isComplete ? "completed" : "active",
            actionRequired: !isComplete,
            actionMessage: isComplete ? "🎉 Project completed!" : `Ready for step ${currentStep}`,
            steps: {
              create: PROJECT_STEPS.map((step) => ({
                stepNumber: step.stepNumber,
                title: step.title,
                description: step.description,
                status: p.completedSteps.includes(step.stepNumber)
                  ? "completed"
                  : step.stepNumber === currentStep && !isComplete
                    ? "active"
                    : "pending",
                completedAt: p.completedSteps.includes(step.stepNumber)
                  ? new Date(Date.now() - (13 - step.stepNumber) * 2 * 24 * 60 * 60 * 1000)
                  : null,
              })),
            },
          },
        });
      })
    );

    // ═══════════════════════════════════════════════════
    // 5. AUTOMATION RULES
    // ═══════════════════════════════════════════════════
    const automations = await Promise.all([
      db.automationRule.create({
        data: {
          name: "Hot Lead Alert",
          trigger: "lead_created",
          conditions: JSON.stringify({ source: "referral" }),
          actions: JSON.stringify([
            { type: "notify", message: "New referral lead! Review immediately." },
            { type: "tag", value: "priority" },
          ]),
          isActive: true,
          runCount: 5,
          lastRunAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        },
      }),
      db.automationRule.create({
        data: {
          name: "Stuck Lead Follow-up",
          trigger: "stuck_lead",
          conditions: JSON.stringify({ daysInactive: 7 }),
          actions: JSON.stringify([
            { type: "create_task", title: "Follow up with stuck lead", priority: "high" },
            { type: "notify", message: "Lead has been inactive for 7+ days" },
          ]),
          isActive: true,
          runCount: 3,
          lastRunAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      }),
      db.automationRule.create({
        data: {
          name: "New User Welcome",
          trigger: "new_user",
          actions: JSON.stringify([
            { type: "notify", message: "Welcome to VBOS! Complete your profile." },
          ]),
          isActive: true,
          runCount: 1,
          lastRunAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    // ═══════════════════════════════════════════════════
    // 6. SETTINGS
    // ═══════════════════════════════════════════════════
    const settings = await Promise.all([
      db.setting.create({ data: { key: "company_name", value: "VSUAL Digital Media", type: "string", group: "general" } }),
      db.setting.create({ data: { key: "timezone", value: "America/New_York", type: "string", group: "general" } }),
      db.setting.create({ data: { key: "date_format", value: "MM/DD/YYYY", type: "string", group: "general" } }),
      db.setting.create({ data: { key: "auto_archive_days", value: "90", type: "number", group: "automation" } }),
      db.setting.create({ data: { key: "stuck_lead_threshold", value: "7", type: "number", group: "automation" } }),
      db.setting.create({ data: { key: "hot_lead_score_threshold", value: "80", type: "number", group: "automation" } }),
      db.setting.create({ data: { key: "default_portal", value: "nxl", type: "string", group: "portal" } }),
      db.setting.create({ data: { key: "email_notifications", value: "true", type: "boolean", group: "notification" } }),
      db.setting.create({ data: { key: "slack_webhook", value: "", type: "string", group: "notification" } }),
    ]);

    // ═══════════════════════════════════════════════════
    // 7. ACTIVITIES (20 activities)
    // ═══════════════════════════════════════════════════
    const activitiesData = [
      { type: "login", message: "Sal logged in", userId: sal.id, portal: "vbos" },
      { type: "login", message: "Geo logged in", userId: geo.id, portal: "vbos" },
      { type: "lead_created", message: "Sal created lead: Marcus Johnson", userId: sal.id, leadId: leads[0].id, portal: "nxl", meta: { source: "organic" } },
      { type: "lead_created", message: "Geo created lead: Sarah Mitchell", userId: geo.id, leadId: leads[1].id, portal: "nxl", meta: { source: "referral" } },
      { type: "stage_changed", message: "Lead Digital Edge moved to Closed Won", userId: sal.id, leadId: leads[8].id, portal: "visual_os", meta: { from: "Call Scheduled", to: "Closed Won" } },
      { type: "task_created", message: "Sal created task: Design mockup for FreshBite", userId: sal.id, leadId: leads[1].id, portal: "nxl", meta: { priority: "high" } },
      { type: "task_completed", message: "Geo completed: Call Bloom Wellness", userId: geo.id, leadId: leads[3].id, portal: "nxl" },
      { type: "mockup_sent", message: "Mockup sent to TechFlow Solutions", userId: sal.id, leadId: leads[2].id, portal: "visual_os" },
      { type: "hot_lead", message: "Apex Fitness scored as hot lead (95)", userId: geo.id, leadId: leads[6].id, portal: "visual_os", meta: { score: 95 } },
      { type: "call_scheduled", message: "Call scheduled with Cloud9 Coffee", userId: sal.id, leadId: leads[7].id, portal: "nxl" },
      { type: "note_added", message: "Sal added note to Bella Rose project", userId: sal.id, leadId: leads[9].id, portal: "nxl" },
      { type: "stage_changed", message: "Zen Yoga moved to Retention", userId: geo.id, leadId: leads[11].id, portal: "visual_os", meta: { from: "Closed Won", to: "Retention" } },
      { type: "system", message: "Database seeded with demo data", userId: sal.id, portal: "vbos" },
      { type: "user_created", message: "Test customer account created", userId: sal.id, portal: "vbos" },
      { type: "automation", message: "Hot Lead Alert triggered for Sarah Mitchell", userId: sal.id, portal: "nxl", meta: { rule: "Hot Lead Alert" } },
      { type: "task_created", message: "Geo created: Review TechFlow mockup", userId: geo.id, leadId: leads[2].id, portal: "visual_os" },
      { type: "stage_changed", message: "GreenLeaf moved to Proof Stage", userId: sal.id, leadId: leads[5].id, portal: "nxl" },
      { type: "lead_created", message: "Webhook created lead: Skyline Roofing", userId: geo.id, leadId: leads[12].id, portal: "nxl", meta: { source: "ghl_webhook" } },
      { type: "task_created", message: "Sal created: Apex Fitness video proposal", userId: sal.id, leadId: leads[6].id, portal: "visual_os", meta: { priority: "urgent" } },
      { type: "automation", message: "Stuck Lead Follow-up triggered for Emma Rodriguez", userId: geo.id, leadId: leads[3].id, portal: "nxl", meta: { rule: "Stuck Lead Follow-up" } },
    ];

    const activities = await Promise.all(
      activitiesData.map((a, i) =>
        db.activity.create({
          data: {
            type: a.type,
            message: a.message,
            userId: a.userId,
            leadId: a.leadId,
            portal: a.portal,
            metadata: a.meta ? JSON.stringify(a.meta) : null,
            createdAt: new Date(Date.now() - (20 - i) * 2 * 60 * 60 * 1000),
          },
        })
      )
    );

    // ═══════════════════════════════════════════════════
    // 8. NOTIFICATIONS (10)
    // ═══════════════════════════════════════════════════
    const notificationsData = [
      { userId: sal.id, title: "New Lead", message: "Skyline Roofing was added via GHL webhook", type: "info", isRead: false },
      { userId: sal.id, title: "Task Overdue", message: "Follow up with Marcus Johnson is overdue", type: "warning", isRead: false },
      { userId: geo.id, title: "Hot Lead Alert", message: "Apex Fitness reached hot lead score of 95", type: "urgent", isRead: false },
      { userId: sal.id, title: "Project Update", message: "Digital Edge Marketing: Step 8 ready", type: "info", isRead: true },
      { userId: geo.id, title: "Call Scheduled", message: "Cloud9 Coffee call at 2 PM tomorrow", type: "success", isRead: true },
      { userId: sal.id, title: "Stuck Lead", message: "Emma Rodriguez hasn't been updated in 7 days", type: "warning", isRead: false },
      { userId: geo.id, title: "Mockup Ready", message: "TechFlow mockup is ready for review", type: "success", isRead: false },
      { userId: testClient.id, title: "Welcome", message: "Welcome to VBOS! Complete your profile to get started.", type: "info", isRead: false },
      { userId: sal.id, title: "Project Completed", message: "Zen Yoga Studio project has been completed!", type: "success", isRead: true },
      { userId: geo.id, title: "Automation Run", message: "Stuck Lead Follow-up automation executed successfully", type: "info", isRead: true },
    ];

    const notifications = await Promise.all(
      notificationsData.map((n, i) =>
        db.notification.create({
          data: {
            userId: n.userId,
            title: n.title,
            message: n.message,
            type: n.type,
            isRead: n.isRead,
            createdAt: new Date(Date.now() - (10 - i) * 4 * 60 * 60 * 1000),
          },
        })
      )
    );

    return jsonResponse({
      message: "Database seeded successfully!",
      summary: {
        users: users.length,
        leads: leads.length,
        tasks: tasks.length,
        projects: projects.length,
        automations: automations.length,
        settings: settings.length,
        activities: activities.length,
        notifications: notifications.length,
      },
    }, 201);
  } catch (error) {
    console.error("Seed error:", error);
    return errorResponse("Internal server error during seeding", 500);
  }
}

// Helper to determine phase from step number
function getPhaseForStep(stepNumber: number): string {
  if (stepNumber <= 3) return "handover";
  if (stepNumber <= 6) return "game_plan";
  if (stepNumber <= 10) return "foundation";
  return "live";
}
