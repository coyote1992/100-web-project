import type { Metadata } from "next"
import { getWorld } from "@/lib/data"
import { buildRows } from "@/lib/metrics"
import { Page, PageHeader } from "@/components/app/page"
import { SitesTable, type SiteListRow } from "./sites-table"
import { NewSiteButton } from "@/components/app/new-site-button"

export const metadata: Metadata = { title: "Sites" }

export default async function SitesPage({ searchParams }: PageProps<"/sites">) {
  const sp = await searchParams
  const world = await getWorld()
  const rows = buildRows(world)
  const list: SiteListRow[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    city: r.city,
    verticalId: r.verticalId,
    verticalName: r.vertical?.name ?? "",
    hue: r.vertical?.hue ?? 0,
    batchId: r.batchId,
    batchName: r.batch?.name ?? "",
    build: r.build,
    stage: r.stage,
    parked: r.parked,
    status: r.status,
    specMinutes: r.specMinutes,
    lastActivityAt: r.lastActivityAt.getTime(),
    oldSiteUrl: r.oldSiteUrl,
    demoUrl: r.demoUrl,
    positive: r.positive,
  }))

  return (
    <Page>
      <PageHeader
        title="Sites"
        description="Every firm you've started on, in any form. Click a row to record the next step."
        actions={<NewSiteButton />}
      />
      <SitesTable
        rows={list}
        verticals={world.verticals.map((v) => ({ id: v.id, name: v.name, hue: v.hue }))}
        batches={world.batches.map((b) => ({ id: b.id, name: b.name }))}
        initialView={typeof sp.view === "string" ? sp.view : "all"}
        initialVertical={typeof sp.vertical === "string" ? sp.vertical : ""}
      />
    </Page>
  )
}
