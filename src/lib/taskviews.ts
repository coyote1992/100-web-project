import type { StepAction } from "./flow"
import { dueTime, type TaskItem } from "./metrics"

/** A task shaped for the client: plain values only. */
export type TaskView = {
  key: string
  kind: "step" | "task"
  taskId?: string
  siteId: string | null
  siteName: string | null
  hue: number | null
  title: string
  detail?: string
  due: string | null
  state: "due" | "upcoming" | "done"
  actions: StepAction[]
}

export function toViews(items: TaskItem[]): TaskView[] {
  return [...items]
    .sort((a, b) => dueTime(a) - dueTime(b))
    .map((i) =>
      i.source === "step"
        ? { key: i.key, kind: "step", siteId: i.site.id, siteName: i.site.name, hue: i.site.vertical?.hue ?? null, title: i.step.title, detail: i.step.detail, due: i.due.toISOString(), state: i.state, actions: i.step.actions }
        : { key: i.key, kind: "task", taskId: i.task.id, siteId: i.site?.id ?? null, siteName: i.site?.name ?? null, hue: i.site?.vertical?.hue ?? null, title: i.task.title, detail: i.task.note || undefined, due: i.due?.toISOString() ?? null, state: i.state, actions: [] },
    )
}
