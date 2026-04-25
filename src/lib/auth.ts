import { db } from "@/lib/db";

// ═══════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════

export const SUPER_ADMIN_EMAILS = [
  "info.vsualdm@gmail.com",
  "geovsualdm@gmail.com",
] as const;

export const MASTER_PASSWORD = "VSUAL@NX$260&";

export const PIPELINE_STAGES = [
  "New Lead",
  "Mockup Needed",
  "Mockup Sent",
  "Engaged",
  "Video Sent",
  "Proof Stage",
  "Hot Lead",
  "Call Scheduled",
  "Closed Won",
  "Closed Lost",
  "Retention",
] as const;

export const PROJECT_PHASES = {
  handover: { label: "Handover", steps: [1, 2, 3] },
  game_plan: { label: "Game Plan", steps: [4, 5, 6] },
  foundation: { label: "Foundation", steps: [7, 8, 9, 10] },
  live: { label: "Live", steps: [11, 12, 13] },
} as const;

export const PROJECT_STEPS = [
  { stepNumber: 1, title: "Client Questionnaire", description: "Send and receive completed client onboarding questionnaire", phase: "handover" },
  { stepNumber: 2, title: "Brand Asset Collection", description: "Collect logos, brand colors, fonts, and existing brand materials", phase: "handover" },
  { stepNumber: 3, title: "Account Access Handover", description: "Receive access to hosting, domains, social accounts, and third-party tools", phase: "handover" },
  { stepNumber: 4, title: "Sitemap & IA", description: "Create site architecture and information hierarchy", phase: "game_plan" },
  { stepNumber: 5, title: "Wireframes", description: "Design wireframes for key pages and user flows", phase: "game_plan" },
  { stepNumber: 6, title: "Content Strategy", description: "Plan content structure, copy direction, and media requirements", phase: "game_plan" },
  { stepNumber: 7, title: "Homepage Design", description: "Design the homepage with hero, features, testimonials, and CTA sections", phase: "foundation" },
  { stepNumber: 8, title: "Inner Pages Design", description: "Design all inner pages including about, services, and contact", phase: "foundation" },
  { stepNumber: 9, title: "Development Build", description: "Code the website with responsive design and CMS integration", phase: "foundation" },
  { stepNumber: 10, title: "QA & Revisions", description: "Quality assurance testing, cross-browser checks, and client revisions", phase: "foundation" },
  { stepNumber: 11, title: "Content Population", description: "Add all final copy, images, videos, and other content", phase: "live" },
  { stepNumber: 12, title: "SEO & Analytics Setup", description: "Configure SEO metadata, Google Analytics, Search Console, and sitemaps", phase: "live" },
  { stepNumber: 13, title: "Launch & Handoff", description: "Go live, final walkthrough, training, and documentation handoff", phase: "live" },
] as const;

// ═══════════════════════════════════════════════════════
// Session helpers
// ═══════════════════════════════════════════════════════

export async function validateSession(token: string) {
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } });
    return null;
  }

  if (!session.user.isActive) return null;

  // Extend session on each validation (sliding expiry: 7 days)
  await db.session.update({
    where: { id: session.id },
    data: { expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });

  return session.user;
}

export async function requireSuperAdmin(token: string) {
  const user = await validateSession(token);
  if (!user) return null;
  if (user.role !== "super_admin") return null;
  return user;
}

// ═══════════════════════════════════════════════════════
// Token extraction
// ═══════════════════════════════════════════════════════

export function extractToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

// ═══════════════════════════════════════════════════════
// Activity logging
// ═══════════════════════════════════════════════════════

export async function logActivity(
  type: string,
  message: string,
  metadata?: Record<string, unknown>,
  userId?: string,
  leadId?: string,
  portal?: string
) {
  try {
    await db.activity.create({
      data: {
        type,
        message,
        metadata: metadata ? JSON.stringify(metadata) : null,
        userId,
        leadId,
        portal,
      },
    });
  } catch {
    // Activity logging should never block the main operation
    console.error("Failed to log activity:", { type, message });
  }
}

// ═══════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════

export function getPhaseForStep(stepNumber: number): string {
  if (stepNumber <= 3) return "handover";
  if (stepNumber <= 6) return "game_plan";
  if (stepNumber <= 10) return "foundation";
  return "live";
}

export function jsonResponse(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export function errorResponse(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
