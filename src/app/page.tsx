import Link from "next/link"
import { format } from "date-fns"
import { getWorld } from "@/lib/data"
import { buildRows, byVertical, funnel, rates, taskItems, timingOf } from "@/lib/metrics"
import { toViews } from "@/lib/taskviews"
import { activity } from "@/lib/activity"
import { money, pct } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Ledger, Page, Panel, Section } from "@/components/app/page"
import { HundredBoard, BoardLegend } from "@/components/app/hundred-board"
import { ActivityList } from "@/components/app/activity-list"
import { FunnelChart } from "@/components/app/funnel"
import { Onboarding } from "@/components/app/onboarding"
import { GroupedTasks } from "@/components/app/task-list"
import { AddTask } from "@/components/app/add-task"
import { VerticalMark } from "@/components/app/status"

export default async function Overview() {
  const world = await getWorld()
  if (!world.verticals.length && !world.sites.length)
    return (
      <Page>
        <Onboarding />
      </Page>
    )

  const rows = buildRows(world)
  const timing = timingOf(world.templates)
  const r = rates(rows, timing)
  const all = taskItems(rows, world.tasks)
  const due = toViews(all.filter((i) => i.state === "due"))
  const upcoming = toViews(all.filter((i) => i.state === "upcoming"))
  const names = new Map(rows.map((x) => [x.id, x.name]))
  const feed = activity(world, { limit: 9 })
  const hours = (h: number | null) => (h === null ? "—" : h < 1 ? `${Math.round(h * 60)} min` : h < 48 ? `${Math.round(h)} h` : `${Math.round(h / 24)} days`)

  return (
    <Page>
      <header className="mb-10">
        <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, d MMMM")}</p>
        <h1 className="display mt-3 max-w-[30ch] text-[2.1rem] leading-[1.12] text-balance sm:text-5xl sm:leading-[1.08]">
          <Figure>{rows.length}</Figure> sites in play across {world.verticals.length} verticals. <Figure tone="positive">{r.positive}</Figure> positive{" "}
          {r.positive === 1 ? "response" : "responses"} from <Figure>{r.siteSent}</Figure> sites sent
          {r.won > 0 && (
            <>
              , and <Figure tone="won">{r.won}</Figure> paid {r.won === 1 ? "client" : "clients"}
            </>
          )}
          .
        </h1>
      </header>

      <Ledger
        className="mb-12 border-y py-5"
        items={[
          { label: "Question answered", value: pct(r.questionRate), hint: `${r.questionReplied} of ${r.questionResolved} questions whose answer is known` },
          { label: "Site answered", value: pct(r.siteRate), hint: `${r.siteReplied} of ${r.siteResolved} sites whose answer is known` },
          { label: "Positive after site", value: pct(r.positiveRate) },
          { label: "Median time to reply", value: hours(r.medianSiteReplyHours ?? r.medianQuestionReplyHours) },
          { label: "Calls held", value: r.called },
          { label: "Revenue", value: money(r.revenue) },
        ]}
      />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 content-start gap-8">
          <Section title="Needs you" aside={due.length ? `${due.length} due` : undefined}>
            <GroupedTasks items={due} empty="All caught up. Nothing is waiting on you." />
          </Section>

          <AddTask sites={[...rows].sort((a, b) => a.name.localeCompare(b.name)).map((r) => ({ id: r.id, name: r.name }))} />

          {upcoming.length > 0 && (
            <details className="group">
              <summary className="mb-3 cursor-pointer list-none text-[0.95rem] font-semibold tracking-tight marker:hidden">
                <span className="mr-1.5 inline-block text-muted-foreground transition-transform duration-150 group-open:rotate-90">›</span>
                Coming up <span className="num ml-1 text-sm font-normal text-muted-foreground">{upcoming.length}</span>
              </summary>
              <GroupedTasks items={upcoming} />
            </details>
          )}
        </div>

        <Section title="The hundred" aside={<Link href="/verticals" className="hover:text-foreground">Verticals</Link>}>
          <Panel className="p-4 sm:p-5">
            <HundredBoard verticals={world.verticals} rows={rows} />
            <div className="mt-5 border-t pt-4">
              <BoardLegend />
            </div>
          </Panel>
          <table className="mt-5 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="pb-2 font-normal">Vertical</th>
                <th className="pb-2 text-right font-normal">Sent</th>
                <th className="pb-2 text-right font-normal">Answered</th>
                <th className="pb-2 text-right font-normal">Positive</th>
              </tr>
            </thead>
            <tbody className="num">
              {byVertical(rows, world.verticals, timing).map((v) => (
                <tr key={v.vertical.id} className="border-t">
                  <td className="py-2">
                    <Link href={`/verticals/${v.vertical.id}`} className="inline-flex items-center gap-2 hover:underline">
                      <VerticalMark hue={v.vertical.hue} />
                      {v.vertical.name}
                    </Link>
                  </td>
                  <td className="py-2 text-right">{v.siteSent}</td>
                  <td className="py-2 text-right">{pct(v.siteRate)}</td>
                  <td className="py-2 text-right font-medium">{v.positive}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <Section title="Where sites are" aside={<Link href="/insights" className="hover:text-foreground">Insights</Link>}>
          <Panel className="p-5">
            <FunnelChart data={funnel(rows)} />
          </Panel>
        </Section>
        <Section title="Latest" aside={<Link href="/sites" className="hover:text-foreground">All sites</Link>}>
          <ActivityList items={feed} names={names} empty="Once ChatGPT syncs your mailbox, replies show up here." />
        </Section>
      </div>
    </Page>
  )
}

function Figure({ children, tone }: { children: React.ReactNode; tone?: "positive" | "won" }) {
  return (
    <span className={cn("num relative inline-block font-sans text-[0.8em] font-medium tracking-[-0.03em]", tone === "positive" && "text-positive", tone === "won" && "text-st-won")}>
      {children}
    </span>
  )
}
