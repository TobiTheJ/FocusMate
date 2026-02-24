import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateFocusScore, getRecommendations } from "@/lib/utils"
import { z } from "zod"

const endSchema = z.object({
  sessionId: z.string().uuid(),
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
    const { sessionId } = endSchema.parse(body)

    // Verify session belongs to user
    const focusSession = await prisma.focusSession.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id,
      },
    })

    if (!focusSession) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      )
    }

    if (focusSession.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Session already completed" },
        { status: 400 }
      )
    }

    const now = new Date()
    const actualDuration = Math.floor(
      (now.getTime() - new Date(focusSession.startedAt).getTime()) / 1000
    )

    // Calculate focus score
    const focusScore = calculateFocusScore(
      actualDuration,
      focusSession.blinkCount,
      focusSession.yawnCount,
      focusSession.lookAwayCount,
      focusSession.distractionTime
    )

    const recommendations = getRecommendations(focusScore)

    // Update session
    const updatedSession = await prisma.focusSession.update({
      where: { id: sessionId },
      data: {
        status: "COMPLETED",
        endedAt: now,
        actualDuration,
        focusScore,
        recommendations,
      },
    })

    return NextResponse.json({
      sessionId: updatedSession.id,
      focusScore,
      duration: actualDuration,
      blinkCount: updatedSession.blinkCount,
      yawnCount: updatedSession.yawnCount,
      lookAwayCount: updatedSession.lookAwayCount,
      distractionTime: updatedSession.distractionTime,
      recommendations,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error ending focus session:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}