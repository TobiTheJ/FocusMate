import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
})

/**
 * Trợ Lý Tập Trung Thông Minh (Context-Aware Focus Assistant)
 * 
 * Chatbot này truy xuất dữ liệu phiên tập trung của người dùng để đưa ra
 * các gợi ý cá nhân hóa về thói quen tập trung, lịch học và năng suất.
 * 
 * LƯU Ý: Lịch sử chat KHÔNG được lưu vào database để đảm bảo quyền riêng tư.
 * Mỗi cuộc trò chuyện bắt đầu mới khi widget được mở lại.
 */

// Types cho context người dùng
interface UserFocusContext {
  totalSessions: number
  totalFocusTime: number // tính bằng phút
  averageScore: number
  recentSessions: Array<{
    id: string
    duration: number
    focusScore: number | null
    startedAt: Date
    metrics: {
      blinkCount: number
      yawnCount: number
      lookAwayCount: number
      distractionTime: number
    }
  }>
  patterns: {
    bestFocusTime: string | null
    commonDistractions: string[]
    averageSessionLength: number
  }
}

// Xây dựng context từ database
async function buildUserContext(userId: string): Promise<UserFocusContext> {
  // Lấy tất cả phiên tập trung đã hoàn thành của người dùng
  const sessions = await prisma.focusSession.findMany({
    where: {
      userId,
      status: "COMPLETED",
    },
    orderBy: {
      startedAt: "desc",
    },
    take: 30, // 30 phiên gần nhất cho context
  })

  const totalSessions = sessions.length
  
  // Tính tổng thời gian tập trung
  const totalFocusTime = sessions.reduce((acc, session) => {
    return acc + (session.duration || 0)
  }, 0)

  // Tính điểm trung bình
  const sessionsWithScore = sessions.filter(s => s.focusScore !== null)
  const averageScore = sessionsWithScore.length > 0
    ? sessionsWithScore.reduce((acc, s) => acc + (s.focusScore || 0), 0) / sessionsWithScore.length
    : 0

  // Format các phiên gần đây
  const recentSessions = sessions.slice(0, 10).map(session => ({
    id: session.id,
    duration: session.duration,
    focusScore: session.focusScore,
    startedAt: session.startedAt,
    metrics: {
      blinkCount: session.blinkCount || 0,
      yawnCount: session.yawnCount || 0,
      lookAwayCount: session.lookAwayCount || 0,
      distractionTime: session.distractionTime || 0,
    },
  }))

  // Phân tích patterns
  const patterns = analyzePatterns(sessions)

  return {
    totalSessions,
    totalFocusTime,
    averageScore: Math.round(averageScore),
    recentSessions,
    patterns,
  }
}

// Phân tích patterns từ các phiên
function analyzePatterns(sessions: any[]) {
  if (sessions.length === 0) {
    return {
      bestFocusTime: null,
      commonDistractions: [],
      averageSessionLength: 0,
    }
  }

  // Tìm thời gian tập trung tốt nhất theo giờ trong ngày
  const hourScores: Record<number, number[]> = {}
  sessions.forEach(session => {
    const hour = new Date(session.startedAt).getHours()
    if (!hourScores[hour]) hourScores[hour] = []
    if (session.focusScore) hourScores[hour].push(session.focusScore)
  })

  let bestHour: number | null = null
  let bestAvgScore = 0
  
  Object.entries(hourScores).forEach(([hour, scores]) => {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    if (avg > bestAvgScore) {
      bestAvgScore = avg
      bestHour = parseInt(hour)
    }
  })

  const bestFocusTime = bestHour !== null 
    ? `${bestHour}:00 - ${bestHour + 1}:00` 
    : null

  // Xác định các yếu tố gây mất tập trung phổ biến
  const distractions: string[] = []
  const totalYawns = sessions.reduce((acc, s) => acc + (s.yawnCount || 0), 0)
  const totalLookAways = sessions.reduce((acc, s) => acc + (s.lookAwayCount || 0), 0)
  const totalDistractionTime = sessions.reduce((acc, s) => acc + (s.distractionTime || 0), 0)

  if (totalYawns > sessions.length * 2) distractions.push("mệt mỏi (ngáp nhiều)")
  if (totalLookAways > sessions.length * 5) distractions.push("nhìn ra khỏi màn hình")
  if (totalDistractionTime > sessions.length * 60) distractions.push("thời gian mất tập trung kéo dài")

  // Độ dài phiên trung bình
  const averageSessionLength = Math.round(
    sessions.reduce((acc, s) => acc + s.duration, 0) / sessions.length
  )

  return {
    bestFocusTime,
    commonDistractions: distractions,
    averageSessionLength,
  }
}

