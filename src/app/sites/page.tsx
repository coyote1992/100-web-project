import type { Metadata } from "next"
import { getWorld } from "@/lib/data"
import { buildRows } from "@/lib/metrics"
import { Page, PageHeader } from "@/components/app/page"
import { SitesTable, type SiteListRow } from "./sites-table"

export const metadata: Metadata = { title: "Sites" }

export default async function SitesPage({ searchParams }: PageProps<"/sites">) {
  const sp = await searchParams
  const world = await getWorld()
  const rows = buildRows(world)
  const list: SiteListRow[] = rows.map((r) => {
    const due = r.steps.find((s) => s.state === "due" && s.kind !== "build") ?? r.steps.find((s) => s.state === "due")
    const upcoming = r.steps.find((s) => s.state === "upcoming")
    return {
      id: r.id,
      name: r.name,
      city: r.city,
      verticalId: r.verticalId,
      verticalName: r.vertical?.name ?? "",
      hue: r.vertical?.hue ?? 0,
      build: r.build,
      stage: r.stage,
      status: r.status,
      oldSiteUrl: r.oldSiteUrl,
      demoUrl: r.demoUrl,
      next: due ? { title: due.title, due: true } : upcoming ? { title: upcoming.title, due: false, at: upcoming.due.getTime() } : null,
      lastMessage: r.lastMessage ? { direction: r.lastMessage.direction, at: r.lastMessage.at.getTime() } : null,
      lastActivityAt: r.lastActivityAt.getTime(),
      positive: r.reached.has("site_positive"),
    }
  })

  return (
    <Page>
      <PageHeader title="Sites" description="Every firm in the experiment. They're added by ChatGPT, one page each. Open one for the conversation, the notes ChatGPT pulled out of it, and the build prompt." />
      <SitesTable
        rows={list}
        verticals={world.verticals.map((v) => ({ id: v.id, name: v.name, hue: v.hue }))}
        initialView={typeof sp.view === "string" ? sp.view : "all"}
        initialVertical={typeof sp.vertical === "string" ? sp.vertical : ""}
      />
    </Page>
  )
}
