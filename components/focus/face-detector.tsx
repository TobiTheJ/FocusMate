'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { FaceMesh, Results } from '@mediapipe/face_mesh'
import { Camera } from '@mediapipe/camera_utils'
import { Button } from '@/components/ui/button'
import { Camera as CameraIcon, RefreshCw } from 'lucide-react'

interface FaceDetectorProps {
  isActive: boolean
  sessionId: string | null
  onMetricsUpdate: (metrics: {
    blinkCount: number
    yawnCount: number
    lookAwayCount: number
    distractionTime: number
    currentFocusLevel: number
  }) => void
  onDistraction: (type: 'blink' | 'yawn' | 'lookAway') => void
}

// Eye aspect ratio calculation
function calculateEAR(landmarks: any[], eyeIndices: number[][]): number {
  const vertical1 = Math.sqrt(
    Math.pow(landmarks[eyeIndices[1][0]].x - landmarks[eyeIndices[1][1]].x, 2) +
    Math.pow(landmarks[eyeIndices[1][0]].y - landmarks[eyeIndices[1][1]].y, 2)
  )
  const vertical2 = Math.sqrt(
    Math.pow(landmarks[eyeIndices[2][0]].x - landmarks[eyeIndices[2][1]].x, 2) +
    Math.pow(landmarks[eyeIndices[2][0]].y - landmarks[eyeIndices[2][1]].y, 2)
  )
  const horizontal = Math.sqrt(
    Math.pow(landmarks[eyeIndices[0][0]].x - landmarks[eyeIndices[0][1]].x, 2) +
    Math.pow(landmarks[eyeIndices[0][0]].y - landmarks[eyeIndices[0][1]].y, 2)
  )
  return (vertical1 + vertical2) / (2.0 * horizontal)
}

// Mouth aspect ratio for yawn detection
function calculateMAR(landmarks: any[]): number {
  const upperLip = landmarks[0]
  const lowerLip = landmarks[17]
  const leftCorner = landmarks[61]
  const rightCorner = landmarks[291]
  
  const vertical = Math.sqrt(
    Math.pow(upperLip.x - lowerLip.x, 2) + Math.pow(upperLip.y - lowerLip.y, 2)
  )
  const horizontal = Math.sqrt(
    Math.pow(leftCorner.x - rightCorner.x, 2) + Math.pow(leftCorner.y - rightCorner.y, 2)
  )
  
  return vertical / horizontal
}

// IPRT (Iris-Pupil Ratio Tracking) for look away detection
interface IrisRatio {
  x: number  // 0 = outer, 1 = inner
  y: number  // 0 = top, 1 = bottom
}

function calculateIrisRatio(
  landmarks: any[],
  irisIdx: number,
  eyeOuterIdx: number,
  eyeInnerIdx: number,
  eyeTopIdx: number,
  eyeBottomIdx: number
): IrisRatio {
  const iris = landmarks[irisIdx]
  const eyeOuter = landmarks[eyeOuterIdx]
  const eyeInner = landmarks[eyeInnerIdx]
  const eyeTop = landmarks[eyeTopIdx]
  const eyeBottom = landmarks[eyeBottomIdx]

  // Calculate normalized iris position within eye (0-1 range)
  const ratioX = (iris.x - eyeOuter.x) / (eyeInner.x - eyeOuter.x)
  const ratioY = (iris.y - eyeTop.y) / (eyeBottom.y - eyeTop.y)

  return { x: ratioX, y: ratioY }
}

