import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

// PUT - Update user settings
export async function PUT(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workDuration, breakDuration } = await request.json();

    // Get or create user
    let user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { settings: true }
    });

    if (!user) {
      user = await prisma.user.create({
        data: { clerkId: userId }
      });
    }

    // Update or create settings
    const settings = await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: { workDuration, breakDuration },
      create: {
        userId: user.id,
        workDuration,
        breakDuration
      }
    });

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}