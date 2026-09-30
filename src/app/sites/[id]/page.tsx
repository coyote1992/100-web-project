import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeftIcon, ArrowUpRightIcon } from "lucide-react"
import { getSettings, getWorld } from "@/lib/data"
import { buildRows, logMinutes } from "@/lib/metrics"
import { activity } from "@/lib/activity"
import { fillPrompt } from "@/lib/prompt"
import { NODES, WORK_KINDS, type NodeKey } from "@/lib/flow"
import { ago, host, href } from "@/lib/format"
import { Page, Panel } from "@/components/app/page"
import { FlowBoard } from "@/components/app/flow-board"
import { ActivityList } from "@/components/app/activity-list"
import { BuildMeter, StagePill, VerticalTag } from "@/components/app/status"
import { StepRecorder } from "./step-recorder"
import { TimePanel } from "./time-panel"
import { BuildPanel, ContactPanel, DeleteItem, NoteComposer, PlacementPanel, SiteMenu } from "./panels"

export async function generateMetadata({ params }: PageProps<"/sites/[id]">): Promise<Metadata> {
  const { id } = await params
  const world = await getWorld()
  return { title: world.prospects.find((p) => p.id === id)?.name ?? "Site" }
}

export default async function SitePage({ params }: PageProps<"/sites/[id]">) {
  const { id } = await params
  const [world, settings] = await Promise.all([getWorld(), getSettings()])
  const row = buildRows(world).find((r) => r.id === id)
  if (!row) notFound()

  const logs = world.workLogs.filter((w) => w.prospectId === id)
  const running = world.workLogs.find((w) => !w.endedAt)
  const runningHere = running?.prospectId === id ? running : null
  const otherRunning = running && !runningHere ? (world.prospects.find((p) => p.id === running.prospectId)?.name ?? "general work") : null
  const breakdown = WORK_KINDS.map((k) => ({
    kind: k.key,
    minutes: logs.filter((l) => l.kind === k.key).reduce((a, l) => a + logMinutes(l), 0),
  }))
  const suggestedKind = row.build === "scouted" ? "research" : row.build === "building" ? "build" : row.stage ? "outreach" : "qa"
  const feed = activity(world, { prospectId: id })
  const methods = [...new Set(["Opus full", "Opus plan → Sonnet", ...world.prospects.map((p) => p.buildMethod).filter(Boolean)])]
  const prompt = fillPrompt(settings.prompt, row, row.vertical)
  const path = row.events.map((e) => e.node as NodeKey)
  const lastStep = row.events.at(-1)

  const site = {
    id: row.id,
    name: row.name,
    city: row.city,
    oldSiteUrl: row.oldSiteUrl,
    demoUrl: row.demoUrl,
    references: row.references,
    contactName: row.contactName,
    email: row.email,
    phone: row.phone,
    build: row.build,
    buildMethod: row.buildMethod,
    verticalId: row.verticalId,
    batchId: row.batchId,
  }

  return (
    <Page className="max-w-[1180px]">
      <Link href="/sites" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-3.5" />
        Sites
      </Link>

      <header className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="display text-4xl leading-[1.05] text-balance sm:text-5xl">{row.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
            {row.vertical && <VerticalTag name={row.vertical.name} hue={row.vertical.hue} />}
            {row.city && <span className="text-muted-foreground">{row.city}</span>}
            {row.batch && (
              <Link href="/batches" className="text-muted-foreground hover:text-foreground">
                {row.batch.name}
              </Link>
            )}
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
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SiteMenu site={site} prompt={prompt} />
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 content-start gap-8">
          <Panel className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5">
              <div className="flex items-center gap-3 text-sm">
                <span className="font-semibold">Where it stands</span>
                <StagePill stage={row.stage} parked={row.parked} />
              </div>
              <span className="text-xs text-muted-foreground">
                {lastStep ? `Last step ${ago(lastStep.at)}` : <BuildMeter build={row.build} />}
              </span>
            </div>
            <div className="px-5 py-5">
              <StepRecorder key={`${row.stage}-${row.parked}`} prospectId={row.id} stage={row.stage as NodeKey | null} parked={row.parked} build={row.build} dealValue={row.dealValue} />
            </div>
            <div className="paper-grid border-t px-2 py-2">
              <FlowBoard mode="path" path={path} />
            </div>
          </Panel>
          {/* Phones: the timer sits right under the status. Desktop: it heads the side column. */}
          <Panel className="p-5 lg:hidden">
            <TimePanel
              prospectId={row.id}
              running={runningHere ? { kind: runningHere.kind, startedAt: runningHere.startedAt.getTime(), minutes: runningHere.minutes } : null}
              otherRunning={otherRunning}
              breakdown={breakdown}
              specMinutes={row.specMinutes}
              suggestedKind={suggestedKind}
            />
          </Panel>
          <section>
            <h2 className="mb-3 text-[0.95rem] font-semibold tracking-tight">Notes & history</h2>
            <NoteComposer prospectId={row.id} />
            <div className="mt-4">
              <ActivityList
                items={feed}
                empty="No history yet. Log some time or record the first step."
                action={(it) => (it.deletable ? <DeleteItem type={it.deletable.type} id={it.deletable.id} /> : null)}
              />
            </div>
          </section>
        </div>

        <aside className="grid content-start gap-6">
          <Panel className="hidden p-5 lg:block">
            <TimePanel
              prospectId={row.id}
              running={runningHere ? { kind: runningHere.kind, startedAt: runningHere.startedAt.getTime(), minutes: runningHere.minutes } : null}
              otherRunning={otherRunning}
              breakdown={breakdown}
              specMinutes={row.specMinutes}
              suggestedKind={suggestedKind}
            />
          </Panel>
          <Panel className="p-5">
            <h2 className="mb-4 text-sm font-semibold">Build</h2>
            <BuildPanel site={site} methods={methods} />
          </Panel>
          <Panel className="p-5">
            <h2 className="mb-4 text-sm font-semibold">Details</h2>
            <div className="grid gap-4">
              <PlacementPanel
                site={site}
                verticals={world.verticals.map((v) => ({ id: v.id, name: v.name }))}
                batches={world.batches.map((b) => ({ id: b.id, name: b.name }))}
              />
              <ContactPanel site={site} />
            </div>
          </Panel>
          {row.stage && (
            <p className="px-1 text-xs leading-relaxed text-muted-foreground">
              Path so far: {path.filter((n, i) => !(n === "site_replied" && path[i + 1]?.startsWith("site_"))).map((n) => NODES[n].short).join(" → ")}
            </p>
          )}
        </aside>
      </div>
    </Page>
  )
}
