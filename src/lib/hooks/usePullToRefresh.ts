import { useEffect, useRef, useState } from 'react'

interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void
  threshold?: number
  enabled?: boolean
}

export function usePullToRefresh({ onRefresh, threshold = 80, enabled = true }: PullToRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const currentY = useRef(0)

  useEffect(() => {
    if (!enabled) return

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger if at the top of the page
      if (window.scrollY <= 0) {
        startY.current = e.touches[0].clientY
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (window.scrollY > 0 || isRefreshing) return

      currentY.current = e.touches[0].clientY
      const distance = currentY.current - startY.current

      if (distance > 0) {
        setIsPulling(true)
        setPullDistance(Math.min(distance, threshold * 1.5))
      }
    }

    const handleTouchEnd = async () => {
      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true)
        try {
          await onRefresh()
        } finally {
          setIsRefreshing(false)
        }
      }
      setIsPulling(false)
      setPullDistance(0)
      startY.current = 0
      currentY.current = 0
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [enabled, onRefresh, threshold, pullDistance, isRefreshing])

  return {
    isPulling,
    isRefreshing,
    pullDistance,
    progress: Math.min(pullDistance / threshold, 1),
  }
}
