import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get total sessions count
    const totalSessions = await prisma.focusSession.count({
      where: {
        userId: session.user.id,
        status: 'COMPLETED',
      },
    })

    // Get recent sessions with all metrics
    const sessions = await prisma.focusSession.findMany({
      where: {
        userId: session.user.id,
        status: 'COMPLETED',
      },
      orderBy: {
        startedAt: 'desc',
      },
      take: 10,
      select: {
        id: true,
        startedAt: true,
        endedAt: true,
        actualDuration: true,
        focusScore: true,
        blinkCount: true,
        yawnCount: true,
        lookAwayCount: true,
        distractionTime: true,
      },
    })

    // Calculate average score
    const avgScore = sessions.length > 0
      ? sessions.reduce((acc, s) => acc + (s.focusScore || 0), 0) / sessions.length
      : 0

    // Calculate total duration
    const totalDuration = sessions.reduce((acc, s) => acc + (s.actualDuration || 0), 0)

    return NextResponse.json({
      totalSessions,
      avgScore,
      totalDuration,
      sessions,
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
