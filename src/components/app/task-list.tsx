"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { XIcon } from "lucide-react"
import { deleteTask, tickTask } from "@/app/actions"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { StepActions } from "./step-actions"
import { VerticalMark } from "./status"
import type { TaskView } from "@/lib/taskviews"

const DAY = 86_400_000

function dueLabel(due: string | null, now: number) {
  if (!due) return "No date"
  const diff = new Date(due).getTime() - now
  const days = Math.round(Math.abs(diff) / DAY)
  const hrs = Math.round(Math.abs(diff) / 3_600_000)
  if (diff <= 0) return hrs < 24 ? (hrs < 1 ? "due now" : `${hrs}h overdue`) : `${days}d overdue`
  return hrs < 24 ? `in ${hrs}h` : days === 1 ? "tomorrow" : `in ${days} days`
}

const GROUPS: { key: TaskView["group"]; label: string; hint: string }[] = [
  { key: "rate_reply", label: "Replies to rate", hint: "They answered the site. Positive or negative?" },
  { key: "schedule_email", label: "Send the call-scheduling email", hint: "Positive replies waiting for call times." },
  { key: "send_site", label: "Send the site", hint: "They replied, or the quiet days are up." },
  { key: "call", label: "Calls to make", hint: "Silent after the site, or a booked call." },
  { key: "proposal", label: "Send the proposal", hint: "The call went well." },
  { key: "send_question", label: "Send the opening question", hint: "New firms not yet contacted." },
  { key: "build", label: "Build the site", hint: "The demo needs to exist before it goes out." },
  { key: "own", label: "Your own tasks", hint: "" },
]

/** Tasks sorted into one block per kind of job, most urgent kinds first. */
export function GroupedTasks({ items, empty }: { items: TaskView[]; empty?: string }) {
  const present = GROUPS.filter((g) => items.some((i) => i.group === g.key))
  if (!present.length) return <p className="rounded-xl border bg-surface px-4 py-6 text-sm text-muted-foreground">{empty ?? "Nothing here."}</p>
  return (
    <div className="grid gap-4">
      {present.map((g) => {
        const list = items.filter((i) => i.group === g.key)
        return (
          <section key={g.key} aria-label={g.label} className="overflow-hidden rounded-xl border bg-surface shadow-[0_1px_2px_oklch(0.3_0.02_60/0.04)]">
            <header className="flex items-baseline justify-between gap-3 border-b bg-muted/40 px-4 py-2.5">
              <h3 className="text-sm font-semibold">{g.label}</h3>
              <span className="num rounded-md bg-st-move/25 px-1.5 text-xs font-medium">{list.length}</span>
            </header>
            <TaskList items={list} grouped />
          </section>
        )
      })}
    </div>
  )
}

export function TaskList({ items, empty, showActions = true, grouped = false }: { items: TaskView[]; empty?: string; showActions?: boolean; grouped?: boolean }) {
  const [pending, start] = React.useTransition()
  const [now, setNow] = React.useState<number | null>(null)
  React.useEffect(() => {
    const t = setTimeout(() => setNow(Date.now()), 0)
    return () => clearTimeout(t)
  }, [])

  if (!items.length) return <p className="px-4 py-6 text-sm text-muted-foreground">{empty ?? "Nothing here."}</p>
  return (
    <ul className="divide-y">
      {items.map((t) => (
        <li key={t.key} className="flex items-start gap-3 px-4 py-3">
          {t.kind === "task" ? (
            <Checkbox
              className="mt-1"
              aria-label={`Mark "${t.title}" ${t.state === "done" ? "not done" : "done"}`}
              checked={t.state === "done"}
              disabled={pending}
              onCheckedChange={(c) => start(async () => {
                const res = await tickTask(t.taskId!, !!c)
                if (res.ok && c) toast.success("Done", { action: { label: "Undo", onClick: () => tickTask(t.taskId!, false) } })
              })}
            />
          ) : (
            <span aria-hidden className={cn("mt-0.5 h-9 w-1 shrink-0 rounded-full", t.state === "due" ? "bg-st-move" : "bg-foreground/15")} />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              {grouped && t.kind === "step" && t.siteId ? (
                <Link href={`/sites/${t.siteId}`} className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline">
                  {t.hue !== null && <VerticalMark hue={t.hue} className="size-1.5" />}
                  {t.siteName}
                </Link>
              ) : (
                <p className={cn("text-sm font-medium", t.state === "done" && "text-muted-foreground line-through")}>{t.title}</p>
              )}
              <span className={cn("num text-xs whitespace-nowrap", t.state === "due" ? "text-foreground" : "text-muted-foreground")} suppressHydrationWarning>
                {t.state === "done" ? "done" : now === null ? "" : dueLabel(t.due, now)}
              </span>
            </div>
            {grouped && t.kind === "step" && <p className="mt-0.5 text-sm text-muted-foreground">{t.title}</p>}
            {!(grouped && t.kind === "step") && t.siteName && t.siteId && (
              <Link href={`/sites/${t.siteId}`} className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline">
                {t.hue !== null && <VerticalMark hue={t.hue} className="size-1.5" />}
                {t.siteName}
              </Link>
            )}
            {t.detail && <p className="mt-1 text-sm text-pretty text-muted-foreground">{t.detail}</p>}
            {showActions && t.kind === "step" && t.state === "due" && t.actions.length > 0 && <StepActions siteId={t.siteId!} actions={t.actions} size="sm" className="mt-2.5" />}
          </div>
          {t.kind === "task" && (
            <button aria-label="Delete task" disabled={pending} onClick={() => start(async () => void (await deleteTask(t.taskId!)))} className="rounded p-1 text-muted-foreground hover:text-destructive">
              <XIcon className="size-3.5" />
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
