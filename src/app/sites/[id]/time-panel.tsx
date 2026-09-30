"use client"

import * as React from "react"
import { toast } from "sonner"
import { PlayIcon, SquareIcon } from "lucide-react"
import { logWork, startTimer, stopTimer } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { WORK_KINDS } from "@/lib/flow"
import { minutes as fmt } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useNow } from "@/hooks/use-now"

const QUICK = [15, 30, 60, 120]

export function TimePanel({
  prospectId,
  running,
  otherRunning,
  breakdown,
  specMinutes,
  suggestedKind,
}: {
  prospectId: string
  running: { kind: string; startedAt: number; minutes: number } | null
  otherRunning: string | null
  breakdown: { kind: string; minutes: number }[]
  specMinutes: number
  suggestedKind: string
}) {
  const [kind, setKind] = React.useState(running?.kind ?? suggestedKind)
  const [pending, start] = React.useTransition()
  const now = useNow(!!running)
  const [custom, setCustom] = React.useState("")

  const since = running && now !== null ? Math.max(0, now - running.startedAt) : 0
  const liveMin = running ? running.minutes + Math.floor(since / 60_000) : 0
  const liveSec = Math.floor(since / 1000) % 60
  const total = breakdown.reduce((a, b) => a + b.minutes, 0)
  const kindLabel = WORK_KINDS.find((k) => k.key === kind)?.label ?? kind

  function add(m: number) {
    start(async () => {
      await logWork({ prospectId, kind, minutes: m })
      toast.success(`Logged ${fmt(m)} of ${kindLabel.toLowerCase()}`)
    })
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Speculative time</p>
          <p className="num text-3xl font-medium tracking-tight">{specMinutes ? fmt(specMinutes) : "0m"}</p>
        </div>
        {running ? (
          <Button variant="outline" aria-label="Stop timer" className="border-move-line bg-move-soft" disabled={pending} onClick={() => start(() => stopTimer())}>
            <SquareIcon className="fill-current" />
            <span className="num">
              {Math.floor(liveMin / 60) ? `${Math.floor(liveMin / 60)}:${String(liveMin % 60).padStart(2, "0")}` : liveMin}:{String(liveSec).padStart(2, "0")}
            </span>
          </Button>
        ) : (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await startTimer(prospectId, kind)
                if (otherRunning) toast(`Stopped the timer on ${otherRunning}`)
              })
            }
          >
            <PlayIcon className="fill-current" />
            Start timer
          </Button>
        )}
      </div>

      {total > 0 && (
        <div>
          <div className="flex h-2 gap-px overflow-hidden rounded-full bg-muted">
            {breakdown
              .filter((b) => b.minutes > 0)
              .map((b, i) => (
                <span
                  key={b.kind}
                  title={`${WORK_KINDS.find((k) => k.key === b.kind)?.label}: ${fmt(b.minutes)}`}
                  className="h-full"
                  style={{ width: `${(b.minutes / total) * 100}%`, background: `var(--chart-${(i % 5) + 1})` }}
                />
              ))}
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {breakdown
              .filter((b) => b.minutes > 0)
              .map((b, i) => (
                <li key={b.kind} className="inline-flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full" style={{ background: `var(--chart-${(i % 5) + 1})` }} />
                  {WORK_KINDS.find((k) => k.key === b.kind)?.label} <span className="num text-foreground">{fmt(b.minutes)}</span>
                </li>
              ))}
          </ul>
        </div>
      )}

      <div className="grid gap-2">
        <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Kind of work">
          {WORK_KINDS.map((k) => (
            <button
              key={k.key}
              role="radio"
              aria-checked={kind === k.key}
              onClick={() => setKind(k.key)}
              disabled={!!running}
              className={cn(
                "pressable h-7 rounded-md px-2 text-xs disabled:opacity-50",
                kind === k.key ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {k.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {QUICK.map((m) => (
            <Button key={m} variant="outline" size="sm" className="num flex-1" disabled={pending} onClick={() => add(m)}>
              +{fmt(m)}
            </Button>
          ))}
          <form
            className="flex-1"
            onSubmit={(e) => {
              e.preventDefault()
              const m = Math.round(Number(custom))
              if (m > 0) {
                add(m)
                setCustom("")
              }
            }}
          >
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value.replace(/[^0-9]/g, ""))}
              inputMode="numeric"
              placeholder="min"
              aria-label="Custom minutes, press enter to log"
              className="num h-7 w-full rounded-md border border-input bg-transparent px-2 text-center text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </form>
        </div>
        <p className="text-xs text-muted-foreground">
          Research, build, QA and outreach count as speculative. Calls & sales don&rsquo;t.
        </p>
      </div>
    </div>
  )
}
