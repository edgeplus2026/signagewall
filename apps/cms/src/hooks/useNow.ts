import { useEffect, useState } from 'react'

/**
 * A clock that re-renders on an interval, for relative timestamps.
 *
 * Relative labels ("offline for 3 minutes") are computed at render time, so on
 * a dashboard nobody interacts with they freeze at whatever the value was when
 * the data last changed — a screen that has been dark for an hour keeps
 * claiming "2 minutes". This ticks so the label stays honest.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now())
    }, intervalMs)
    return () => {
      clearInterval(id)
    }
  }, [intervalMs])

  return now
}
