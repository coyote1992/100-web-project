import type { Metadata } from "next"
import { getWorld } from "@/lib/data"
import { buildRows, taskItems } from "@/lib/metrics"
import { toViews } from "@/lib/taskviews"
import { Page, PageHeader, Panel, Section } from "@/components/app/page"
import { TaskList } from "@/components/app/task-list"
import { AddTask } from "./add-task"

export const metadata: Metadata = { title: "Tasks" }

export default async function TasksPage() {
  const world = await getWorld()
  const rows = buildRows(world)
  const items = toViews(taskItems(rows, world.tasks))
  const due = items.filter((i) => i.state === "due")
  const upcoming = items.filter((i) => i.state === "upcoming")
  const done = items.filter((i) => i.state === "done").slice(-8).reverse()

  return (
    <Page className="max-w-[920px]">
      <PageHeader
        title="Tasks"
        description="Next steps appear on their own as sites move through the flow: send the site after a quiet week, call after silence, reply to a positive answer. Tick a step to record it."
      />
      <AddTask sites={[...rows].sort((a, b) => a.name.localeCompare(b.name)).map((r) => ({ id: r.id, name: r.name }))} />

      <div className="mt-8 grid gap-10">
        <Section title="Due now" aside={due.length ? `${due.length}` : undefined}>
          <Panel className="overflow-hidden">
            <TaskList items={due} empty="Nothing due. Sites are waiting on replies." />
          </Panel>
        </Section>
        <Section title="Coming up" aside={upcoming.length ? `${upcoming.length}` : undefined}>
          <Panel className="overflow-hidden">
            <TaskList items={upcoming} empty="Nothing scheduled yet." showActions={false} />
          </Panel>
        </Section>
        {done.length > 0 && (
          <Section title="Done recently">
            <Panel className="overflow-hidden">
              <TaskList items={done} />
            </Panel>
          </Section>
        )}
      </div>
    </Page>
  )
}
