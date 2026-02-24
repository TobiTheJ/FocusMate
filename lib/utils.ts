import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function calculateFocusScore(
  duration: number,
  blinkCount: number,
  yawnCount: number,
  lookAwayCount: number,
  distractionTime: number
): number {
  const blinkRate = duration > 0 ? blinkCount / (duration / 60) : 0
  const distractionRatio = duration > 0 ? distractionTime / duration : 0
  
  let score = 100
  score -= Math.min(blinkRate * 2, 20)
  score -= Math.min(yawnCount * 5, 15)
  score -= Math.min(lookAwayCount * 3, 15)
  score -= Math.min(distractionRatio * 50, 40)
  
  return Math.max(0, Math.min(100, Math.round(score)))
}

export function getRecommendations(score: number): string[] {
  if (score >= 90) {
    return ['great_job', 'keep_it_up', 'excellent_focus']
  } else if (score >= 70) {
    return ['good_job', 'maintain_posture', 'stay_hydrated']
  } else if (score >= 50) {
    return ['take_break', 'hydrate', 'adjust_lighting', 'check_posture']
  } else {
    return ['take_break', 'hydrate', 'adjust_lighting', 'meditate', 'sleep_more']
  }
}

// Get specific recommendations based on metrics
export function getSpecificRecommendations(
  blinkCount: number,
  yawnCount: number,
  lookAwayCount: number,
  duration: number
): { type: 'blink' | 'yawn' | 'lookAway' | 'good'; message: string; tip: string }[] {
  const recommendations: { type: 'blink' | 'yawn' | 'lookAway' | 'good'; message: string; tip: string }[] = []
  
  // Blink recommendations (normal: 15-20 blinks per minute)
  const blinkRate = duration > 0 ? (blinkCount / (duration / 60)) : 0
  if (blinkRate > 25) {
    recommendations.push({
      type: 'blink',
      message: 'Bạn nháy mắt quá nhiều',
      tip: 'Mắt bạn có thể đang bị khô hoặc mệt. Hãy thử: (1) Nhắm mắt nghỉ ngơi 20 giây, (2) Dùng thuốc nhỏ mắt, (3) Điều chỉnh độ sáng màn hình, (4) Áp dụng quy tắc 20-20-20: cứ 20 phút nhìn xa 20 feet trong 20 giây.'
    })
  } else if (blinkRate < 5 && blinkCount > 0) {
    recommendations.push({
      type: 'blink',
      message: 'Bạn nháy mắt ít hơn bình thường',
      tip: 'Ít nháy mắt có thể gây khô mắt. Hãy: (1) Chớp mắt chủ động thường xuyên hơn, (2) Uống đủ nước, (3) Đảm bảo độ ẩm trong phòng.'
    })
  }
  
  // Yawn recommendations
  if (yawnCount >= 3) {
    recommendations.push({
      type: 'yawn',
      message: 'Bạn có dấu hiệu buồn ngủ',
      tip: 'Có vẻ bạn đang mệt. Hãy thử: (1) Uống một ly nước hoặc trà xanh, (2) Đứng dậy vươn vai 2-3 phút, (3) Thở sâu 5 hơi thở, (4) Nếu có thể, hãy nghỉ ngơi 10-15 phút.'
    })
  } else if (yawnCount === 2) {
    recommendations.push({
      type: 'yawn',
      message: 'Bạn có thể đang hơi mệt',
      tip: 'Hãy: (1) Uống nước, (2) Thay đổi tư thế ngồi, (3) Mở cửa sổ để có không khí mới.'
    })
  }
  
  // Look Away recommendations
  const lookAwayRate = duration > 0 ? (lookAwayCount / (duration / 60)) : 0
  if (lookAwayRate > 4) {
    recommendations.push({
      type: 'lookAway',
      message: 'Bạn nhìn đi chỗ khác quá thường xuyên',
      tip: 'Khả năng tập trung của bạn đang bị phân tán. Hãy thử: (1) Loại bỏ các tab/tiện ích không cần thiết, (2) Đặt điện thoại ở chế độ tập trung, (3) Sử dụng kỹ thuật Pomodoro (25 phút tập trung + 5 phút nghỉ), (4) Tạo không gian làm việc yên tĩnh.'
    })
  } else if (lookAwayRate > 2) {
    recommendations.push({
      type: 'lookAway',
      message: 'Bạn có xu hướng nhìn đi chỗ khác',
      tip: 'Hãy: (1) Xác định điều gì đang gây mất tập trung, (2) Viết ra những suy nghĩ lạc đề để xử lý sau, (3) Đặt mục tiêu nhỏ cho từng 10 phút.'
    })
  }
  
  // If no issues, give positive feedback
  if (recommendations.length === 0) {
    recommendations.push({
      type: 'good',
      message: 'Tuyệt vời! Bạn đã tập trung rất tốt',
      tip: 'Tiếp tục duy trì: (1) Tư thế ngồi đúng, (2) Uống đủ nước, (3) Nghỉ ngơi đều đặn để duy trì hiệu suất.'
    })
  }
  
  return recommendations
}