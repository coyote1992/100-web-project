import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRightIcon, TriangleAlertIcon } from "lucide-react"
import { getWorld } from "@/lib/data"
import { buildRows, byVertical, timingOf } from "@/lib/metrics"
import { pct } from "@/lib/format"
import { Page, PageHeader, Panel } from "@/components/app/page"
import { HundredBoard } from "@/components/app/hundred-board"
import { VerticalMark } from "@/components/app/status"
import { AddVertical } from "./vertical-client"

export const metadata: Metadata = { title: "Verticals" }

export default async function VerticalsPage() {
  const world = await getWorld()
  const rows = buildRows(world)
  const vs = byVertical(rows, world.verticals, timingOf(world.templates))
  return (
    <Page>
      <PageHeader
        title="Verticals"
        description="Five verticals, twenty firms each. Every vertical needs two reference sites: they go into the build prompt of each of its sites."
        actions={<AddVertical count={world.verticals.length} />}
      />
      {vs.length === 0 ? (
        <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">Add your first vertical above: tennis clubs, padel, pilates studios, gyms, wedding venues…</p>
      ) : (
        <div className="grid gap-4">
          {vs.map((v) => {
            const refs = [v.vertical.reference1, v.vertical.reference2].filter(Boolean).length
            return (
              <Panel key={v.vertical.id} className="group p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <Link href={`/verticals/${v.vertical.id}`} className="flex items-center gap-2.5">
                    <VerticalMark hue={v.vertical.hue} className="size-2.5" />
                    <h2 className="display text-[1.7rem] leading-none group-hover:underline">{v.vertical.name}</h2>
                  </Link>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {refs < 2 && (
                      <span className="inline-flex items-center gap-1.5 text-foreground">
                        <TriangleAlertIcon className="size-3.5" />
                        {refs === 0 ? "No reference sites" : "1 of 2 reference sites"}
                      </span>
                    )}
                    <Link href={`/verticals/${v.vertical.id}`} className="inline-flex items-center gap-1 hover:text-foreground">
                      Open <ArrowRightIcon className="size-3.5" />
                    </Link>
                  </div>
                </div>
                <div className="mt-4">
                  <HundredBoard verticals={[v.vertical]} rows={rows} hideLabels />
                </div>
                <dl className="num mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                  {[
                    ["Sites", `${v.rows.length}/${v.vertical.target}`],
                    ["Sites sent", v.siteSent],
                    ["Site answered", pct(v.siteRate)],
                    ["Positive", v.positive],
                    ["Paid", v.won],
                  ].map(([k, val]) => (
                    <div key={k as string} className="flex items-baseline gap-1.5">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="font-medium">{val}</dd>
                    </div>
                  ))}
                </dl>
              </Panel>
            )
          })}
        </div>
      )}
    </Page>
  )
}
