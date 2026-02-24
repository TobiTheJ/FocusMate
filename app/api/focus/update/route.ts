import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateSchema = z.object({
  sessionId: z.string().uuid(),
  metrics: z.object({
    blinkCount: z.number().min(0).default(0),
    yawnCount: z.number().min(0).default(0),
    lookAwayCount: z.number().min(0).default(0),
    distractionTime: z.number().min(0).default(0),
    currentFocusLevel: z.number().min(0).max(100).default(100),
    isBlinking: z.boolean().default(false),
    isYawning: z.boolean().default(false),
    isLookingAway: z.boolean().default(false),
    headRotationX: z.number().optional(),
    headRotationY: z.number().optional(),
    headRotationZ: z.number().optional(),
  }),
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
    const { sessionId, metrics } = updateSchema.parse(body)

    // Verify session belongs to user
    const focusSession = await prisma.focusSession.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id,
        status: "ACTIVE",
      },
    })

    if (!focusSession) {
      return NextResponse.json(
        { error: "Session not found or not active" },
        { status: 404 }
      )
    }

    // Update session metrics
    await prisma.focusSession.update({
      where: { id: sessionId },
      data: {
        blinkCount: metrics.blinkCount,
        yawnCount: metrics.yawnCount,
        lookAwayCount: metrics.lookAwayCount,
        distractionTime: metrics.distractionTime,
      },
    })

    // Create metric record
    await prisma.focusMetric.create({
      data: {
        sessionId,
        isBlinking: metrics.isBlinking,
        isYawning: metrics.isYawning,
        isLookingAway: metrics.isLookingAway,
        headRotationX: metrics.headRotationX,
        headRotationY: metrics.headRotationY,
        headRotationZ: metrics.headRotationZ,
        focusLevel: metrics.currentFocusLevel,
      },
    })

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error updating focus session:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}