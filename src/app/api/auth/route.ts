import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/auth - Login (accepts email + name, creates/returns user)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name } = body;

    if (!email || !name) {
      return NextResponse.json(
        { error: "Email and name are required" },
        { status: 400 }
      );
    }

    // Find or create user
    let user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      user = await db.user.create({
        data: {
          email: email.toLowerCase().trim(),
          name: name.trim(),
          role: "client",
        },
      });
    }

    // Update name if provided and different
    if (user.name !== name.trim()) {
      user = await db.user.update({
        where: { id: user.id },
        data: { name: name.trim() },
      });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Auth login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/auth - Get current users list
export async function GET() {
  try {
    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Auth GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
