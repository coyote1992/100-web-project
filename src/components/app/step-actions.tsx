"use client"

import * as React from "react"
import { toast } from "sonner"
import { applyAction, undoStep } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { STAGE_LABEL, type StepAction } from "@/lib/flow"
import { cn } from "@/lib/utils"

function localInput(d = new Date(Date.now() + 86_400_000)) {
  d.setMinutes(0, 0, 0)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

/** The buttons that record what just happened. Ticking a next step is one of these. */
export function StepActions({ siteId, actions, size = "default", className }: { siteId: string; actions: StepAction[]; size?: "default" | "sm"; className?: string }) {
  const [asking, setAsking] = React.useState<StepAction | null>(null)
  const [callAt, setCallAt] = React.useState(() => localInput())
  const [deal, setDeal] = React.useState("")
  const [reason, setReason] = React.useState("")
  const [pending, start] = React.useTransition()

  function run(a: StepAction) {
    start(async () => {
      const res = await applyAction(siteId, a.id, {
        callAt: a.asks === "callAt" ? new Date(callAt).toISOString() : undefined,
        dealValue: a.asks === "deal" && deal ? Number(deal) : undefined,
        reason: a.asks === "reason" ? reason : undefined,
      })
      if (!res.ok) return void toast.error(res.error)
      setAsking(null)
      setReason("")
      setDeal("")
      toast.success(STAGE_LABEL[a.to], { action: { label: "Undo", onClick: () => undoStep(siteId) } })
    })
  }

  if (!actions.length) return null
  return (
    <div className={className}>
      <div className="flex flex-wrap gap-1.5">
        {actions.map((a, i) => (
          <Button
            key={a.id}
            size={size}
            variant={i === 0 && a.tone !== "negative" ? "default" : "outline"}
            disabled={pending}
            aria-expanded={a.asks ? asking?.id === a.id : undefined}
            onClick={() => (a.asks ? setAsking(asking?.id === a.id ? null : a) : run(a))}
            className={cn(a.tone === "negative" && "text-muted-foreground hover:text-negative")}
          >
            {a.tone === "positive" && i !== 0 && <span className="size-1.5 rounded-full bg-positive" />}
            {a.tone === "negative" && <span className="size-1.5 rounded-full bg-negative" />}
            {a.label}
          </Button>
        ))}
      </div>
      {asking && (
        <form
          className="mt-2 flex flex-wrap items-center gap-2 duration-150 animate-in fade-in-0 slide-in-from-top-1"
          onSubmit={(e) => {
            e.preventDefault()
            run(asking)
          }}
        >
          {asking.asks === "callAt" && <Input type="datetime-local" required value={callAt} onChange={(e) => setCallAt(e.target.value)} aria-label="Call date and time" className="w-56" autoFocus />}
          {asking.asks === "deal" && <Input type="number" inputMode="numeric" min={0} placeholder="Deal value, €" value={deal} onChange={(e) => setDeal(e.target.value)} aria-label="Deal value in euros" className="w-40" autoFocus />}
          {asking.asks === "reason" && <Input placeholder="Why? (optional)" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Reason" className="w-64" autoFocus />}
          <Button type="submit" size={size} disabled={pending}>
            Confirm
          </Button>
          <Button type="button" size={size} variant="ghost" onClick={() => setAsking(null)}>
            Cancel
          </Button>
        </form>
      )}
    </div>
  )
}
