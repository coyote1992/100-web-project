import type { Metadata } from "next"
import Link from "next/link"
import { getWorld } from "@/lib/data"
import { day } from "@/lib/format"
import { Page, PageHeader } from "@/components/app/page"
import { VerticalMark } from "@/components/app/status"
import { LessonComposer, LessonActions } from "./lesson-client"

export const metadata: Metadata = { title: "Lessons" }

export default async function LessonsPage({ searchParams }: PageProps<"/lessons">) {
  const sp = await searchParams
  const world = await getWorld()
  const filter = typeof sp.vertical === "string" ? sp.vertical : ""
  const vById = new Map(world.verticals.map((v) => [v.id, v]))
  const pById = new Map(world.prospects.map((p) => [p.id, p]))
  const all = world.notes.filter((n) => n.isLesson)
  const lessons = all.filter((n) => !filter || n.verticalId === filter)
  const notes = world.notes.filter((n) => !n.isLesson).slice(0, 12)

  return (
    <Page className="max-w-[920px]">
      <PageHeader
        title="Lessons"
        description="The things you'd tell yourself before the next batch. Promote the good ones into a vertical's playbook so the build prompt learns too."
      />
      <LessonComposer verticals={world.verticals.map((v) => ({ id: v.id, name: v.name }))} />

      <div className="mt-8 mb-6 flex flex-wrap gap-1.5">
        <Link href="/lessons" className={`h-7 rounded-md border px-2.5 text-xs leading-7 ${!filter ? "border-foreground/70 bg-accent font-medium" : "text-muted-foreground hover:bg-accent"}`}>
          All <span className="num opacity-60">{all.length}</span>
        </Link>
        {world.verticals.map((v) => (
          <Link
            key={v.id}
            href={`/lessons?vertical=${v.id}`}
            className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs ${filter === v.id ? "border-foreground/70 bg-accent font-medium" : "text-muted-foreground hover:bg-accent"}`}
          >
            <VerticalMark hue={v.hue} className="size-1.5" />
            {v.name}
            <span className="num opacity-60">{all.filter((n) => n.verticalId === v.id).length}</span>
          </Link>
        ))}
      </div>

      {lessons.length === 0 ? (
        <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No lessons yet. When something surprises you, write it down here or tick &ldquo;Mark as lesson&rdquo; on a site note.
        </p>
      ) : (
        <ol className="grid gap-px overflow-hidden rounded-xl border bg-border">
          {lessons.map((n) => {
            const v = n.verticalId ? vById.get(n.verticalId) : undefined
            const p = n.prospectId ? pById.get(n.prospectId) : undefined
            return (
              <li key={n.id} className="group grid gap-2 bg-surface p-5">
                <p className="display text-[1.35rem] leading-snug text-pretty">{n.body}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {v ? (
                    <span className="inline-flex items-center gap-1.5">
                      <VerticalMark hue={v.hue} className="size-1.5" />
                      {v.name}
                    </span>
                  ) : (
                    <span>General</span>
                  )}
                  {p && (
                    <Link href={`/sites/${p.id}`} className="hover:text-foreground hover:underline">
                      from {p.name}
                    </Link>
                  )}
                  <span className="num">{day(n.createdAt)}</span>
                  <LessonActions id={n.id} body={n.body} verticalId={n.verticalId} playbook={v?.playbook ?? null} />
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {notes.length > 0 && !filter && (
        <section className="mt-12">
          <h2 className="mb-3 text-[0.95rem] font-semibold tracking-tight">Recent notes</h2>
          <p className="mb-4 text-sm text-muted-foreground">Observations from site pages. Any of them could be a lesson.</p>
          <ul className="grid gap-3">
            {notes.map((n) => {
              const p = n.prospectId ? pById.get(n.prospectId) : undefined
              return (
                <li key={n.id} className="group flex items-start justify-between gap-4 border-b pb-3 text-sm">
                  <div>
                    <p className="whitespace-pre-line">{n.body}</p>
                    {p && (
                      <Link href={`/sites/${p.id}`} className="text-xs text-muted-foreground hover:underline">
                        {p.name} · {day(n.createdAt)}
                      </Link>
                    )}
                  </div>
                  <LessonActions id={n.id} body={n.body} verticalId={n.verticalId} playbook={null} promoteOnly />
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </Page>
  )
}
