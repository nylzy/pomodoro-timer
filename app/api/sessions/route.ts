import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

// GET - Fetch user's session history
export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get or create user
    let user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        sessions: {
          orderBy: { date: 'asc' }
        },
        settings: true
      }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          clerkId: userId,
          settings: {
            create: {
              workDuration: 25,
              breakDuration: 5
            }
          }
        },
        include: {
          sessions: true,
          settings: true
        }
      });
    }

    // Group sessions by date and sum minutes
    const sessionsByDate = user.sessions.reduce((acc: any, session: any) => {
      const existing = acc.find((s: any) => s.date === session.date);
      if (existing) {
        existing.sessions += 1;
        existing.totalMinutes += session.minutes;
      } else {
        acc.push({
          date: session.date,
          sessions: 1,
          totalMinutes: session.minutes
        });
      }
      return acc;
    }, []);

    return NextResponse.json({
      sessionHistory: sessionsByDate,
      settings: user.settings || { workDuration: 25, breakDuration: 5 },
      totalSessions: user.sessions.length
    });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}

// POST - Save a completed session
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { minutes } = await request.json();
    const today = new Date().toISOString().split('T')[0];

    // Get or create user
    let user = await prisma.user.findUnique({
      where: { clerkId: userId }
    });

    if (!user) {
      user = await prisma.user.create({
        data: { clerkId: userId }
      });
    }

    // Create session
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        date: today,
        minutes: minutes
      }
    });

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error("Error saving session:", error);
    return NextResponse.json({ error: "Failed to save session" }, { status: 500 });
  }
}