// Xây dựng prompt hệ thống với context tiếng Việt
function buildSystemPrompt(context: UserFocusContext): string {
  const hasData = context.totalSessions > 0

  let contextSection = ""
  if (hasData) {
    contextSection = `
DỮ LIỆU TẬP TRUNG CỦA NGƯỜI DÙNG:
- Tổng số phiên: ${context.totalSessions}
- Tổng thời gian tập trung: ${Math.round(context.totalFocusTime / 60)} giờ ${context.totalFocusTime % 60} phút
- Điểm tập trung trung bình: ${context.averageScore}/100
- Thời gian tập trung tốt nhất: ${context.patterns.bestFocusTime || "Chưa xác định"}
- Độ dài phiên trung bình: ${context.patterns.averageSessionLength} phút
- Yếu tố gây mất tập trung: ${context.patterns.commonDistractions.length > 0 ? context.patterns.commonDistractions.join(", ") : "Không phát hiện"}

CÁC PHIÊN GẦN ĐÂY (${context.recentSessions.length} phiên):
${context.recentSessions.map((s, i) => 
  `${i + 1}. ${new Date(s.startedAt).toLocaleDateString('vi-VN')}: ${s.duration}phút, Điểm: ${s.focusScore || "N/A"}, Chớp mắt: ${s.metrics.blinkCount}, Ngáp: ${s.metrics.yawnCount}, Nhìn ra: ${s.metrics.lookAwayCount}`
).join("\n")}
`
  } else {
    contextSection = `
DỮ LIỆU TẬP TRUNG CỦA NGƯỜI DÙNG:
- Người dùng mới, chưa có phiên tập trung nào
- Khuyến khích họ bắt đầu phiên tập trung đầu tiên
`
  }

  return `Bạn là FocusMate AI - trợ lý tập trung và năng suất cá nhân.

VAI TRÒ CỦA BẠN:
1. Phân tích dữ liệu tập trung của người dùng để đưa ra gợi ý cá nhân hóa
2. Gợi ý lịch học/làm việc tối ưu dựa trên patterns của họ
3. Xác định điểm cần cải thiện trong thói quen tập trung
4. Trả lời câu hỏi về kỹ thuật tập trung, quản lý thời gian, năng suất
5. Động viên và khuyến khích dựa trên tiến bộ của họ

${contextSection}

HƯỚNG DẪN:
- Luôn tham chiếu dữ liệu thực tế của người dùng khi đưa ra lời khuyên
- Khi họ hỏi về hiệu suất, trích dẫn số liệu cụ thể từ các phiên của họ
- Đề xuất cải tiến cụ thể dựa trên patterns mất tập trung
- Gợi ý thời gian học tối ưu dựa trên giờ tập trung tốt nhất
- Giữ câu trả lời ngắn gọn (3-5 câu)
- Dùng bullet points cho danh sách
- Vừa động viên vừa thẳng thắn về điểm cần cải thiện
- Nếu chưa có dữ liệu, hướng dẫn họ bắt đầu phiên tập trung đầu tiên

CÁCH HIỂU ĐIỂM TẬP TRUNG:
- 90-100: Tập trung xuất sắc
- 70-89: Tập trung tốt
- 50-69: Tập trung trung bình (cần cải thiện)
- Dưới 50: Cần chú ý (mất tập trung nhiều)

GIẢI THÍCH CÁC CHỈ SỐ:
- Số lần chớp mắt: Bình thường 15-20 lần/phút. Ít hơn = nhìn chằm chằm, nhiều hơn = mệt mỏi
- Số lần ngáp: Cho thấy thiếu ngủ hoặc mệt mỏi
- Số lần nhìn ra: Mức độ mất tập trung
- Thời gian mất tập trung: Tổng giây không nhìn màn hình

Trả lời bằng tiếng Việt thân thiện, chuyên nghiệp. Luôn dựa trên dữ liệu thực tế của người dùng.`
}

