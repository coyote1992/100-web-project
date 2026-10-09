import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeftIcon, ArrowUpRightIcon, TriangleAlertIcon } from "lucide-react"
import { getWorld } from "@/lib/data"
import { getPackage } from "@/lib/domain"
import { buildRows } from "@/lib/metrics"
import { activity } from "@/lib/activity"
import { fillTemplate } from "@/lib/templates"
import { EXTRACT_KINDS, EXTRACT_LABEL, PIPELINE, STAGE_LABEL, actionsFrom, pipelineIndex } from "@/lib/flow"
import { cn } from "@/lib/utils"
import { dayTime, host, href } from "@/lib/format"
import { Page, Panel } from "@/components/app/page"
import { ActivityList } from "@/components/app/activity-list"
import { CopyBlock } from "@/components/app/copy-block"
import { StepActions } from "@/components/app/step-actions"
import { StagePill, VerticalTag } from "@/components/app/status"
import { Thread } from "./thread"
import { PackageUpload, BuildControls, CallControls, DetailsControls, LessonsPanel, StageFooter } from "./site-client"

export async function generateMetadata({ params }: PageProps<"/sites/[id]">): Promise<Metadata> {
  const { id } = await params
  const world = await getWorld()
  return { title: world.sites.find((s) => s.id === id)?.name ?? "Site" }
}

function Card({ title, aside, children, className }: { title: string; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <Panel className={cn("p-5", className)}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {aside && <div className="text-xs text-muted-foreground">{aside}</div>}
      </div>
      {children}
    </Panel>
  )
}