export function FaceDetector({ isActive, sessionId, onMetricsUpdate, onDistraction }: FaceDetectorProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const faceMeshRef = useRef<FaceMesh | null>(null)
  const cameraRef = useRef<Camera | null>(null)
  
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Track previous sessionId to detect session changes
  const prevSessionIdRef = useRef<string | null>(null)
  
  // Detection state
  const metricsRef = useRef({
    blinkCount: 0,
    yawnCount: 0,
    lookAwayCount: 0,
    distractionTime: 0,
    currentFocusLevel: 100,
    isBlinking: false,
    isYawning: false,
    isLookingAway: false,
    blinkStartTime: 0,
    yawnStartTime: 0,
    yawnMaxMAR: 0,
    lookAwayStartTime: 0,
    lastUpdateTime: Date.now(),
    baselineEAR: 0,  // For adaptive blink threshold
  })

  // Reset metrics when session changes
  useEffect(() => {
    if (sessionId !== prevSessionIdRef.current) {
      // Reset all metrics when sessionId changes
      metricsRef.current = {
        blinkCount: 0,
        yawnCount: 0,
        lookAwayCount: 0,
        distractionTime: 0,
        currentFocusLevel: 100,
        isBlinking: false,
        isYawning: false,
        isLookingAway: false,
        blinkStartTime: 0,
        yawnStartTime: 0,
        yawnMaxMAR: 0,
        lookAwayStartTime: 0,
        lastUpdateTime: Date.now(),
        baselineEAR: 0,
      }
      prevSessionIdRef.current = sessionId
      
      // Notify parent that metrics have been reset
      onMetricsUpdate({
        blinkCount: 0,
        yawnCount: 0,
        lookAwayCount: 0,
        distractionTime: 0,
        currentFocusLevel: 100,
      })
    }
  }, [sessionId, onMetricsUpdate])

  // Eye indices for MediaPipe Face Mesh
  const leftEyeIndices = [[33, 133], [160, 144], [159, 145]]
  const rightEyeIndices = [[362, 263], [385, 380], [386, 374]]

  const onResults = useCallback((results: Results) => {
    if (!canvasRef.current || !videoRef.current) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw video frame
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height)

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0]
      const now = Date.now()
      const metrics = metricsRef.current

      // Calculate eye aspect ratios
      const leftEAR = calculateEAR(landmarks, leftEyeIndices)
      const rightEAR = calculateEAR(landmarks, rightEyeIndices)
      const avgEAR = (leftEAR + rightEAR) / 2

      // Adaptive blink detection with dynamic threshold
      // Calculate baseline EAR when eyes are open (using moving average)
      const BASELINE_ALPHA = 0.95  // Smoothing factor
      metrics.baselineEAR = metrics.baselineEAR
        ? BASELINE_ALPHA * metrics.baselineEAR + (1 - BASELINE_ALPHA) * avgEAR
        : avgEAR
      
      // Blink threshold is a percentage of baseline (eyes open)
      // When EAR drops below 75% of baseline, consider it a blink
      const BLINK_THRESHOLD_RATIO = 0.75
      const BLINK_THRESHOLD = metrics.baselineEAR * BLINK_THRESHOLD_RATIO
      const isCurrentlyBlinking = avgEAR < BLINK_THRESHOLD
      
      // Blink detection with faster response
      const MIN_BLINK_DURATION = 50    // Reduced from 100ms to catch fast blinks
      const MAX_BLINK_DURATION = 600   // Increased to catch longer blinks
      
      if (isCurrentlyBlinking && !metrics.isBlinking) {
        metrics.isBlinking = true
        metrics.blinkStartTime = now
      } else if (!isCurrentlyBlinking && metrics.isBlinking) {
        metrics.isBlinking = false
        const blinkDuration = now - metrics.blinkStartTime
        
        // Accept blinks in range 50-600ms (covers both fast and normal blinks)
        if (blinkDuration >= MIN_BLINK_DURATION && blinkDuration <= MAX_BLINK_DURATION) {
          metrics.blinkCount++
          // Trigger distraction every 5 blinks (more sensitive than 10)
          if (metrics.blinkCount % 5 === 0) {
            onDistraction('blink')
          }
        }
      }

      // Yawn detection using mouth aspect ratio
      const mar = calculateMAR(landmarks)
      
      // Cấu hình ngưỡng phát hiện ngáp - điều chỉnh để yêu cầu miệng mở RẤT TO
      const YAWN_THRESHOLD = 0.85       // Ngưỡng bắt đầu phát hiện ngáp (rất cao)
      const YAWN_MIN_MAR = 0.8          // Độ mở miệng tối thiểu trong suốt quá trình (rất cao)
      const YAWN_MIN_DURATION = 1500    // Thời gian tối thiểu (ms)
      const YAWN_MAX_DURATION = 5000    // Thời gian tối đa để tránh đếm liên tục
      
      const isCurrentlyYawning = mar > YAWN_THRESHOLD

      if (isCurrentlyYawning && !metrics.isYawning) {
        // Bắt đầu phát hiện ngáp
        metrics.isYawning = true
        metrics.yawnStartTime = now
        metrics.yawnMaxMAR = mar        // Theo dõi độ mở tối đa
      } else if (isCurrentlyYawning && metrics.isYawning) {
        // Đang trong quá trình ngáp - cập nhật độ mở tối đa
        metrics.yawnMaxMAR = Math.max(metrics.yawnMaxMAR, mar)
      } else if (!isCurrentlyYawning && metrics.isYawning) {
        // Kết thúc phát hiện ngáp
        metrics.isYawning = false
        const yawnDuration = now - metrics.yawnStartTime
        
        // Kiểm tra cả thời gian VÀ độ mở miệng tối đa
        const isValidYawn = 
          yawnDuration >= YAWN_MIN_DURATION &&
          yawnDuration <= YAWN_MAX_DURATION &&
          metrics.yawnMaxMAR >= YAWN_MIN_MAR
        
        if (isValidYawn) {
          metrics.yawnCount++
          onDistraction('yawn')
        }
      }

      // IPRT (Iris-Pupil Ratio Tracking) for look away detection
      // MediaPipe Face Mesh iris landmarks: 468 (left), 473 (right)
      const leftIris = calculateIrisRatio(
        landmarks,
        468,   // left iris center
        33,    // left eye outer corner
        133,   // left eye inner corner
        159,   // left eye top
        145    // left eye bottom
      )

      const rightIris = calculateIrisRatio(
        landmarks,
        473,   // right iris center
        362,   // right eye outer corner
        263,   // right eye inner corner
        386,   // right eye top
        374    // right eye bottom
      )

      // Average iris position from both eyes for stability
      const avgIrisX = (leftIris.x + rightIris.x) / 2
      const avgIrisY = (leftIris.y + rightIris.y) / 2

      // IPRT thresholds for look away detection
      // Center is at 0.5, threshold determines how far from center is considered "looking away"
      const CENTER_X = 0.5
      const CENTER_Y = 0.5
      const THRESHOLD_X = 0.15  // Horizontal: looking left/right (15% deviation)
      const THRESHOLD_Y = 0.20  // Vertical: looking up/down (20% deviation, more tolerant)
      const MIN_LOOKAWAY_DURATION = 800  // Minimum ms to count as look away (faster detection)

      // Calculate deviation from center
      const deviationX = Math.abs(avgIrisX - CENTER_X)
      const deviationY = Math.abs(avgIrisY - CENTER_Y)
      const isCurrentlyLookingAway = deviationX > THRESHOLD_X || deviationY > THRESHOLD_Y

      // Store iris position for debugging/visualization
      const irisPosition = { x: avgIrisX, y: avgIrisY, deviationX, deviationY }

      if (isCurrentlyLookingAway && !metrics.isLookingAway) {
        metrics.isLookingAway = true
        metrics.lookAwayStartTime = now
      } else if (!isCurrentlyLookingAway && metrics.isLookingAway) {
        metrics.isLookingAway = false
        const lookAwayDuration = now - metrics.lookAwayStartTime
        metrics.distractionTime += lookAwayDuration / 1000
        // Count as look away if duration exceeds threshold
        if (lookAwayDuration > MIN_LOOKAWAY_DURATION) {
          metrics.lookAwayCount++
          onDistraction('lookAway')
        }
      }

      // Calculate focus level (0-100)
      let focusLevel = 100
      if (metrics.isBlinking) focusLevel -= 5
      if (metrics.isYawning) focusLevel -= 15
      if (metrics.isLookingAway) focusLevel -= 20
      focusLevel = Math.max(0, Math.min(100, focusLevel))
      metrics.currentFocusLevel = focusLevel

      // Draw landmarks
      ctx.fillStyle = '#00FF00'
      for (const landmark of landmarks) {
        ctx.beginPath()
        ctx.arc(
          landmark.x * canvas.width,
          landmark.y * canvas.height,
          1,
          0,
          2 * Math.PI
        )
        ctx.fill()
      }

      // Draw status indicators
      ctx.font = '16px Arial'
      ctx.fillStyle = metrics.isBlinking ? '#FF0000' : '#00FF00'
      ctx.fillText(`Blink: ${metrics.blinkCount}`, 10, 30)
      
      ctx.fillStyle = metrics.isYawning ? '#FF0000' : '#00FF00'
      ctx.fillText(`Yawn: ${metrics.yawnCount}`, 10, 50)
      
      ctx.fillStyle = metrics.isLookingAway ? '#FF0000' : '#00FF00'
      ctx.fillText(`Look Away: ${metrics.lookAwayCount}`, 10, 70)
      
      ctx.fillStyle = focusLevel > 80 ? '#00FF00' : focusLevel > 50 ? '#FFFF00' : '#FF0000'
      ctx.fillText(`Focus: ${focusLevel}%`, 10, 90)

      // Update metrics every 500ms
      if (now - metrics.lastUpdateTime > 500) {
        onMetricsUpdate({
          blinkCount: metrics.blinkCount,
          yawnCount: metrics.yawnCount,
          lookAwayCount: metrics.lookAwayCount,
          distractionTime: Math.floor(metrics.distractionTime),
          currentFocusLevel: metrics.currentFocusLevel,
        })
        metrics.lastUpdateTime = now
      }
    }
  }, [onMetricsUpdate, onDistraction])

  const initializeCamera = useCallback(async () => {
    try {
      if (!videoRef.current) return

      const faceMesh = new FaceMesh({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        },
      })

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })

      faceMesh.onResults(onResults)
      faceMeshRef.current = faceMesh

      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          await faceMesh.send({ image: videoRef.current! })
        },
        width: 640,
        height: 480,
      })

      await camera.start()
      cameraRef.current = camera
      setIsInitialized(true)
      setError(null)
    } catch (err) {
      setError('Failed to initialize camera. Please allow camera access.')
      console.error('Camera initialization error:', err)
    }
  }, [onResults])

  useEffect(() => {
    initializeCamera()

    return () => {
      cameraRef.current?.stop()
      faceMeshRef.current?.close()
    }
  }, [initializeCamera])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-muted rounded-lg">
        <CameraIcon className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-center mb-4">{error}</p>
        <Button onClick={initializeCamera} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="relative">
      <video
        ref={videoRef}
        className="hidden"
        playsInline
      />
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className="w-full rounded-lg bg-black"
      />
      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2" />
            <p className="text-sm text-muted-foreground">Initializing camera...</p>
          </div>
        </div>
      )}
    </div>
  )
}
