"use client"

import * as React from "react"
import { toast } from "sonner"
import { CalendarClockIcon, CornerUpLeftIcon, PauseIcon, PlayIcon } from "lucide-react"
import { recordStep, setParked, undoStep } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { NODES, transitionsFrom, type NodeKey, type Transition } from "@/lib/flow"
import { cn } from "@/lib/utils"

function localNow() {
  const d = new Date()
  d.setSeconds(0, 0)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

const toneClass: Record<Transition["tone"], string> = {
  default: "bg-primary text-primary-foreground hover:bg-primary/85 border-transparent",
  positive: "bg-background hover:bg-accent",
  negative: "bg-background hover:bg-accent",
  quiet: "bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
}

export function StepRecorder({
  prospectId,
  stage,
  parked,
  build,
  dealValue,
}: {
  prospectId: string
  stage: NodeKey | null
  parked: boolean
  build: string
  dealValue: number | null
}) {
  const transitions = transitionsFrom(stage)
  const [active, setActive] = React.useState<Transition | null>(null)
  const [details, setDetails] = React.useState(false)
  const [note, setNote] = React.useState("")
  const [when, setWhen] = React.useState(localNow)
  const [whenEdited, setWhenEdited] = React.useState(false)
  const [sentiment, setSentiment] = React.useState<number | null>(1)
  const [callMin, setCallMin] = React.useState("")
  const [deal, setDeal] = React.useState("")
  const [pending, start] = React.useTransition()

  function commit(t: Transition) {
    start(async () => {
      // Untouched "When" means right now, to the millisecond, so step order stays true.
      const at = whenEdited ? new Date(when).getTime() : undefined
      const res = await recordStep(prospectId, t.id, {
        at,
        note: note || undefined,
        sentiment: t.asks === "sentiment" ? sentiment : null,
        minutes: t.asks === "call" && callMin ? Number(callMin) : null,
        dealValue: t.asks === "deal" && deal ? Number(deal) : null,
      })
      if ("error" in res) {
        toast.error(res.error)
        return
      }
      setDetails(false)
      toast.success(`Recorded · ${NODES[t.path.at(-1)!].short}`, {
        action: { label: "Undo", onClick: () => undoStep(prospectId) },
      })
    })
  }

  function click(t: Transition) {
    if (t.asks || details) setActive(active?.id === t.id ? null : t)
    else commit(t)
  }

  if (parked) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Parked. It&rsquo;s out of the flow and off your to-do list.</p>
        <Button variant="outline" onClick={() => start(() => setParked(prospectId, false))} disabled={pending}>
          <PlayIcon />
          Unpark
        </Button>
      </div>
    )
  }

  const terminal = stage ? NODES[stage].status === "won" || NODES[stage].status === "lost" : false

  return (
    <div>
      {terminal ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            {stage === "paid" ? (
              <>
                <span className="font-medium text-st-won">Paid client.</span>{" "}
                {dealValue ? <span className="num">Deal worth €{dealValue.toLocaleString()}.</span> : null} This one&rsquo;s done.
              </>
            ) : (
              <span className="text-muted-foreground">Closed: {NODES[stage!].short.toLowerCase()}. Add a lesson below while it&rsquo;s fresh.</span>
            )}
          </p>
          <Button variant="ghost" size="sm" onClick={() => start(() => undoStep(prospectId))} disabled={pending}>
            <CornerUpLeftIcon />
            Undo last step
          </Button>
        </div>
      ) : (
        <>
          {!stage && build !== "ready" && (
            <p className="mb-3 text-sm text-muted-foreground">The demo isn&rsquo;t marked ready yet. You can still start outreach.</p>
          )}
          <div className="flex flex-wrap gap-2">
            {transitions.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => click(t)}
                disabled={pending}
                aria-expanded={t.asks || details ? active?.id === t.id : undefined}
                title={t.hint}
                className={cn(
                  "pressable inline-flex h-10 items-center gap-2 rounded-lg border px-3.5 text-sm font-medium disabled:opacity-60",
                  toneClass[t.tone],
                  active?.id === t.id && "ring-2 ring-ring/60",
                )}
              >
                {t.tone === "positive" && <span className="size-2 rounded-full bg-positive" />}
                {t.tone === "negative" && <span className="size-2 rounded-full bg-negative" />}
                {t.label}
              </button>
            ))}
          </div>

          {active && (
            <form
              className="mt-4 grid gap-4 rounded-xl border bg-background p-4 duration-200 animate-in fade-in-0 slide-in-from-top-1"
              onSubmit={(e) => {
                e.preventDefault()
                commit(active)
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="step-when">When</Label>
                  <Input id="step-when" type="datetime-local" value={when} onChange={(e) => {
                      setWhen(e.target.value)
                      setWhenEdited(true)
                    }} />
                </div>
                {active.asks === "sentiment" && (
                  <fieldset className="grid gap-1.5">
                    <legend className="mb-1.5 text-sm font-medium">How did it read?</legend>
                    <div className="inline-grid grid-cols-3 rounded-lg bg-muted p-0.5">
                      {[
                        [1, "Warm"],
                        [0, "Neutral"],
                        [-1, "Cold"],
                      ].map(([v, l]) => (
                        <button
                          key={v}
                          type="button"
                          aria-pressed={sentiment === v}
                          onClick={() => setSentiment(v as number)}
                          className={cn("pressable h-8 rounded-md text-sm", sentiment === v ? "bg-background font-medium shadow-[0_1px_2px_oklch(0_0_0/0.08)]" : "text-muted-foreground")}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                )}
                {active.asks === "call" && (
                  <div className="grid gap-1.5">
                    <Label htmlFor="step-call">Call length (min)</Label>
                    <Input id="step-call" type="number" inputMode="numeric" min={0} placeholder="20" value={callMin} onChange={(e) => setCallMin(e.target.value)} />
                  </div>
                )}
                {active.asks === "deal" && (
                  <div className="grid gap-1.5">
                    <Label htmlFor="step-deal">Deal value (€)</Label>
                    <Input id="step-deal" type="number" inputMode="numeric" min={0} placeholder="1500" value={deal} onChange={(e) => setDeal(e.target.value)} />
                  </div>
                )}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="step-note">{active.asks === "call" ? "What was said" : "Note"}</Label>
                <Textarea
                  id="step-note"
                  rows={active.asks === "call" ? 4 : 2}
                  placeholder={active.asks === "call" ? "Objections, what they liked, next steps…" : "Optional. Paste their reply, or what stood out."}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault()
                      commit(active)
                    }
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setActive(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  Record &ldquo;{active.label}&rdquo;
                </Button>
              </div>
            </form>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <button type="button" onClick={() => setDetails((d) => !d)} className="inline-flex items-center gap-1.5 hover:text-foreground" aria-pressed={details}>
              <CalendarClockIcon className="size-3.5" />
              {details ? "Recording with date & note" : "Backdate or add a note"}
            </button>
            {stage && (
              <button type="button" onClick={() => start(() => undoStep(prospectId))} className="inline-flex items-center gap-1.5 hover:text-foreground">
                <CornerUpLeftIcon className="size-3.5" />
                Undo last step
              </button>
            )}
            <button type="button" onClick={() => start(() => setParked(prospectId, true))} className="inline-flex items-center gap-1.5 hover:text-foreground">
              <PauseIcon className="size-3.5" />
              Park
            </button>
          </div>
        </>
      )}
    </div>
  )
}
