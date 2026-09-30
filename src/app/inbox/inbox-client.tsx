"use client"

import * as React from "react"
import { assignMessage, rateMessage } from "@/app/actions"
import { cn } from "@/lib/utils"

const RATINGS = [
  { v: 1, label: "Warm", color: "var(--positive)" },
  { v: 0, label: "Neutral", color: "var(--muted-foreground)" },
  { v: -1, label: "Cold", color: "var(--negative)" },
] as const

export function RateButtons({ id, rating }: { id: string; rating: number | null }) {
  const [pending, start] = React.useTransition()
  return (
    <div className="inline-flex rounded-lg bg-muted p-0.5" role="radiogroup" aria-label="Rate this reply">
      {RATINGS.map((r) => (
        <button
          key={r.v}
          role="radio"
          aria-checked={rating === r.v}
          disabled={pending}
          onClick={() => start(() => rateMessage(id, rating === r.v ? null : r.v))}
          className={cn(
            "pressable inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs",
            rating === r.v ? "bg-background font-medium shadow-[0_1px_2px_oklch(0_0_0/0.08)]" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <span className="size-1.5 rounded-full" style={{ background: r.color }} />
          {r.label}
        </button>
      ))}
    </div>
  )
}

export function MatchSelect({ id, sites }: { id: string; sites: { id: string; name: string }[] }) {
  const [pending, start] = React.useTransition()
  return (
    <select
      aria-label="Match to a site"
      disabled={pending}
      defaultValue=""
      onChange={(e) => e.target.value && start(() => assignMessage(id, e.target.value))}
      className="h-7 max-w-52 rounded-md border border-move-line bg-move-soft px-2 text-xs outline-none"
    >
      <option value="">Match to a site…</option>
      {sites.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  )
}
