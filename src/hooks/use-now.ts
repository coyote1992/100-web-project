"use client"

import * as React from "react"

/**
 * Current time, ticking every second while `active`. Null until mounted so the
 * server and first client render agree.
 */
export function useNow(active: boolean) {
  const [now, setNow] = React.useState<number | null>(null)
  React.useEffect(() => {
    if (!active) return
    const tick = () => setNow(Date.now())
    const first = setTimeout(tick, 0)
    const t = setInterval(tick, 1000)
    return () => {
      clearTimeout(first)
      clearInterval(t)
    }
  }, [active])
  return now
}
