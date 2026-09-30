import type { Metadata } from "next"
import Link from "next/link"
import { format } from "date-fns"
import { getWorld } from "@/lib/data"
import { buildRows, byBatch, byVertical, replyRates, stats, weekly } from "@/lib/metrics"
import { hours, money, pct, ratio } from "@/lib/format"
import { Page, PageHeader, Panel, Section, Ledger } from "@/components/app/page"
import { VerticalMark } from "@/components/app/status"
import { BatchScatter, PphBars, WeeklyCharts } from "./charts"

export const metadata: Metadata = { title: "Insights" }

export default async function InsightsPage() {
  const world = await getWorld()
  const rows = buildRows(world)
  const s = stats(rows)
  const rr = replyRates(rows)
  const verticals = byVertical(rows, world.verticals)
  const batches = byBatch(rows, world.batches).filter((b) => b.size > 0)
  const weeks = weekly(rows, world.workLogs)

  // Build method experiment: does the cheaper pipeline cost anything in replies?
  const methods = [...new Set(rows.map((r) => r.buildMethod).filter(Boolean))].map((m) => {
    const mr = rows.filter((r) => r.buildMethod === m)
    const st = stats(mr)
    const buildMin = mr.map((r) => r.specMinutes).filter(Boolean)
    return { method: m, ...st, avgHours: buildMin.length ? buildMin.reduce((a, b) => a + b, 0) / buildMin.length / 60 : null }
  })

  const th = "pb-2 text-right font-normal first:text-left"
  const td = "py-2.5 text-right first:text-left"

  return (
    <Page>
      <PageHeader title="Insights" description="What the experiment is saying so far. Every number here comes from the steps, time and emails you record." />

      <Ledger
        className="mb-12 border-y py-5"
        items={[
          { label: "Positive / spec hour", value: ratio(s.pph) },
          { label: "Positive / site contacted", value: pct(s.positiveRate) },
          { label: "Spec hours per site", value: s.hoursPerSite === null ? "—" : hours(s.hoursPerSite) },
          { label: "Hours per positive", value: s.positives ? hours(s.specHours / s.positives) : "—" },
          { label: "Won", value: `${s.won} · ${money(s.revenue)}` },
          { label: "€ per spec hour", value: s.specHours ? money(s.revenue / s.specHours) : "—" },
        ]}
      />

      <Section title="Week by week" aside="Last 10 weeks">
        <Panel className="p-5">
          <WeeklyCharts data={weeks.map((w) => ({ label: format(w.week, "d MMM"), hours: w.hours, sent: w.sent, positives: w.positives }))} />
        </Panel>
      </Section>

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <Section title="Positive responses per spec hour, by vertical">
          <Panel className="p-5">
            <PphBars data={verticals.map((v) => ({ name: v.vertical.name, pph: Number((v.pph ?? 0).toFixed(3)) }))} />
          </Panel>
        </Section>
        <Section title="Batch size vs. positive rate" aside="One dot per batch">
          <Panel className="p-5">
            {batches.length ? (
              <BatchScatter data={batches.map((b) => ({ name: b.batch.name.split("·")[0].trim().replace(/\s+/g, "\u00a0"), size: b.size, rate: b.positiveRate ?? 0, pph: b.pph ?? 0 }))} />
            ) : (
              <p className="py-16 text-center text-sm text-muted-foreground">Group sites into batches to see this.</p>
            )}
          </Panel>
        </Section>
      </div>

      <Section className="mt-12" title="By vertical">
        <Panel className="overflow-x-auto p-5">
          <table className="num w-full min-w-[720px] text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className={th}>Vertical</th>
                <th className={th}>Sites</th>
                <th className={th}>Contacted</th>
                <th className={th}>Reply to question</th>
                <th className={th}>Reply to site</th>
                <th className={th}>Positive</th>
                <th className={th}>Spec hours</th>
                <th className={th}>Pos / hour</th>
                <th className={th}>Paid</th>
              </tr>
            </thead>
            <tbody>
              {verticals.map((v) => (
                <tr key={v.vertical.id} className="border-t">
                  <td className={td}>
                    <Link href={`/verticals/${v.vertical.id}`} className="inline-flex items-center gap-2 font-medium hover:underline">
                      <VerticalMark hue={v.vertical.hue} />
                      {v.vertical.name}
                    </Link>
                  </td>
                  <td className={td}>
                    {v.count}
                    <span className="text-muted-foreground">/{v.vertical.target}</span>
                  </td>
                  <td className={td}>{v.contacted}</td>
                  <td className={td}>{pct(v.question.rate)}</td>
                  <td className={td}>{pct(v.site.rate)}</td>
                  <td className={td}>
                    {v.positives} <span className="text-muted-foreground">({pct(v.positiveRate)})</span>
                  </td>
                  <td className={td}>{hours(v.specHours)}</td>
                  <td className={`${td} font-medium`}>{ratio(v.pph)}</td>
                  <td className={td}>{v.won}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </Section>

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <Section title="By batch">
          <Panel className="overflow-x-auto p-5">
            {batches.length ? (
              <table className="num w-full min-w-[460px] text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className={th}>Batch</th>
                    <th className={th}>Size</th>
                    <th className={th}>Positive</th>
                    <th className={th}>Rate</th>
                    <th className={th}>Pos / hour</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.batch.id} className="border-t">
                      <td className={`${td} font-medium`}>{b.batch.name}</td>
                      <td className={td}>{b.size}</td>
                      <td className={td}>{b.positives}</td>
                      <td className={td}>{pct(b.positiveRate)}</td>
                      <td className={`${td} font-medium`}>{ratio(b.pph)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-muted-foreground">No batches yet.</p>
            )}
          </Panel>
        </Section>
        <Section title="By build method" aside="Is the cheaper pipeline costing replies?">
          <Panel className="overflow-x-auto p-5">
            {methods.length ? (
              <table className="num w-full min-w-[460px] text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className={th}>Method</th>
                    <th className={th}>Sites</th>
                    <th className={th}>Avg spec time</th>
                    <th className={th}>Positive rate</th>
                    <th className={th}>Pos / hour</th>
                  </tr>
                </thead>
                <tbody>
                  {methods.map((m) => (
                    <tr key={m.method} className="border-t">
                      <td className={`${td} font-medium`}>{m.method}</td>
                      <td className={td}>{m.count}</td>
                      <td className={td}>{m.avgHours === null ? "—" : hours(m.avgHours)}</td>
                      <td className={td}>{pct(m.positiveRate)}</td>
                      <td className={`${td} font-medium`}>{ratio(m.pph)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-muted-foreground">Fill in &ldquo;Build method&rdquo; on sites to compare pipelines.</p>
            )}
          </Panel>
        </Section>
      </div>

      <p className="mt-10 max-w-[70ch] text-sm text-muted-foreground">
        <strong className="font-medium text-foreground">How these are counted.</strong> A positive response is a site that reached
        &ldquo;Positive&rdquo;, &ldquo;Call &amp; Proposal&rdquo; or &ldquo;Paid&rdquo;. Speculative hours are research, build, QA and
        outreach time; calls and admin are left out. Reply rates only count sites where you&rsquo;ve recorded an answer or marked
        &ldquo;No reply&rdquo;, so fresh sends don&rsquo;t drag them down. Median reply time is {rr.medianReplyDays === null ? "not available yet" : `${ratio(rr.medianReplyDays, 1)} days`}.
      </p>
    </Page>
  )
}
