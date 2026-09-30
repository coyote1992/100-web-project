import type { Metadata } from "next"
import Link from "next/link"
import { getWorld } from "@/lib/data"
import { buildRows, byBatch } from "@/lib/metrics"
import { day, hours, pct, ratio } from "@/lib/format"
import { Page, PageHeader, Panel } from "@/components/app/page"
import { StatusDot, VerticalMark } from "@/components/app/status"
import { BatchFields, NewBatch } from "./batch-client"

export const metadata: Metadata = { title: "Batches" }

export default async function BatchesPage() {
  const world = await getWorld()
  const rows = buildRows(world)
  const batches = byBatch(rows, world.batches).reverse()
  const loose = rows.filter((r) => !r.batchId).length

  return (
    <Page>
      <PageHeader
        title="Batches"
        description="A batch is a wave of sites you send out together. Comparing batches shows whether bigger waves, or a different approach, change the hit rate."
        actions={<NewBatch count={world.batches.length} />}
      />
      {loose > 0 && (
        <p className="mb-6 text-sm text-muted-foreground">
          {loose} site{loose > 1 ? "s aren't" : " isn't"} in a batch yet.{" "}
          <Link href="/sites" className="text-foreground underline">
            Select them on Sites
          </Link>{" "}
          to group them.
        </p>
      )}
      <div className="grid gap-4">
        {batches.map((b) => (
          <Panel key={b.batch.id} className="grid gap-6 p-5 md:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="display text-[1.7rem] leading-none">{b.batch.name}</h2>
                <span className="num text-xs text-muted-foreground">Created {day(b.batch.createdAt)}</span>
              </div>
              <dl className="num mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                {[
                  ["Size", b.size],
                  ["Contacted", b.contacted],
                  ["Positive", b.positives],
                  ["Positive rate", pct(b.positiveRate)],
                  ["Spec hours", hours(b.specHours)],
                  ["Pos / hour", ratio(b.pph)],
                ].map(([k, val]) => (
                  <div key={k as string} className="flex items-baseline gap-1.5">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-medium">{val}</dd>
                  </div>
                ))}
              </dl>
              <ul className="mt-5 flex flex-wrap gap-1.5">
                {b.rows.map((r) => (
                  <li key={r.id}>
                    <Link href={`/sites/${r.id}`} className="pressable inline-flex h-7 items-center gap-1.5 rounded-md border bg-background px-2 text-xs hover:bg-accent">
                      <StatusDot status={r.status} />
                      {r.name}
                      {r.vertical && <VerticalMark hue={r.vertical.hue} className="size-1.5" />}
                    </Link>
                  </li>
                ))}
                {b.rows.length === 0 && <li className="text-sm text-muted-foreground">Empty. Add sites from the Sites page.</li>}
              </ul>
            </div>
            <BatchFields id={b.batch.id} name={b.batch.name} notes={b.batch.notes} />
          </Panel>
        ))}
        {batches.length === 0 && (
          <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">No batches yet.</p>
        )}
      </div>
    </Page>
  )
}