export default async function SitePage({ params }: PageProps<"/sites/[id]">) {
  const { id } = await params
  const world = await getWorld()
  const row = buildRows(world).find((r) => r.id === id)
  const pkg = row ? await getPackage(row.id).catch(() => null) : null
  if (!row) notFound()

  const { text: prompt, missing } = fillTemplate(world.templates.buildPrompt, row)
  const actions = actionsFrom(row.stage)
  const idx = pipelineIndex(row.stage)
  const history = activity(world, { siteId: id, kinds: ["stage"] })
  const shownSteps = [...row.steps].sort((a, b) => Number(b.state === "due") - Number(a.state === "due") || a.due.getTime() - b.due.getTime())
  const callRelevant = !!row.callAt || ["site_positive", "call_scheduling", "call_scheduled"].includes(row.stage)

  return (
    <Page className="max-w-[1180px]">
      <Link href="/sites" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-3.5" />
        Sites
      </Link>

      <header className="mb-8">
        <h1 className="display text-4xl leading-[1.05] text-balance sm:text-5xl">{row.name}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
          {row.vertical && (
            <Link href={`/verticals/${row.vertical.id}`} className="hover:text-foreground">
              <VerticalTag name={row.vertical.name} hue={row.vertical.hue} />
            </Link>
          )}
          {row.city && <span className="text-muted-foreground">{row.city}</span>}
          {row.oldSiteUrl && (
            <a href={href(row.oldSiteUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-muted-foreground underline decoration-border hover:text-foreground">
              {host(row.oldSiteUrl)}
              <ArrowUpRightIcon className="size-3" />
            </a>
          )}
          {row.demoUrl && (
            <a href={href(row.demoUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-medium underline decoration-st-move decoration-2 hover:decoration-foreground">
              Demo
              <ArrowUpRightIcon className="size-3" />
            </a>
          )}
        </div>
      </header>

      {/* Phones: one column in the order below. Desktop: conversation on the left, reference on the right. */}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-8">
        <div className="contents lg:grid lg:min-w-0 lg:gap-6">
          <Panel className="order-1 overflow-hidden lg:order-none">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5">
              <div className="flex items-center gap-3 text-sm">
                <span className="font-semibold">Where it stands</span>
                <StagePill stage={row.stage} status={row.status} />
              </div>
              <span className="num text-xs text-muted-foreground">Since {dayTime(row.stageAt)}</span>
            </div>
            <div className="px-5 pt-5 pb-5">
              <ol className="grid grid-cols-6 gap-1" aria-label="Progress">
                {PIPELINE.map((p, i) => {
                  const on = row.stage !== "lost" && i <= idx
                  return (
                    <li key={p.stage} className="min-w-0">
                      <span className={cn("block h-1.5 rounded-full", on ? (row.stage === "won" ? "bg-st-won" : "bg-st-move") : "bg-foreground/10")} />
                      <span className={cn("mt-1.5 block truncate text-xs", on ? "text-foreground" : "text-muted-foreground")}>{p.label}</span>
                    </li>
                  )
                })}
              </ol>

              {row.stage === "lost" ? (
                <p className="mt-5 text-sm">
                  <span className="font-medium">Closed.</span> <span className="text-muted-foreground">{row.lostReason || "No reason recorded."}</span>
                </p>
              ) : row.stage === "won" ? (
                <p className="mt-5 text-sm">
                  <span className="font-medium text-st-won">Paid client.</span>
                  {row.dealValue ? <span className="num text-muted-foreground"> Deal worth €{row.dealValue.toLocaleString()}.</span> : null}
                </p>
              ) : (
                <div className="mt-5 grid gap-3">
                  {shownSteps.length === 0 && <p className="text-sm text-muted-foreground">Waiting on them. Nothing for you to do yet.</p>}
                  {shownSteps.map((s) => (
                    <div key={s.kind} className={cn("rounded-lg border px-3.5 py-2.5", s.state === "due" ? "border-move-line bg-move-soft" : "bg-background")}>
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <p className="text-sm font-medium">{s.title}</p>
                        <span className={cn("num text-xs", s.state === "due" ? "text-foreground" : "text-muted-foreground")}>{s.state === "due" ? "now" : dayTime(s.due)}</span>
                      </div>
                      {s.detail && <p className="mt-0.5 text-sm text-muted-foreground">{s.detail}</p>}
                    </div>
                  ))}
                  {actions.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs text-muted-foreground">Record what happened</p>
                      <StepActions siteId={row.id} actions={actions} />
                    </div>
                  )}
                </div>
              )}
              <StageFooter id={row.id} name={row.name} canUndo={row.events.length > 1} />
            </div>
          </Panel>

          <section className="order-4 lg:order-none">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="text-[0.95rem] font-semibold tracking-tight">Conversation</h2>
              <span className="text-xs text-muted-foreground">{row.messages.length ? `${row.messages.length} emails · synced by ChatGPT, read-only` : "Synced by ChatGPT"}</span>
            </div>
            <Thread messages={row.messages} name={row.contactName || row.name} />
          </section>

          <section className="order-5 lg:order-none">
            <h2 className="mb-3 text-[0.95rem] font-semibold tracking-tight">Lessons</h2>
            <LessonsPanel siteId={row.id} lessons={row.lessons.map((l) => ({ id: l.id, body: l.body }))} />
          </section>

          <section className="order-7 lg:order-none">
            <h2 className="mb-2 text-[0.95rem] font-semibold tracking-tight">History</h2>
            <ActivityList items={history} empty="No steps recorded yet." />
          </section>
        </div>

        <div className="contents lg:grid lg:gap-6">
          <Card title="From the emails" aside="Pulled out by ChatGPT" className="order-2 lg:order-none">
            <div className="grid gap-5">
              {callRelevant ? (
                <div>
                  <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Call</h3>
                  {row.callAt ? (
                    <p className="text-sm">
                      <span className="font-medium">{dayTime(row.callAt)}</span>
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No time agreed yet.</p>
                  )}
                  {row.callNotes && <p className="mt-1 text-sm text-pretty text-muted-foreground">{row.callNotes}</p>}
                </div>
              ) : null}
              {EXTRACT_KINDS.map((k) => {
                const list = row.extracts.filter((e) => e.kind === k)
                if (!list.length) return null
                return (
                  <div key={k}>
                    <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">{EXTRACT_LABEL[k]}</h3>
                    <ul className="grid gap-1.5">
                      {list.map((e) => (
                        <li key={e.id} className="flex gap-2 text-sm text-pretty">
                          <span aria-hidden className={cn("mt-2 size-1 shrink-0 rounded-full", k === "objection" ? "bg-negative" : k === "interest" ? "bg-positive" : "bg-foreground/40")} />
                          {e.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
              {!row.extracts.length && !callRelevant && <p className="text-sm text-muted-foreground">Nothing yet. Objections, questions and signs of interest appear here once they write back.</p>}
            </div>
          </Card>

          <Card title="Build prompt" aside={row.build === "ready" ? "Site ready" : row.build === "building" ? "Building" : "Not built"} className="order-3 lg:order-none">
            {missing.length > 0 && (
              <div className="mb-3 flex gap-2 rounded-lg border border-move-line bg-move-soft px-3 py-2 text-sm">
                <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
                <p>
                  Missing {missing.join(", ")}.{" "}
                  {row.vertical && (
                    <Link href={`/verticals/${row.vertical.id}`} className="underline">
                      Set it on {row.vertical.name}
                    </Link>
                  )}
                </p>
              </div>
            )}
            <CopyBlock text={prompt} label="Build prompt" hint="Paste it into Claude Code. It has the references and the old site." />
            <div className="mt-4 border-t pt-4">
              <BuildControls id={row.id} build={row.build} demoUrl={row.demoUrl} />
              <div className="mt-4">
                <PackageUpload id={row.id} pkg={pkg} />
              </div>
            </div>
          </Card>

          {callRelevant && (
            <Card title="Call" className="order-6 lg:order-none">
              <CallControls id={row.id} callAt={row.callAt?.toISOString() ?? null} callNotes={row.callNotes} />
            </Card>
          )}

          <Card title="Details" className="order-6 lg:order-none">
            <DetailsControls id={row.id} site={{ oldSiteUrl: row.oldSiteUrl, contactName: row.contactName, city: row.city, email: row.email, phone: row.phone, questionVariant: row.questionVariant }} />
          </Card>
        </div>
      </div>
      <p className="sr-only">{STAGE_LABEL[row.stage]}</p>
    </Page>
  )
}
