'use client'

import { useState, useEffect } from 'react'
import { formatDuration } from '@/lib/utils'

interface FocusTimerProps {
  duration: number // in minutes
  isActive: boolean
  isPaused: boolean
}

export function FocusTimer({ duration, isActive, isPaused }: FocusTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration * 60)

  useEffect(() => {
    setTimeLeft(duration * 60)
  }, [duration])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isActive && !isPaused && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1)
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isActive, isPaused, timeLeft])

  const progress = ((duration * 60 - timeLeft) / (duration * 60)) * 100

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-48">
        {/* Background circle */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="96"
            cy="96"
            r="88"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-muted"
          />
          {/* Progress circle */}
          <circle
            cx="96"
            cy="96"
            r="88"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={2 * Math.PI * 88}
            strokeDashoffset={2 * Math.PI * 88 * (1 - progress / 100)}
            className="text-primary transition-all duration-1000 ease-linear"
            strokeLinecap="round"
          />
        </svg>
        
        {/* Timer text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold tabular-nums">
            {formatDuration(timeLeft)}
          </span>
          <span className="text-sm text-muted-foreground mt-1">
            {isPaused ? 'Paused' : isActive ? 'Focusing...' : 'Ready'}
          </span>
        </div>
      </div>
    </div>
  )
}
