'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, Frown, EyeOff, Clock } from 'lucide-react'

interface FocusMetricsProps {
  metrics: {
    blinkCount: number
    yawnCount: number
    lookAwayCount: number
    distractionTime: number
    currentFocusLevel: number
  }
}

export function FocusMetrics({ metrics }: FocusMetricsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Real-time Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <div className="p-2 bg-blue-100 rounded-full">
              <Eye className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{metrics.blinkCount}</p>
              <p className="text-xs text-muted-foreground">Blinks</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <div className="p-2 bg-yellow-100 rounded-full">
              <Frown className="h-4 w-4 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{metrics.yawnCount}</p>
              <p className="text-xs text-muted-foreground">Yawns</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <div className="p-2 bg-orange-100 rounded-full">
              <EyeOff className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{metrics.lookAwayCount}</p>
              <p className="text-xs text-muted-foreground">Look Aways</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <div className="p-2 bg-red-100 rounded-full">
              <Clock className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{Math.floor(metrics.distractionTime)}s</p>
              <p className="text-xs text-muted-foreground">Distracted</p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Focus Level</span>
            <span className={`font-bold ${
              metrics.currentFocusLevel > 80 ? 'text-green-600' :
              metrics.currentFocusLevel > 50 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {metrics.currentFocusLevel}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                metrics.currentFocusLevel > 80 ? 'bg-green-500' :
                metrics.currentFocusLevel > 50 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${metrics.currentFocusLevel}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
