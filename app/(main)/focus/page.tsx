'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { FaceDetector } from '@/components/focus/face-detector'
import { FocusTimer } from '@/components/focus/focus-timer'
import { FocusMetrics } from '@/components/focus/focus-metrics'
import { AlertCircle, Play, Pause, Square, Camera } from 'lucide-react'

interface FocusState {
  isActive: boolean
  isPaused: boolean
  sessionId: string | null
  duration: number
  metrics: {
    blinkCount: number
    yawnCount: number
    lookAwayCount: number
    distractionTime: number
    currentFocusLevel: number
  }
}

export default function FocusPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [state, setState] = useState<FocusState>({
    isActive: false,
    isPaused: false,
    sessionId: null,
    duration: 25,
    metrics: {
      blinkCount: 0,
      yawnCount: 0,
      lookAwayCount: 0,
      distractionTime: 0,
      currentFocusLevel: 100,
    },
  })

  const [showAlert, setShowAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')

  const startSession = async () => {
    try {
      const response = await fetch('/api/focus/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: state.duration }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to start session')
      }

      const data = await response.json()
      
      setState(prev => ({
        ...prev,
        isActive: true,
        isPaused: false,
        sessionId: data.sessionId,
        metrics: {
          blinkCount: 0,
          yawnCount: 0,
          lookAwayCount: 0,
          distractionTime: 0,
          currentFocusLevel: 100,
        },
      }))

      toast({
        title: 'Session Started',
        description: `Focus session started for ${state.duration} minutes`,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start session',
        variant: 'destructive',
      })
    }
  }

  const pauseSession = () => {
    setState(prev => ({ ...prev, isPaused: !prev.isPaused }))
    toast({
      title: state.isPaused ? 'Session Resumed' : 'Session Paused',
      description: state.isPaused ? 'Keep focusing!' : 'Take a moment to breathe',
    })
  }

  const endSession = async () => {
    if (!state.sessionId) return

    try {
      const response = await fetch('/api/focus/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: state.sessionId }),
      })

      if (!response.ok) {
        throw new Error('Failed to end session')
      }

      const data = await response.json()
      
      toast({
        title: 'Session Complete!',
        description: `Your focus score: ${data.focusScore.toFixed(0)}/100`,
      })

      router.push('/')
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to end session',
        variant: 'destructive',
      })
    }
  }

  const updateMetrics = useCallback(async (metrics: FocusState['metrics']) => {
    if (!state.sessionId || !state.isActive || state.isPaused) return

    setState(prev => ({ ...prev, metrics }))

    // Send metrics to server every 5 seconds
    if (Math.random() < 0.2) {
      try {
        await fetch('/api/focus/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: state.sessionId,
            metrics,
          }),
        })
      } catch (error) {
        console.error('Failed to update metrics:', error)
      }
    }
  }, [state.sessionId, state.isActive, state.isPaused])

  const handleDistraction = useCallback((type: 'blink' | 'yawn' | 'lookAway') => {
    if (!state.isActive || state.isPaused) return

    const messages = {
      blink: 'You blinked frequently. Take a moment to rest your eyes.',
      yawn: 'You seem tired. Consider taking a short break.',
      lookAway: 'Stay focused on your task!',
    }

    setAlertMessage(messages[type])
    setShowAlert(true)
    
    setTimeout(() => setShowAlert(false), 3000)
  }, [state.isActive, state.isPaused])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Focus Session</h1>
          <p className="text-muted-foreground">
            Stay focused and let AI track your concentration
          </p>
        </div>
        
        {!state.isActive && (
          <div className="flex items-center gap-4">
            <select
              value={state.duration}
              onChange={(e) => setState(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
              className="border rounded-md px-3 py-2"
            >
              <option value={15}>15 minutes</option>
              <option value={25}>25 minutes (Pomodoro)</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
            <Button onClick={startSession} size="lg" className="gap-2">
              <Play className="h-5 w-5" />
              Start Session
            </Button>
          </div>
        )}
      </div>

      {showAlert && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 rounded animate-in slide-in-from-top">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <p className="text-yellow-800">{alertMessage}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Camera Feed
            </CardTitle>
            <CardDescription>
              Position your face in the center of the frame
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FaceDetector
              isActive={state.isActive && !state.isPaused}
              sessionId={state.sessionId}
              onMetricsUpdate={updateMetrics}
              onDistraction={handleDistraction}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Timer</CardTitle>
              <CardDescription>
                {state.isActive 
                  ? state.isPaused ? 'Session paused' : 'Stay focused!'
                  : 'Ready to start?'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <FocusTimer
                duration={state.duration}
                isActive={state.isActive && !state.isPaused}
                isPaused={state.isPaused}
              />
              
              {state.isActive && (
                <div className="flex gap-4 mt-6">
                  <Button
                    variant="outline"
                    onClick={pauseSession}
                    className="gap-2"
                  >
                    {state.isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    {state.isPaused ? 'Resume' : 'Pause'}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={endSession}
                    className="gap-2"
                  >
                    <Square className="h-4 w-4" />
                    End Session
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {state.isActive && (
            <FocusMetrics metrics={state.metrics} />
          )}
        </div>
      </div>
    </div>
  )
}
