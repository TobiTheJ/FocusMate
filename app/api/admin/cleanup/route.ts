import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * API endpoint để xóa dữ liệu thủ công (chỉ dành cho admin)
 * 
 * DELETE /api/admin/cleanup?type=focusSessions - Xóa tất cả focus sessions
 * DELETE /api/admin/cleanup?type=chatMessages - Xóa tất cả chat messages
 * DELETE /api/admin/cleanup?type=systemLogs - Xóa tất cả system logs
 * DELETE /api/admin/cleanup?type=all - Reset toàn bộ database (giữ lại users)
 * DELETE /api/admin/cleanup?type=full - Xóa TẤT CẢ kể cả users (phải đăng nhập lại)
 */

export async function DELETE(req: Request) {
  try {
    // Kiểm tra admin role
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type")

    if (!type) {
      return NextResponse.json(
        { error: "Missing type parameter. Valid types: focusSessions, chatMessages, systemLogs, all, full" },
        { status: 400 }
      )
    }

    const validTypes = ["focusSessions", "chatMessages", "systemLogs", "all", "full"]
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Valid types: ${validTypes.join(", ")}` },
        { status: 400 }
      )
    }

    const result: {
      success: boolean
      message: string
      deleted?: {
        focusSessions?: number
        focusMetrics?: number
        chatMessages?: number
        systemLogs?: number
        users?: number
        accounts?: number
        sessions?: number
        profiles?: number
        verificationTokens?: number
      }
      adminUser?: {
        id: string
        email: string
        name: string | null
      }
      timestamp: string
    } = {
      success: true,
      message: "",
      timestamp: new Date().toISOString(),
    }

    switch (type) {
      case "focusSessions": {
        // Xóa tất cả focus sessions (FocusMetric sẽ tự động xóa theo cascade)
        const deletedSessions = await prisma.focusSession.deleteMany({})
        
        result.message = `Deleted all focus sessions`
        result.deleted = {
          focusSessions: deletedSessions.count,
        }
        break
      }

      case "chatMessages": {
        // Xóa tất cả chat messages
        const deletedMessages = await prisma.chatMessage.deleteMany({})
        
        result.message = `Deleted all chat messages`
        result.deleted = {
          chatMessages: deletedMessages.count,
        }
        break
      }

      case "systemLogs": {
        // Xóa tất cả system logs
        const deletedLogs = await prisma.systemLog.deleteMany({})
        
        result.message = `Deleted all system logs`
        result.deleted = {
          systemLogs: deletedLogs.count,
        }
        break
      }

      case "all": {
        // Reset toàn bộ database nhưng giữ lại users
        // Xóa theo thứ tự để tránh lỗi foreign key
        
        // 1. Xóa FocusMetric trước (liên kết với FocusSession)
        const deletedMetrics = await prisma.focusMetric.deleteMany({})
        
        // 2. Xóa FocusSession
        const deletedSessions = await prisma.focusSession.deleteMany({})
        
        // 3. Xóa ChatMessage
        const deletedMessages = await prisma.chatMessage.deleteMany({})
        
        // 4. Xóa Profile
        const deletedProfiles = await prisma.profile.deleteMany({})
        
        // 5. Xóa SystemLog
        const deletedLogs = await prisma.systemLog.deleteMany({})
        
        // 6. Xóa các auth sessions và tokens
        const deletedAuthSessions = await prisma.session.deleteMany({})
        const deletedAccounts = await prisma.account.deleteMany({})
        const deletedTokens = await prisma.verificationToken.deleteMany({})
        
        result.message = `Database reset completed (users preserved)`
        result.deleted = {
          focusMetrics: deletedMetrics.count,
          focusSessions: deletedSessions.count,
          chatMessages: deletedMessages.count,
          profiles: deletedProfiles.count,
          systemLogs: deletedLogs.count,
          sessions: deletedAuthSessions.count,
          accounts: deletedAccounts.count,
          verificationTokens: deletedTokens.count,
        }
        break
      }

      case "full": {
        // Xóa TẤT CẢ kể cả users - cần đăng nhập lại sau khi xóa
        // Lưu thông tin admin trước khi xóa
        const adminUser = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { id: true, email: true, name: true },
        })
        
        // Xóa theo thứ tự để tránh lỗi foreign key
        
        // 1. Xóa FocusMetric
        const deletedMetrics = await prisma.focusMetric.deleteMany({})
        
        // 2. Xóa FocusSession
        const deletedSessions = await prisma.focusSession.deleteMany({})
        
        // 3. Xóa ChatMessage
        const deletedMessages = await prisma.chatMessage.deleteMany({})
        
        // 4. Xóa Profile
        const deletedProfiles = await prisma.profile.deleteMany({})
        
        // 5. Xóa SystemLog
        const deletedLogs = await prisma.systemLog.deleteMany({})
        
        // 6. Xóa các auth sessions và tokens
        const deletedAuthSessions = await prisma.session.deleteMany({})
        const deletedAccounts = await prisma.account.deleteMany({})
        const deletedTokens = await prisma.verificationToken.deleteMany({})
        
        // 7. Cuối cùng xóa tất cả users
        const deletedUsers = await prisma.user.deleteMany({})
        
        result.message = `Full database reset completed - All data including users deleted. You need to register again.`
        result.deleted = {
          focusMetrics: deletedMetrics.count,
          focusSessions: deletedSessions.count,
          chatMessages: deletedMessages.count,
          profiles: deletedProfiles.count,
          systemLogs: deletedLogs.count,
          sessions: deletedAuthSessions.count,
          accounts: deletedAccounts.count,
          verificationTokens: deletedTokens.count,
          users: deletedUsers.count,
        }
        result.adminUser = adminUser || undefined
        break
      }
    }

    // Log hành động cleanup
    await prisma.systemLog.create({
      data: {
        level: "WARN",
        message: `Admin cleanup executed: ${type}`,
        metadata: {
          adminId: session.user.id,
          adminEmail: session.user.email,
          type,
          deleted: result.deleted,
        },
      },
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Cleanup error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Cleanup failed",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint để kiểm tra số lượng records sẽ bị xóa (dry run)
 */
export async function GET(req: Request) {
  try {
    // Kiểm tra admin role
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type")

    // Đếm số lượng records hiện tại trong database
    const counts = {
      focusSessions: await prisma.focusSession.count(),
      focusMetrics: await prisma.focusMetric.count(),
      chatMessages: await prisma.chatMessage.count(),
      systemLogs: await prisma.systemLog.count(),
      users: await prisma.user.count(),
      accounts: await prisma.account.count(),
      sessions: await prisma.session.count(),
      profiles: await prisma.profile.count(),
      verificationTokens: await prisma.verificationToken.count(),
    }

    // Nếu có type, trả về thông tin cụ thể cho type đó
    if (type) {
      const validTypes = ["focusSessions", "chatMessages", "systemLogs", "all", "full"]
      if (!validTypes.includes(type)) {
        return NextResponse.json(
          { error: `Invalid type. Valid types: ${validTypes.join(", ")}` },
          { status: 400 }
        )
      }

      let willDelete: Partial<typeof counts> = {}

      switch (type) {
        case "focusSessions":
          willDelete = { focusSessions: counts.focusSessions, focusMetrics: counts.focusMetrics }
          break
        case "chatMessages":
          willDelete = { chatMessages: counts.chatMessages }
          break
        case "systemLogs":
          willDelete = { systemLogs: counts.systemLogs }
          break
        case "all":
          willDelete = {
            focusSessions: counts.focusSessions,
            focusMetrics: counts.focusMetrics,
            chatMessages: counts.chatMessages,
            profiles: counts.profiles,
            systemLogs: counts.systemLogs,
            sessions: counts.sessions,
            accounts: counts.accounts,
            verificationTokens: counts.verificationTokens,
          }
          break
        case "full":
          willDelete = { ...counts }
          break
      }

      return NextResponse.json({
        type,
        currentCounts: counts,
        willDelete,
        note: "This is a dry run. Use DELETE method to actually delete.",
        timestamp: new Date().toISOString(),
      })
    }

    // Trả về tổng quan nếu không có type
    return NextResponse.json({
      currentCounts: counts,
      availableTypes: [
        { type: "focusSessions", description: "Delete all focus sessions", willDelete: { focusSessions: counts.focusSessions, focusMetrics: counts.focusMetrics } },
        { type: "chatMessages", description: "Delete all chat messages", willDelete: { chatMessages: counts.chatMessages } },
        { type: "systemLogs", description: "Delete all system logs", willDelete: { systemLogs: counts.systemLogs } },
        { type: "all", description: "Reset database (keep users)", willDelete: { focusSessions: counts.focusSessions, focusMetrics: counts.focusMetrics, chatMessages: counts.chatMessages, profiles: counts.profiles, systemLogs: counts.systemLogs, sessions: counts.sessions, accounts: counts.accounts, verificationTokens: counts.verificationTokens } },
        { type: "full", description: "Delete ALL data including users", willDelete: counts },
      ],
      note: "Use DELETE method with ?type=<type> to delete. Use GET with ?type=<type> for dry run.",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Cleanup check error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check cleanup data",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
