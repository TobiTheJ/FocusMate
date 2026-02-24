/**
 * Cleanup Service - Tự động xóa dữ liệu cũ hơn 1 ngày
 * Dùng cho môi trường demo để tránh database quá tải
 */

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // Chạy mỗi 1 giờ
let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Thực hiện cleanup dữ liệu cũ
 */
export async function performCleanup(): Promise<void> {
  try {
    const response = await fetch('/api/cleanup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Cleanup failed: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log('🧹 Auto-cleanup completed:', result.deleted);
    } else {
      console.warn('⚠️ Cleanup returned error:', result.error);
    }
  } catch (error) {
    console.error('❌ Auto-cleanup error:', error);
  }
}

/**
 * Kiểm tra dữ liệu sẽ bị xóa (dry run)
 */
export async function checkCleanupData(): Promise<void> {
  try {
    const response = await fetch('/api/cleanup');
    
    if (!response.ok) {
      throw new Error(`Check cleanup failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('📊 Cleanup preview:', result.willBeDeleted);
  } catch (error) {
    console.error('❌ Check cleanup error:', error);
  }
}

/**
 * Bắt đầu auto-cleanup job
 * Chạy ngay lập tức và sau đó mỗi giờ một lần
 */
export function startAutoCleanup(): void {
  // Chạy ngay lập tức khi khởi động
  console.log('🚀 Starting auto-cleanup service...');
  performCleanup();

  // Thiết lập interval chạy định kỳ
  cleanupInterval = setInterval(() => {
    performCleanup();
  }, CLEANUP_INTERVAL_MS);

  console.log(`⏰ Auto-cleanup scheduled every ${CLEANUP_INTERVAL_MS / 1000 / 60} minutes`);
}

/**
 * Dừng auto-cleanup job
 */
export function stopAutoCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log('🛑 Auto-cleanup stopped');
  }
}

/**
 * Chỉ chạy cleanup một lần (không lặp lại)
 */
export function runCleanupOnce(): void {
  console.log('🧹 Running one-time cleanup...');
  performCleanup();
}
