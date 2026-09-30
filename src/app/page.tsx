import Link from "next/link"
import { format } from "date-fns"
import { ArrowUpRightIcon } from "lucide-react"
import { getSettings, getWorld } from "@/lib/data"
import { attention, buildRows, byVertical, flowCounts, replyRates, stats } from "@/lib/metrics"
import { activity } from "@/lib/activity"
import { hours, money, pct, ratio } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Page, Panel, Section, Ledger } from "@/components/app/page"
import { HundredBoard, BoardLegend } from "@/components/app/hundred-board"
import { FlowBoard } from "@/components/app/flow-board"
import { ActivityList } from "@/components/app/activity-list"
import { Onboarding } from "@/components/app/onboarding"
import { StagePill, VerticalMark } from "@/components/app/status"

export default async function Overview() {
  const world = await getWorld()
  if (!world.verticals.length) {
    return (
      <Page>
        <Onboarding />
      </Page>
    )
  }

  const rows = buildRows(world)
  const s = stats(rows)
  const rr = replyRates(rows)
  const flow = flowCounts(rows)
  const todo = attention(rows, undefined, (await getSettings()).chaseDays)
  const names = new Map(rows.map((r) => [r.id, r.name]))
  const feed = activity(world, { limit: 9, kinds: ["step", "lesson", "email"] })

  return (
    <Page>
      <header className="mb-10">
        <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, d MMMM")}</p>
        <h1 className="display mt-3 max-w-[30ch] text-[2.1rem] leading-[1.12] text-balance sm:text-5xl sm:leading-[1.08]">
          <Figure>{s.count}</Figure> sites in play across {world.verticals.length} verticals.{" "}
          <Figure tone="positive">{s.positives}</Figure> positive {s.positives === 1 ? "response" : "responses"} from{" "}
          <Figure>{hours(s.specHours)}</Figure> of speculative work
          {s.won > 0 && (
            <>
              , and <Figure tone="won">{s.won}</Figure> paid {s.won === 1 ? "client" : "clients"}
            </>
          )}
          .
        </h1>
      </header>

      <Ledger
        className="mb-12 border-y py-5"
        items={[
          { label: "Positive / hour of spec work", value: ratio(s.pph), hint: "Positive responses ÷ hours logged on research, build, QA and outreach" },
          { label: "Positive / site contacted", value: pct(s.positiveRate) },
          { label: "Reply to question", value: pct(rr.question.rate), hint: "Of questions resolved (replied or marked no reply)" },
          { label: "Reply to site", value: pct(rr.site.rate), hint: "Of sites resolved (replied or marked no reply)" },
          { label: "Median reply time", value: rr.medianReplyDays === null ? "—" : `${ratio(rr.medianReplyDays, 1)}d` },
          { label: "Revenue", value: money(s.revenue) },
        ]}
      />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <Section title="Needs you" aside={todo.length ? `${todo.length} open` : undefined}>
          {todo.length === 0 ? (
            <Panel className="p-6 text-sm text-muted-foreground">All caught up. Nothing is waiting on you.</Panel>
          ) : (
            <Panel className="divide-y overflow-hidden">
              {todo.slice(0, 7).map(({ row, reason, tone }) => (
                <Link
                  key={row.id}
                  href={`/sites/${row.id}`}
                  className="group flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-accent/60"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "h-8 w-1 shrink-0 rounded-full",
                      tone === "move" && "bg-st-move",
                      tone === "chase" && "bg-st-wait",
                      tone === "inbox" && "bg-positive",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <span className="truncate">{row.name}</span>
                      {row.vertical && <VerticalMark hue={row.vertical.hue} />}
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">{reason}</span>
                  </span>
                  <ArrowUpRightIcon className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
                </Link>
              ))}
              {todo.length > 7 && (
                <Link href="/sites?view=move" className="block px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground">
                  {todo.length - 7} more…
                </Link>
              )}
            </Panel>
          )}
        </Section>

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
                <th className="pb-2 text-right font-normal">Contacted</th>
                <th className="pb-2 text-right font-normal">Positive</th>
                <th className="hidden pb-2 text-right font-normal sm:table-cell">Spec hours</th>
                <th className="pb-2 text-right font-normal">Pos / hour</th>
              </tr>
            </thead>
            <tbody className="num">
              {byVertical(rows, world.verticals).map((v) => (
                <tr key={v.vertical.id} className="border-t">
                  <td className="py-2">
                    <Link href={`/verticals/${v.vertical.id}`} className="inline-flex items-center gap-2 hover:underline">
                      <VerticalMark hue={v.vertical.hue} />
                      {v.vertical.name}
                    </Link>
                  </td>
                  <td className="py-2 text-right">{v.contacted}</td>
                  <td className="py-2 text-right">{v.positives}</td>
                  <td className="hidden py-2 text-right sm:table-cell">{hours(v.specHours)}</td>
                  <td className="py-2 text-right font-medium">{ratio(v.pph)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>

      <Section
        className="mt-12"
        title="Outreach flow"
        aside="How many sites reached each step. Line weight shows volume."
      >
        <Panel className="paper-grid p-3 sm:p-4">
          <FlowBoard mode="totals" nodes={flow.nodes} edges={flow.edges} />
        </Panel>
      </Section>

      <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Section title="Latest" aside={<Link href="/sites" className="hover:text-foreground">All sites</Link>}>
          <ActivityList items={feed} names={names} empty="Record your first step and it will show up here." />
        </Section>
        <Section title="Recently touched">
          <Panel className="divide-y">
            {[...rows]
              .sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime())
              .slice(0, 6)
              .map((r) => (
                <Link key={r.id} href={`/sites/${r.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-accent/60">
                  <span className="truncate font-medium">{r.name}</span>
                  <StagePill stage={r.stage} parked={r.parked} className="text-muted-foreground" />
                </Link>
              ))}
          </Panel>
        </Section>
      </div>
    </Page>
  )
}

function Figure({ children, tone }: { children: React.ReactNode; tone?: "positive" | "won" }) {
  return (
    <span
      className={cn(
        "num relative inline-block font-sans text-[0.8em] font-medium tracking-[-0.03em]",
        tone === "positive" && "text-positive",
        tone === "won" && "text-st-won",
      )}
    >
      {children}
    </span>
  )
}
