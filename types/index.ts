import { Role, SessionStatus } from "@prisma/client"

export interface User {
  id: string
  email: string
  name?: string | null
  image?: string | null
  role: Role
}

export interface FocusSession {
  id: string
  userId: string
  startedAt: Date
  endedAt?: Date | null
  duration: number
  actualDuration?: number | null
  status: SessionStatus
  blinkCount: number
  yawnCount: number
  lookAwayCount: number
  distractionTime: number
  focusScore?: number | null
  recommendations: string[]
  createdAt: Date
  updatedAt: Date
}

export interface FocusMetric {
  id: string
  sessionId: string
  timestamp: Date
  isBlinking: boolean
  isYawning: boolean
  isLookingAway: boolean
  headRotationX?: number | null
  headRotationY?: number | null
  headRotationZ?: number | null
  focusLevel: number
}

export interface ChatMessage {
  id: string
  userId: string
  role: 'user' | 'assistant'
  content: string
  createdAt: Date
}

export interface FocusMetricsData {
  blinkCount: number
  yawnCount: number
  lookAwayCount: number
  distractionTime: number
  currentFocusLevel: number
}

export interface FocusDetectionState {
  isBlinking: boolean
  isYawning: boolean
  isLookingAway: boolean
  blinkCount: number
  yawnCount: number
  lookAwayCount: number
  distractionStartTime: number | null
  totalDistractionTime: number
}

export interface FaceLandmarks {
  x: number
  y: number
  z: number
}

export type NextAuthUser = User & {
  role: Role
}