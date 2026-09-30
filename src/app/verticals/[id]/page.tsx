import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"
import { getWorld } from "@/lib/data"
import { buildRows, byVertical, funnel, timingOf } from "@/lib/metrics"
import { day, pct } from "@/lib/format"
import { Ledger, Page, Panel, Section } from "@/components/app/page"
import { FunnelChart } from "@/components/app/funnel"
import { StagePill, VerticalMark } from "@/components/app/status"
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
  const [v] = byVertical(rows, [vertical], timingOf(world.templates))
  const lessons = rows.flatMap((r) => r.lessons.map((l) => ({ ...l, site: r }))).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  return (
    <Page>
      <Link href="/verticals" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-3.5" />
        Verticals
      </Link>
      <header className="mb-8">
        <h1 className="display flex items-center gap-3 text-5xl leading-none">
          <VerticalMark hue={vertical.hue} className="size-3" />
          {vertical.name}
        </h1>
      </header>

      <Ledger
        className="mb-10 border-y py-5"
        items={[
          { label: "Sites", value: `${rows.length} / ${vertical.target}` },
          { label: "Question answered", value: pct(v.questionRate) },
          { label: "Site answered", value: pct(v.siteRate) },
          { label: "Positive", value: `${v.positive} (${pct(v.positiveRate)})` },
          { label: "Calls held", value: v.called },
          { label: "Paid", value: v.won },
        ]}
      />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid min-w-0 content-start gap-10 lg:order-none">
          <Section title="Sites" aside={`${rows.length}`}>
            <Panel className="divide-y">
              {rows.length === 0 && <p className="p-5 text-sm text-muted-foreground">No sites yet. Ask ChatGPT to add the firms for {vertical.name}.</p>}
              {rows.map((r) => (
                <Link key={r.id} href={`/sites/${r.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-accent/60">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{r.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{r.city}</span>
                  </span>
                  <StagePill stage={r.stage} status={r.status} />
                </Link>
              ))}
            </Panel>
          </Section>
          <Section title="Funnel">
            <Panel className="p-5">
              <FunnelChart data={funnel(rows)} />
            </Panel>
          </Section>
          <Section title="Lessons from these sites">
            {lessons.length === 0 ? (
              <p className="text-sm text-muted-foreground">Lessons you write on a site page collect here.</p>
            ) : (
              <ul className="grid gap-5">
                {lessons.map((l) => (
                  <li key={l.id}>
                    <p className="display text-xl leading-snug text-pretty">{l.body}</p>
                    <p className="num mt-1 text-xs text-muted-foreground">
                      <Link href={`/sites/${l.site.id}`} className="hover:text-foreground hover:underline">
                        {l.site.name}
                      </Link>{" "}
                      · {day(l.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
        <aside className="order-first lg:order-none">
          <Panel className="p-5 lg:sticky lg:top-8">
            <h2 className="mb-4 text-sm font-semibold">Reference sites & settings</h2>
            <VerticalEditor v={{ id: vertical.id, name: vertical.name, hue: vertical.hue, target: vertical.target, reference1: vertical.reference1, reference2: vertical.reference2 }} />
          </Panel>
        </aside>
      </div>
    </Page>
  )
}
