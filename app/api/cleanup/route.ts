import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * API endpoint để xóa dữ liệu cũ hơn 1 ngày
 * Dùng cho môi trường demo - tự động cleanup dữ liệu
 */
export async function POST(request: NextRequest) {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Xóa SystemLog cũ hơn 1 ngày
    const deletedLogs = await prisma.systemLog.deleteMany({
      where: {
        createdAt: {
          lt: oneDayAgo,
        },
      },
    });

    // Xóa ChatMessage cũ hơn 1 ngày
    const deletedMessages = await prisma.chatMessage.deleteMany({
      where: {
        createdAt: {
          lt: oneDayAgo,
        },
      },
    });

    // Xóa FocusSession cũ hơn 1 ngày (FocusMetric sẽ tự động xóa theo cascade)
    const deletedSessions = await prisma.focusSession.deleteMany({
      where: {
        createdAt: {
          lt: oneDayAgo,
        },
      },
    });

    // Xóa Session (NextAuth) đã hết hạn hoặc cũ hơn 1 ngày
    const deletedAuthSessions = await prisma.session.deleteMany({
      where: {
        OR: [
          {
            expires: {
              lt: new Date(),
            },
          },
          {
            // Nếu có createdAt trong Session (tùy version NextAuth)
          },
        ],
      },
    });

    // Xóa VerificationToken đã hết hạn
    const deletedTokens = await prisma.verificationToken.deleteMany({
      where: {
        expires: {
          lt: new Date(),
        },
      },
    });

    // Xóa Account không còn liên kết với user nào (orphaned accounts)
    // và các account không hoạt động trong 1 ngày (nếu có thông tin)

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed successfully',
      deleted: {
        systemLogs: deletedLogs.count,
        chatMessages: deletedMessages.count,
        focusSessions: deletedSessions.count,
        authSessions: deletedAuthSessions.count,
        verificationTokens: deletedTokens.count,
      },
      cleanupTime: oneDayAgo.toISOString(),
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Cleanup failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint để kiểm tra dữ liệu sẽ bị xóa (dry run)
 */
export async function GET(request: NextRequest) {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Đếm số lượng records sẽ bị xóa
    const [
      systemLogsCount,
      chatMessagesCount,
      focusSessionsCount,
      expiredSessionsCount,
      expiredTokensCount,
    ] = await Promise.all([
      prisma.systemLog.count({
        where: { createdAt: { lt: oneDayAgo } },
      }),
      prisma.chatMessage.count({
        where: { createdAt: { lt: oneDayAgo } },
      }),
      prisma.focusSession.count({
        where: { createdAt: { lt: oneDayAgo } },
      }),
      prisma.session.count({
        where: { expires: { lt: new Date() } },
      }),
      prisma.verificationToken.count({
        where: { expires: { lt: new Date() } },
      }),
    ]);

    return NextResponse.json({
      willBeDeleted: {
        systemLogs: systemLogsCount,
        chatMessages: chatMessagesCount,
        focusSessions: focusSessionsCount,
        expiredAuthSessions: expiredSessionsCount,
        expiredVerificationTokens: expiredTokensCount,
      },
      cleanupThreshold: oneDayAgo.toISOString(),
      note: 'These records will be deleted when cleanup runs',
    });
  } catch (error) {
    console.error('Cleanup check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check cleanup data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
