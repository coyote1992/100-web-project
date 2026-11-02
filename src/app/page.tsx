import { getWorld } from "@/lib/data"
import { buildRows } from "@/lib/metrics"
import { Page } from "@/components/app/page"
import { Onboarding } from "@/components/app/onboarding"
import { DashboardView, type DashRow } from "./dashboard"

export default async function Dashboard() {
  const world = await getWorld()
  const focus = world.verticals[0]
  if (!world.sites.length)
    return (
      <Page>
        <Onboarding hasVertical={!!focus} />
      </Page>
    )

  const rows: DashRow[] = buildRows(world).map((r) => ({
    id: r.id,
    name: r.name,
    city: r.city,
    board: r.board,
    callStatus: r.callStatus,
    unread: r.unread,
    phone: r.phone,
    phoneOwner: r.phoneOwner,
    contactName: r.contactName,
    contactRole: r.contactRole,
  }))

  return (
    <Page className="pt-6 sm:pt-8">
      <DashboardView title={focus?.name ?? "Tennis clubs"} rows={rows} />
    </Page>
  )
}