// Gọi Gemini API với context
async function callGeminiAPI(message: string, systemPrompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured")
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [{
            text: `${systemPrompt}\n\nTin nhắn của người dùng: ${message}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
          topP: 0.8,
          topK: 40,
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error: ${error}`)
  }

  const data = await response.json()
  
  if (data.error) {
    throw new Error(data.error.message || "Gemini API error")
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text || 
    "Xin lỗi, tôi không thể tạo phản hồi. Vui lòng thử lại."
}

// Fallback responses bằng tiếng Việt khi API không khả dụng
function getFallbackResponse(message: string, context: UserFocusContext): string {
  const lowerMsg = message.toLowerCase()
  
  if (lowerMsg.includes("score") || lowerMsg.includes("điểm") || lowerMsg.includes("tập trung")) {
    if (context.totalSessions === 0) {
      return "Bạn chưa hoàn thành phiên tập trung nào. Hãy bắt đầu phiên đầu tiên để nhận điểm tập trung! Điểm được tính dựa trên tần suất chớp mắt, ngáp và mất tập trung."
    }
    return `Điểm tập trung trung bình của bạn là ${context.averageScore}/100 dựa trên ${context.totalSessions} phiên. ${context.averageScore >= 70 ? "Làm tốt lắm!" : "Còn chỗ để cải thiện. Hãy thử giảm mất tập trung trong các phiên học."}`
  }
  
  if (lowerMsg.includes("schedule") || lowerMsg.includes("lịch") || lowerMsg.includes("thời gian")) {
    if (context.patterns.bestFocusTime) {
      return `Dựa trên dữ liệu, bạn tập trung tốt nhất vào khoảng ${context.patterns.bestFocusTime}. Tôi khuyên bạn nên sắp xếp các công việc quan trọng vào khung giờ này. Phiên học trung bình của bạn là ${context.patterns.averageSessionLength} phút.`
    }
    return "Hãy hoàn thành thêm vài phiên tập trung để tôi phân tích patterns và gợi ý lịch học tối ưu. Thử học vào các khung giờ khác nhau!"
  }
  
  if (lowerMsg.includes("distraction") || lowerMsg.includes("mất tập trung") || lowerMsg.includes("xao nhãng")) {
    if (context.patterns.commonDistractions.length > 0) {
      return `Tôi nhận thấy bạn thường bị mất tập trung bởi: ${context.patterns.commonDistractions.join(", ")}. Hãy thử nghỉ ngắn trước khi bắt đầu, và đảm bảo bạn đã ngủ đủ giấc.`
    }
    return "Bạn đang làm tốt việc duy trì tập trung! Hãy tiếp tục duy trì thói quen tốt này."
  }
  
  if (lowerMsg.includes("pomodoro") || lowerMsg.includes("cà chua")) {
    return `Kỹ thuật Pomodoro:
• Học 25 phút, nghỉ 5 phút
• Sau 4 pomodoro, nghỉ dài 15-30 phút
• Phiên học trung bình của bạn là ${context.patterns.averageSessionLength} phút - có thể điều chỉnh cho phù hợp`
  }
  
  if (lowerMsg.includes("ngủ") || lowerMsg.includes("sleep")) {
    return "Giấc ngủ rất quan trọng cho khả năng tập trung:\n• Ngủ 7-9 tiếng mỗi đêm\n• Lịch ngủ đều đặn\n• Tránh màn hình 1 tiếng trước khi ngủ\n• Nếu bạn ngáp nhiều trong phiên học, đó là dấu hiệu thiếu ngủ"
  }
  
  if (context.totalSessions === 0) {
    return "Chào mừng bạn đến với FocusMate! Tôi có thể giúp bạn xây dựng thói quen tập trung tốt hơn. Hãy bắt đầu phiên tập trung đầu tiên, sau đó hỏi tôi về tiến độ, thời gian học tối ưu, hoặc mẹo cải thiện!"
  }
  
  return `Bạn đã hoàn thành ${context.totalSessions} phiên với ${Math.round(context.totalFocusTime / 60)} giờ tập trung. Hỏi tôi về điểm tập trung, thời gian học tốt nhất, hoặc cách cải thiện năng suất nhé!`
}

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
    const { message } = chatSchema.parse(body)

    // Xây dựng context từ dữ liệu focus của người dùng
    const userContext = await buildUserContext(session.user.id)
    
    // Tạo system prompt với context
    const systemPrompt = buildSystemPrompt(userContext)

    // Lấy phản hồi từ Gemini hoặc fallback
    let reply: string
    
    if (process.env.GEMINI_API_KEY) {
      try {
        reply = await callGeminiAPI(message, systemPrompt)
      } catch (error) {
        console.error("Gemini API error:", error)
        reply = getFallbackResponse(message, userContext)
      }
    } else {
      reply = getFallbackResponse(message, userContext)
    }

    // LƯU Ý: Tin nhắn chat KHÔNG được lưu vào database
    // Mỗi cuộc trò chuyện bắt đầu mới khi widget được mở lại

    return NextResponse.json({
      reply,
      context: {
        totalSessions: userContext.totalSessions,
        averageScore: userContext.averageScore,
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error in chat:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// LƯU Ý: Endpoint GET đã bị xóa - lịch sử chat không được lưu trữ
// Mỗi cuộc trò chuyện bắt đầu mới khi người dùng mở widget chat
