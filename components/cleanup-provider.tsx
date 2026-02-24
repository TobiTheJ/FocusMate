'use client';

import { useEffect } from 'react';
import { startAutoCleanup, stopAutoCleanup } from '@/lib/cleanup';

/**
 * CleanupProvider - Component chạy auto-cleanup khi app khởi động
 * Chỉ chạy trong môi trường development/demo
 */
export function CleanupProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Chỉ chạy auto-cleanup trong môi trường development
    // Hoặc khi có flag ENABLE_AUTO_CLEANUP
    const isDev = process.env.NODE_ENV === 'development';
    const enableCleanup = process.env.NEXT_PUBLIC_ENABLE_AUTO_CLEANUP === 'true';
    
    if (isDev || enableCleanup) {
      console.log('🧹 Demo mode: Auto-cleanup enabled');
      startAutoCleanup();
    }

    // Cleanup khi unmount
    return () => {
      stopAutoCleanup();
    };
  }, []);

  return <>{children}</>;
}
