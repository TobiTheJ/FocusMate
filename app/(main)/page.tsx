'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Brain, Clock, TrendingUp, Calendar, Eye, Frown, AlertCircle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { getSpecificRecommendations } from '@/lib/utils'
import useSWR from 'swr'

interface FocusSession {
  id: string
  startedAt: string
  endedAt: string | null
  actualDuration: number | null
  focusScore: number | null
  blinkCount: number
  yawnCount: number
  lookAwayCount: number
  distractionTime: number
}

interface DashboardData {
  totalSessions: number
  avgScore: number
  totalDuration: number
  sessions: FocusSession[]
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function SessionItem({ session }: { session: FocusSession }) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const recommendations = getSpecificRecommendations(
    session.blinkCount,
    session.yawnCount,
    session.lookAwayCount,
    session.actualDuration || 0
  )
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'blink': return <Eye className="h-4 w-4" />
      case 'yawn': return <Frown className="h-4 w-4" />
      case 'lookAway': return <AlertCircle className="h-4 w-4" />
      case 'good': return <CheckCircle className="h-4 w-4" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }
  
  const getColor = (type: string) => {
    switch (type) {
      case 'blink': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'yawn': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'lookAway': return 'text-red-600 bg-red-50 border-red-200'
      case 'good': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }
  
  return (
    <div className="border rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full ${
            (session.focusScore || 0) >= 80 ? 'bg-green-500' :
            (session.focusScore || 0) >= 60 ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
          <div>
            <p className="font-medium">
              {new Date(session.startedAt).toLocaleDateString('vi-VN')}
            </p>
            <p className="text-sm text-muted-foreground">
              {Math.floor((session.actualDuration || 0) / 60)} phút • 
              {session.blinkCount} nháy • 
              {session.yawnCount} ngáp • 
              {session.lookAwayCount} lần nhìn đi
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-2xl font-bold">{session.focusScore?.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Điểm tập trung</p>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </div>
      
      {isExpanded && (
        <div className="px-4 pb-4 border-t bg-gray-50/50">
          <div className="pt-4 space-y-3">
            <h4 className="font-semibold text-sm text-gray-700">Phân tích & Lời khuyên:</h4>
            {recommendations.map((rec, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border ${getColor(rec.type)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getIcon(rec.type)}</div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{rec.message}</p>
                    <p className="text-sm mt-1 opacity-90">{rec.tip}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { data, error, isLoading } = useSWR<DashboardData>('/api/dashboard', fetcher, {
    refreshInterval: 5000, // Refresh every 5 seconds
  })
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-gray-200 rounded" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }
  
  if (error || !data) {
    return (
      <div className="space-y-6">
        <p className="text-red-500">Không thể tải dữ liệu. Vui lòng thử lại sau.</p>
      </div>
    )
  }
  
  const { totalSessions, avgScore, totalDuration, sessions } = data
  
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Theo dõi tiến độ tập trung của bạn
          </p>
        </div>
        <Link href="/focus">
          <Button size="lg" className="gap-2">
            <Brain className="h-5 w-5" />
            Bắt đầu Session mới
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng số Session</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSessions}</div>
            <p className="text-xs text-muted-foreground">
              Session đã hoàn thành
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Điểm trung bình</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgScore.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Trên thang điểm 100
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng thời gian</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.floor(totalDuration / 3600)}h {Math.floor((totalDuration % 3600) / 60)}m
            </div>
            <p className="text-xs text-muted-foreground">
              Thời gian tập trung
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hiệu suất</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgScore >= 80 ? 'Tuyệt vời' : avgScore >= 60 ? 'Tốt' : 'Cần cải thiện'}
            </div>
            <p className="text-xs text-muted-foreground">
              Đánh giá hiện tại
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Lịch sử Session</CardTitle>
          <CardDescription>Nhấn vào mỗi session để xem phân tích chi tiết và lời khuyên</CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Chưa có session nào. Hãy bắt đầu session đầu tiên!</p>
              <Link href="/focus">
                <Button>Bắt đầu ngay</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session: FocusSession) => (
                <SessionItem key={session.id} session={session} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
