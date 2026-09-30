import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"
import { getWorld } from "@/lib/data"
import { buildRows, byVertical, flowCounts } from "@/lib/metrics"
import { day, hours, pct, ratio } from "@/lib/format"
import { Page, Panel, Section, Ledger } from "@/components/app/page"
import { FlowBoard } from "@/components/app/flow-board"
import { StagePill, VerticalMark } from "@/components/app/status"
import { NewSiteButton } from "@/components/app/new-site-button"
import { VerticalEditor } from "../vertical-client"

export async function generateMetadata({ params }: PageProps<"/verticals/[id]">): Promise<Metadata> {
  const { id } = await params
  const world = await getWorld()
  return { title: world.verticals.find((v) => v.id === id)?.name ?? "Vertical" }
}

export default async function VerticalPage({ params }: PageProps<"/verticals/[id]">) {
  const { id } = await params
  const world = await getWorld()
  const vertical = world.verticals.find((v) => v.id === id)
  if (!vertical) notFound()
  const rows = buildRows(world).filter((r) => r.verticalId === id)
  const [v] = byVertical(rows, [vertical])
  const flow = flowCounts(rows)
  const lessons = world.notes.filter((n) => n.isLesson && n.verticalId === id)

  return (
    <Page>
      <Link href="/verticals" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-3.5" />
        Verticals
      </Link>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <h1 className="display flex items-center gap-3 text-5xl leading-none">
          <VerticalMark hue={vertical.hue} className="size-3" />
          {vertical.name}
        </h1>
        <NewSiteButton verticalId={vertical.id} label="Add a site here" />
      </header>

      <Ledger
        className="mb-10 border-y py-5"
        items={[
          { label: "Sites", value: `${v.count} / ${vertical.target}` },
          { label: "Reply to question", value: pct(v.question.rate) },
          { label: "Reply to site", value: pct(v.site.rate) },
          { label: "Positive", value: `${v.positives} (${pct(v.positiveRate)})` },
          { label: "Spec hours", value: hours(v.specHours) },
          { label: "Pos / hour", value: ratio(v.pph) },
        ]}
      />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="grid min-w-0 content-start gap-10">
          <Section title="Flow for this vertical">
            <Panel className="paper-grid p-3">
              <FlowBoard mode="totals" nodes={flow.nodes} edges={flow.edges} />
            </Panel>
          </Section>
          <Section title="Sites" aside={`${rows.length}`}>
            <Panel className="divide-y">
              {rows.length === 0 && <p className="p-5 text-sm text-muted-foreground">No sites in this vertical yet.</p>}
              {rows.map((r) => (
                <Link key={r.id} href={`/sites/${r.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-accent/60">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{r.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{r.city}</span>
                  </span>
                  <StagePill stage={r.stage} parked={r.parked} />
                </Link>
              ))}
            </Panel>
          </Section>
          <Section title="Lessons" aside={<Link href={`/lessons?vertical=${id}`} className="hover:text-foreground">All lessons</Link>}>
            {lessons.length === 0 ? (
              <p className="text-sm text-muted-foreground">No lessons for this vertical yet.</p>
            ) : (
              <ul className="grid gap-4">
                {lessons.map((n) => (
                  <li key={n.id} className="border-l-0">
                    <p className="display text-xl leading-snug">{n.body}</p>
                    <p className="num mt-1 text-xs text-muted-foreground">{day(n.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
        <aside>
          <Panel className="p-5 lg:sticky lg:top-8">
            <h2 className="mb-4 text-sm font-semibold">Settings & playbook</h2>
            <VerticalEditor v={{ id: vertical.id, name: vertical.name, hue: vertical.hue, target: vertical.target, playbook: vertical.playbook }} />
          </Panel>
        </aside>
      </div>
    </Page>
  )
}
