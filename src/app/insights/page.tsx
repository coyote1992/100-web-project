import type { Metadata } from "next"
import Link from "next/link"
import { format } from "date-fns"
import { getWorld } from "@/lib/data"
import { buildRows, byQuestion, byVertical, byWeekday, daysToClose, funnel, lostAt, pathComparison, rates, replyDelays, timingOf, weekly } from "@/lib/metrics"
import { EXTRACT_LABEL, STAGE_LABEL } from "@/lib/flow"
import { money, pct } from "@/lib/format"
import { Ledger, Page, PageHeader, Panel, Section } from "@/components/app/page"
import { FunnelChart } from "@/components/app/funnel"
import { VerticalMark } from "@/components/app/status"
import { DelayChart, WeekdayChart, WeeklyCharts } from "./charts"

export const metadata: Metadata = { title: "Insights" }

const th = "pb-2 text-right font-normal first:text-left"
const td = "py-2.5 text-right first:text-left"

export default async function InsightsPage() {
  const world = await getWorld()
  const rows = buildRows(world)
  const timing = timingOf(world.templates)
  const r = rates(rows, timing)
  const verticals = byVertical(rows, world.verticals, timing)
  const questions = byQuestion(rows, timing)
  const paths = pathComparison(rows, timing)
  const weeks = weekly(rows)
  const close = daysToClose(rows)
  const lost = lostAt(rows)
  const byId = new Map(rows.map((x) => [x.id, x]))
  const said = world.extracts.filter((e) => e.kind === "objection" || e.kind === "question").slice(0, 8)
  const hours = (h: number | null) => (h === null ? "—" : h < 1 ? `${Math.round(h * 60)} min` : h < 48 ? `${Math.round(h)} h` : `${Math.round(h / 24)} days`)
  const small = r.siteResolved < 20

  return (
    <Page>
      <PageHeader
        title="Insights"
        description="What the experiment is saying. Rates only count sites whose answer is known: they replied, or the wait has run out. Small numbers are noisy, so read the n."
      />

      <Ledger
        className="mb-12 border-y py-5"
        items={[
          { label: "Question answered", value: pct(r.questionRate), hint: `${r.questionReplied} of ${r.questionResolved}` },
          { label: "Site answered", value: pct(r.siteRate), hint: `${r.siteReplied} of ${r.siteResolved}` },
          { label: "Positive after site", value: pct(r.positiveRate), hint: `Of ${r.siteResolved} sites with a known outcome` },
          { label: "Median reply time", value: hours(r.medianSiteReplyHours ?? r.medianQuestionReplyHours) },
          { label: "Days to close", value: close === null ? "—" : `${Math.round(close)} d` },
          { label: "Won", value: `${r.won} · ${money(r.revenue)}` },
        ]}
      />
      {small && <p className="-mt-8 mb-10 text-sm text-muted-foreground">Only {r.siteResolved} sites have a known outcome so far. Treat every percentage below as a hint, not a result.</p>}

      <div className="grid gap-10 lg:grid-cols-2">
        <Section title="The funnel" aside="Sites that ever reached each step">
          <Panel className="p-5">
            <FunnelChart data={funnel(rows)} />
          </Panel>
        </Section>
        <Section title="Does asking first help?" aside="Site sent after they replied vs. after silence">
          <Panel className="overflow-x-auto p-5">
            <table className="num w-full min-w-[420px] text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className={th}>Path</th>
                  <th className={th}>Sent</th>
                  <th className={th}>Answered</th>
                  <th className={th}>Positive, by any route</th>
                </tr>
              </thead>
              <tbody>
                {paths.map((p) => (
                  <tr key={p.label} className="border-t">
                    <td className={td}>{p.label}</td>
                    <td className={td}>{p.sent}</td>
                    <td className={td}>
                      {pct(p.resolved ? p.replied / p.resolved : null)} <span className="text-muted-foreground">n={p.resolved}</span>
                    </td>
                    <td className={`${td} font-medium`}>
                      {pct(p.resolved ? p.positive / p.resolved : null)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-sm text-pretty text-muted-foreground">If the two paths convert alike, the question step isn&rsquo;t what wins the reply, and the wait could be shorter.</p>
          </Panel>
        </Section>
      </div>

      <Section className="mt-12" title="When things happen">
        <Panel className="grid gap-8 p-5 md:grid-cols-2">
          <DelayChart data={replyDelays(rows)} />
          <WeekdayChart data={byWeekday(rows)} />
        </Panel>
      </Section>

      <Section className="mt-12" title="Pace" aside="Last 10 weeks">
        <Panel className="p-5">
          <WeeklyCharts data={weeks.map((w) => ({ label: format(w.week, "d MMM"), questions: w.questions, sites: w.sites, positives: w.positives }))} />
        </Panel>
      </Section>

      <Section className="mt-12" title="By vertical">
        <Panel className="overflow-x-auto p-5">
          <table className="num w-full min-w-[680px] text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className={th}>Vertical</th>
                <th className={th}>Sites</th>
                <th className={th}>Question answered</th>
                <th className={th}>Site answered</th>
                <th className={th}>Positive</th>
                <th className={th}>Calls</th>
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
                    {v.rows.length}
                    <span className="text-muted-foreground">/{v.vertical.target}</span>
                  </td>
                  <td className={td}>
                    {pct(v.questionRate)} <span className="text-muted-foreground">n={v.questionResolved}</span>
                  </td>
                  <td className={td}>
                    {pct(v.siteRate)} <span className="text-muted-foreground">n={v.siteResolved}</span>
                  </td>
                  <td className={`${td} font-medium`}>
                    {v.positive} <span className="font-normal text-muted-foreground">({pct(v.positiveRate)})</span>
                  </td>
                  <td className={td}>{v.called}</td>
                  <td className={td}>{v.won}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </Section>

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <Section title="By opening question" aside="Set on each site, or by ChatGPT when it sends">
          <Panel className="overflow-x-auto p-5">
            {questions.length ? (
              <table className="num w-full min-w-[420px] text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className={th}>Question</th>
                    <th className={th}>Sent</th>
                    <th className={th}>Answered</th>
                    <th className={th}>Positive</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q) => (
                    <tr key={q.name} className="border-t">
                      <td className={`${td} max-w-56 whitespace-normal`}>{q.name}</td>
                      <td className={td}>{q.questionSent}</td>
                      <td className={td}>
                        {pct(q.questionRate)} <span className="text-muted-foreground">n={q.questionResolved}</span>
                      </td>
                      <td className={`${td} font-medium`}>{q.positive}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-muted-foreground">Tell ChatGPT which question it used when it sends (questionVariant) and the questions get compared here.</p>
            )}
          </Panel>
        </Section>
        <Section title="Where sites are lost">
          <Panel className="p-5">
            {lost.length ? (
              <ul className="grid gap-2 text-sm">
                {lost.map((l) => (
                  <li key={l.stage} className="flex items-center justify-between">
                    <span>{STAGE_LABEL[l.stage]}</span>
                    <span className="num font-medium">{l.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing closed yet.</p>
            )}
          </Panel>
        </Section>
      </div>

      <Section className="mt-12" title="What they say" aside="Latest objections and questions from the emails">
        <Panel className="divide-y">
          {said.length === 0 && <p className="p-5 text-sm text-muted-foreground">Nothing extracted yet.</p>}
          {said.map((e) => (
            <div key={e.id} className="flex items-start gap-3 px-4 py-3 text-sm">
              <span className="mt-0.5 w-20 shrink-0 text-xs text-muted-foreground">{EXTRACT_LABEL[e.kind].replace(/s$/, "")}</span>
              <p className="min-w-0 flex-1 text-pretty">{e.text}</p>
              <Link href={`/sites/${e.siteId}`} className="max-w-40 shrink-0 truncate text-xs text-muted-foreground hover:text-foreground hover:underline">
                {byId.get(e.siteId)?.name}
              </Link>
            </div>
          ))}
        </Panel>
      </Section>
    </Page>
  )
}
