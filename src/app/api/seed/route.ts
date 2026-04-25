import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/seed - Seeds the database with sample data
export async function POST() {
  try {
    // Check if data already exists
    const existingUsers = await db.user.count();
    if (existingUsers > 0) {
      return NextResponse.json({
        message: "Database already seeded. Delete existing data first if you want to reseed.",
        seeded: false,
      });
    }

    // Seed Users
    const users = await Promise.all([
      db.user.create({
        data: {
          email: "info.vsualdm@gmail.com",
          name: "NXL Admin",
          role: "admin",
          phone: "+1 (555) 100-0001",
        },
      }),
      db.user.create({
        data: {
          email: "geovsualdm@gmail.com",
          name: "Geo Visual",
          role: "admin",
          phone: "+1 (555) 100-0002",
        },
      }),
    ]);

    // Sample leads data
    const leadsData = [
      {
        name: "Marcus Johnson",
        businessName: "Johnson Auto Detailing",
        phone: "+1 (555) 201-0001",
        email: "marcus@johnsonauto.com",
        serviceType: "Branding + Social Media",
        pipelineStage: "New Lead",
        tags: "",
        assignedTo: users[0].id,
        notes: "Interested in full rebrand. Found us through Instagram.",
        source: "manual",
        status: "active",
      },
      {
        name: "Sarah Chen",
        businessName: "Zenith Wellness Spa",
        phone: "+1 (555) 201-0002",
        email: "sarah@zenithspa.com",
        serviceType: "Website Design",
        pipelineStage: "Mockup Needed",
        tags: "priority",
        assignedTo: users[1].id,
        notes: "Wants a modern, calming website design.",
        source: "referral",
        status: "active",
      },
      {
        name: "David Rodriguez",
        businessName: "El Fuego Mexican Grill",
        phone: "+1 (555) 201-0003",
        email: "david@elfuego.com",
        serviceType: "Branding",
        pipelineStage: "Mockup Sent",
        tags: "",
        assignedTo: users[0].id,
        notes: "Logo mockup sent on Monday. Waiting for feedback.",
        source: "manual",
        status: "active",
      },
      {
        name: "Amanda Foster",
        businessName: "Foster Law Group",
        phone: "+1 (555) 201-0004",
        email: "amanda@fosterlaw.com",
        serviceType: "Full Package",
        pipelineStage: "Engaged",
        tags: "hot_lead",
        assignedTo: users[1].id,
        notes: "Very engaged, wants to move fast. Budget approved.",
        source: "referral",
        status: "active",
      },
      {
        name: "James Wilson",
        businessName: "Wilson Construction",
        phone: "+1 (555) 201-0005",
        email: "james@wilsonconstruct.com",
        serviceType: "Social Media Management",
        pipelineStage: "Video Sent",
        tags: "",
        assignedTo: users[0].id,
        notes: "Explainer video sent. Follow up next week.",
        source: "manual",
        status: "active",
      },
      {
        name: "Lisa Park",
        businessName: "Bloom Flower Studio",
        phone: "+1 (555) 201-0006",
        email: "lisa@bloomflowers.com",
        serviceType: "Branding + Website",
        pipelineStage: "Proof Stage",
        tags: "",
        assignedTo: users[1].id,
        notes: "Reviewing final proofs. Minor revisions expected.",
        source: "manual",
        status: "active",
      },
      {
        name: "Robert Kim",
        businessName: "TechStart Solutions",
        phone: "+1 (555) 201-0007",
        email: "robert@techstart.io",
        serviceType: "Full Package",
        pipelineStage: "Hot Lead",
        tags: "hot_lead,enterprise",
        assignedTo: users[0].id,
        notes: "Enterprise client. High budget. Ready to close.",
        source: "ghl_webhook",
        status: "active",
      },
      {
        name: "Maria Gonzalez",
        businessName: "La Casa Real Estate",
        phone: "+1 (555) 201-0008",
        email: "maria@lacasa.com",
        serviceType: "Social Media + PPC",
        pipelineStage: "Call Scheduled",
        tags: "",
        assignedTo: users[1].id,
        notes: "Discovery call scheduled for Thursday at 2 PM.",
        source: "manual",
        status: "active",
      },
      {
        name: "Tom Bradley",
        businessName: "Bradley Fitness",
        phone: "+1 (555) 201-0009",
        email: "tom@bradleyfitness.com",
        serviceType: "Branding",
        pipelineStage: "Closed Won",
        tags: "retention",
        assignedTo: users[0].id,
        notes: "Signed contract. Project starting next month.",
        source: "referral",
        status: "active",
      },
      {
        name: "Nina Patel",
        businessName: "Curry House Restaurant",
        phone: "+1 (555) 201-0010",
        email: "nina@curryhouse.com",
        serviceType: "Website Redesign",
        pipelineStage: "Closed Lost",
        tags: "",
        assignedTo: users[1].id,
        notes: "Went with a competitor. Follow up in 6 months.",
        source: "manual",
        status: "active",
      },
    ];

    // Create leads with staggered dates
    const leads = [];
    for (let i = 0; i < leadsData.length; i++) {
      const daysAgo = i * 2;
      const lead = await db.lead.create({
        data: {
          ...leadsData[i],
          createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
          lastActivityAt: new Date(Date.now() - (i % 5) * 24 * 60 * 60 * 1000),
        },
      });
      leads.push(lead);
    }

    // Seed Tasks
    const tasksData = [
      {
        title: "Create logo concepts for Johnson Auto Detailing",
        description: "Design 3 logo concepts based on initial brief",
        type: "mockup",
        priority: "high",
        status: "pending",
        assignedTo: users[0].id,
        leadId: leads[0].id,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
      {
        title: "Follow up with Sarah Chen on mockup feedback",
        description: "She received the mockup 2 days ago, need to check in",
        type: "follow_up",
        priority: "medium",
        status: "in_progress",
        assignedTo: users[1].id,
        leadId: leads[1].id,
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      },
      {
        title: "Schedule discovery call with Maria Gonzalez",
        description: "Thursday at 2 PM - prepare pitch deck",
        type: "call",
        priority: "high",
        status: "pending",
        assignedTo: users[1].id,
        leadId: leads[7].id,
        dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      },
      {
        title: "Review final proofs for Bloom Flower Studio",
        description: "Check all files are print-ready and web-optimized",
        type: "review",
        priority: "urgent",
        status: "in_progress",
        assignedTo: users[1].id,
        leadId: leads[5].id,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
      {
        title: "Prepare contract for Robert Kim - TechStart",
        description: "Full package deal - branding, web, social media, PPC",
        type: "general",
        priority: "urgent",
        status: "pending",
        assignedTo: users[0].id,
        leadId: leads[6].id,
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      },
    ];

    const tasks = await Promise.all(
      tasksData.map((task) =>
        db.task.create({
          data: task,
        })
      )
    );

    // Seed Projects
    const projects = await Promise.all([
      db.project.create({
        data: {
          leadId: leads[8].id,
          clientName: "Tom Bradley",
          businessName: "Bradley Fitness",
          currentPhase: "foundation",
          currentStep: 7,
          actionRequired: true,
          actionMessage: "Awaiting brand asset delivery from client",
          status: "active",
        },
      }),
      db.project.create({
        data: {
          clientName: "Lisa Park",
          businessName: "Bloom Flower Studio",
          currentPhase: "handover",
          currentStep: 2,
          actionRequired: false,
          actionMessage: "",
          status: "active",
        },
      }),
    ]);

    // Seed Settings
    const settingsData = [
      { key: "business_name", value: "NXL BYLDR", type: "string" },
      { key: "auto_archive_days", value: "30", type: "number" },
      { key: "email_notifications", value: "true", type: "boolean" },
      { key: "default_assigned_to", value: users[0].id, type: "string" },
      { key: "pipeline_stages", value: JSON.stringify([
        "New Lead", "Mockup Needed", "Mockup Sent", "Engaged",
        "Video Sent", "Proof Stage", "Hot Lead", "Call Scheduled",
        "Closed Won", "Closed Lost", "Retention",
      ]), type: "json" },
      { key: "stuck_lead_days", value: "3", type: "number" },
      { key: "webhook_secret", value: "nxl-bylder-secret-key-2024", type: "string" },
    ];

    await Promise.all(
      settingsData.map((setting) =>
        db.setting.create({ data: setting })
      )
    );

    // Seed Activities
    const activitiesData = [
      {
        type: "lead_created",
        message: "New lead created: Robert Kim (TechStart Solutions)",
        userId: users[0].id,
        leadId: leads[6].id,
      },
      {
        type: "stage_changed",
        message: 'Amanda Foster moved from "Engaged" to "Hot Lead"',
        userId: users[1].id,
        leadId: leads[3].id,
        metadata: JSON.stringify({ previousStage: "Engaged", newStage: "Hot Lead" }),
      },
      {
        type: "task_created",
        message: 'Task "Create logo concepts for Johnson Auto Detailing" created',
        userId: users[0].id,
        leadId: leads[0].id,
        taskId: tasks[0].id,
      },
      {
        type: "mockup_sent",
        message: "Logo mockup sent to David Rodriguez (El Fuego Mexican Grill)",
        userId: users[0].id,
        leadId: leads[2].id,
      },
      {
        type: "hot_lead",
        message: "Robert Kim (TechStart Solutions) flagged as Hot Lead - Enterprise client",
        userId: users[0].id,
        leadId: leads[6].id,
      },
      {
        type: "call_scheduled",
        message: "Discovery call scheduled with Maria Gonzalez (La Casa Real Estate)",
        userId: users[1].id,
        leadId: leads[7].id,
      },
      {
        type: "task_completed",
        message: "Initial brand audit completed for Bradley Fitness",
        userId: users[0].id,
        leadId: leads[8].id,
        taskId: null,
      },
      {
        type: "note_added",
        message: "Follow-up note added for James Wilson (Wilson Construction)",
        userId: users[0].id,
        leadId: leads[4].id,
      },
      {
        type: "lead_created",
        message: "New lead from GHL webhook: Robert Kim (TechStart Solutions)",
        userId: null,
        leadId: leads[6].id,
        metadata: JSON.stringify({ source: "ghl_webhook" }),
      },
      {
        type: "stage_changed",
        message: 'Lisa Park moved from "Mockup Sent" to "Proof Stage"',
        userId: users[1].id,
        leadId: leads[5].id,
        metadata: JSON.stringify({ previousStage: "Mockup Sent", newStage: "Proof Stage" }),
      },
      {
        type: "task_created",
        message: "Follow-up task created for Sarah Chen (Zenith Wellness Spa)",
        userId: users[1].id,
        leadId: leads[1].id,
        taskId: tasks[1].id,
      },
      {
        type: "stage_changed",
        message: 'Tom Bradley moved from "Hot Lead" to "Closed Won"',
        userId: users[0].id,
        leadId: leads[8].id,
        metadata: JSON.stringify({ previousStage: "Hot Lead", newStage: "Closed Won" }),
      },
      {
        type: "lead_created",
        message: "New lead created: Nina Patel (Curry House Restaurant)",
        userId: users[1].id,
        leadId: leads[9].id,
      },
      {
        type: "stage_changed",
        message: 'Nina Patel moved from "Engaged" to "Closed Lost"',
        userId: users[1].id,
        leadId: leads[9].id,
        metadata: JSON.stringify({ previousStage: "Engaged", newStage: "Closed Lost" }),
      },
      {
        type: "task_created",
        message: "Urgent: Prepare contract for Robert Kim - TechStart Solutions",
        userId: users[0].id,
        leadId: leads[6].id,
        taskId: tasks[4].id,
      },
    ];

    // Create activities with staggered timestamps
    for (let i = 0; i < activitiesData.length; i++) {
      await db.activity.create({
        data: {
          ...activitiesData[i],
          createdAt: new Date(Date.now() - (activitiesData.length - i) * 2 * 60 * 60 * 1000),
        },
      });
    }

    return NextResponse.json({
      message: "Database seeded successfully!",
      seeded: true,
      summary: {
        users: users.length,
        leads: leads.length,
        tasks: tasks.length,
        projects: projects.length,
        settings: settingsData.length,
        activities: activitiesData.length,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Failed to seed database", details: String(error) },
      { status: 500 }
    );
  }
}
