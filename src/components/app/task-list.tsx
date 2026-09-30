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

export function TaskList({ items, empty, showActions = true }: { items: TaskView[]; empty?: string; showActions?: boolean }) {
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
              <p className={cn("text-sm font-medium", t.state === "done" && "text-muted-foreground line-through")}>{t.title}</p>
              <span className={cn("num text-xs whitespace-nowrap", t.state === "due" ? "text-foreground" : "text-muted-foreground")} suppressHydrationWarning>
                {t.state === "done" ? "done" : now === null ? "" : dueLabel(t.due, now)}
              </span>
            </div>
            {t.siteName && t.siteId && (
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
