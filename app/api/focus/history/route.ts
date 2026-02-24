import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get("limit") || "30")
    const offset = parseInt(searchParams.get("offset") || "0")

    const sessions = await prisma.focusSession.findMany({
      where: {
        userId: session.user.id,
        status: "COMPLETED",
      },
      orderBy: {
        startedAt: "desc",
      },
      take: limit,
      skip: offset,
      include: {
        metrics: {
          orderBy: {
            timestamp: "asc",
          },
        },
      },
    })

    const total = await prisma.focusSession.count({
      where: {
        userId: session.user.id,
        status: "COMPLETED",
      },
    })

    // Calculate statistics
    const avgScore = sessions.length > 0
      ? sessions.reduce((acc, s) => acc + (s.focusScore || 0), 0) / sessions.length
      : 0

    const totalDuration = sessions.reduce((acc, s) => acc + (s.actualDuration || 0), 0)

    return NextResponse.json({
      sessions,
      total,
      statistics: {
        avgScore: Math.round(avgScore * 10) / 10,
        totalSessions: sessions.length,
        totalDuration,
        totalBlinks: sessions.reduce((acc, s) => acc + s.blinkCount, 0),
        totalYawns: sessions.reduce((acc, s) => acc + s.yawnCount, 0),
      },
    })
  } catch (error) {
    console.error("Error fetching focus history:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}