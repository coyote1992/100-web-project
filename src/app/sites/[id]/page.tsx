import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeftIcon, ArrowUpRightIcon, TriangleAlertIcon } from "lucide-react"
import { getWorld } from "@/lib/data"
import { listPackages } from "@/lib/domain"
import { buildRows } from "@/lib/metrics"
import { fillTemplate } from "@/lib/templates"
import { EXTRACT_KINDS, EXTRACT_LABEL } from "@/lib/flow"
import { cn } from "@/lib/utils"
import { dayTime, host, href } from "@/lib/format"
import { Page, Panel } from "@/components/app/page"
import { CopyBlock } from "@/components/app/copy-block"
import { PackageUpload } from "@/components/app/package-upload"
import { Thread } from "./thread"
import { BuildControls, CallControls, DeleteSite, DetailsControls, LessonsPanel, MarkSeen, StageStrip } from "./site-client"

export async function generateMetadata({ params }: PageProps<"/sites/[id]">): Promise<Metadata> {
  const { id } = await params
  const world = await getWorld()
  return { title: world.sites.find((s) => s.id === id)?.name ?? "Club" }
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

function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="min-w-0">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-[0.95rem] font-semibold tracking-tight">{title}</h2>
        {aside && <span className="text-xs text-muted-foreground">{aside}</span>}
      </div>
      {children}
    </section>
  )
}

export default async function SitePage({ params }: PageProps<"/sites/[id]">) {
  const { id } = await params
  const world = await getWorld()
  const row = buildRows(world).find((r) => r.id === id)
  if (!row) notFound()
  const pkgs = await listPackages({ kind: "site", id: row.id }).catch(() => [])
  const { text: prompt, missing } = fillTemplate(world.templates.buildPrompt, row)
  const extracts = EXTRACT_KINDS.map((k) => ({ kind: k, list: row.extracts.filter((e) => e.kind === k) })).filter((g) => g.list.length)

  return (
    <Page className="max-w-[1100px] pt-6 sm:pt-8">
      {row.unread && <MarkSeen id={row.id} />}
      <Link href="/" className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-3.5" />
        Dashboard
      </Link>

      <header className="mb-6">
        <h1 className="display text-4xl leading-[1.05] text-balance sm:text-5xl">{row.name}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
          {row.city && <span className="text-muted-foreground">{row.city}</span>}
          {row.oldSiteUrl && (
            <a href={href(row.oldSiteUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-muted-foreground underline decoration-border hover:text-foreground">
              {host(row.oldSiteUrl)}
              <ArrowUpRightIcon className="size-3" />
            </a>
          )}
          {row.demoUrl && (
            <a href={href(row.demoUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-medium underline decoration-2 hover:decoration-foreground" style={{ textDecorationColor: "var(--stage-3)" }}>
              New site
              <ArrowUpRightIcon className="size-3" />
            </a>
          )}
        </div>
      </header>

      <Panel className="mb-8 p-5">
        <StageStrip id={row.id} board={row.board} callStatus={row.callStatus} />
        {row.stage === "lost" && row.lostReason && <p className="mt-4 border-t pt-4 text-sm text-muted-foreground">{row.lostReason}</p>}
        {row.stage === "won" && row.dealValue ? <p className="num mt-4 border-t pt-4 text-sm text-muted-foreground">Deal worth €{row.dealValue.toLocaleString()}</p> : null}
      </Panel>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8">
          <Section title="Conversation" aside={row.messages.length ? `${row.messages.length} emails, synced by ChatGPT` : "Synced by ChatGPT"}>
            <Thread messages={row.messages} name={row.contactName || row.name} />
          </Section>

          {extracts.length > 0 && (
            <Section title="From the emails" aside="Pulled out by ChatGPT">
              <div className="grid gap-4 sm:grid-cols-2">
                {extracts.map(({ kind, list }) => (
                  <div key={kind}>
                    <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">{EXTRACT_LABEL[kind]}</h3>
                    <ul className="grid gap-1.5">
                      {list.map((e) => (
                        <li key={e.id} className="flex gap-2 text-sm text-pretty">
                          <span aria-hidden className={cn("mt-2 size-1 shrink-0 rounded-full", kind === "objection" ? "bg-negative" : kind === "interest" ? "bg-positive" : "bg-foreground/40")} />
                          {e.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section title="Lessons">
            <LessonsPanel siteId={row.id} lessons={row.lessons.map((l) => ({ id: l.id, body: l.body }))} />
          </Section>
        </div>

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6">
          <Card title="Build prompt" aside={row.build === "ready" ? "Site ready" : row.build === "building" ? "Building" : "Not built"}>
            {missing.length > 0 && (
              <div className="mb-3 flex gap-2 rounded-lg border border-move-line bg-move-soft px-3 py-2 text-sm">
                <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
                <p>
                  Missing {missing.join(", ")}.{" "}
                  <Link href="/templates" className="underline">
                    Add it in Templates
                  </Link>
                </p>
              </div>
            )}
            <CopyBlock text={prompt} label="Build prompt" hint="Paste it into Claude Code. It has the references and the old site." />
            <div className="mt-4 grid gap-4 border-t pt-4">
              <BuildControls id={row.id} build={row.build} demoUrl={row.demoUrl} />
              <PackageUpload kind="site" id={row.id} packages={pkgs} title="Package (zip)" />
            </div>
          </Card>

          <Card title="Call" aside={row.callAt ? dayTime(row.callAt) : undefined}>
            <CallControls id={row.id} callAt={row.callAt?.toISOString() ?? null} callNotes={row.callNotes} />
          </Card>

          <Card title="Details">
            <DetailsControls id={row.id} site={{ oldSiteUrl: row.oldSiteUrl, contactName: row.contactName, city: row.city, email: row.email, phone: row.phone }} />
            <div className="mt-5 border-t pt-4">
              <DeleteSite id={row.id} name={row.name} />
            </div>
          </Card>
        </div>
      </div>
    </Page>
  )
}
