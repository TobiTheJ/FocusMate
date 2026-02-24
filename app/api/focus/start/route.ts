import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const startSchema = z.object({
  duration: z.number().min(1).max(120).default(25),
})

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { duration } = startSchema.parse(body)

    // Check for existing active session
    const existingSession = await prisma.focusSession.findFirst({
      where: {
        userId: session.user.id,
        status: "ACTIVE",
      },
    })

    if (existingSession) {
      return NextResponse.json(
        { error: "Already have an active session", sessionId: existingSession.id },
        { status: 400 }
      )
    }

    const focusSession = await prisma.focusSession.create({
      data: {
        userId: session.user.id,
        duration,
        status: "ACTIVE",
      },
    })

    return NextResponse.json({
      sessionId: focusSession.id,
      startedAt: focusSession.startedAt,
      duration: focusSession.duration,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error starting focus session:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}