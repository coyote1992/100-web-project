import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeftIcon, ArrowRightIcon, ArrowUpRightIcon, MailIcon } from "lucide-react"
import { getWorld } from "@/lib/data"
import { buildRows } from "@/lib/metrics"
import { BOARD_LABEL, boardOf } from "@/lib/flow"
import { cn } from "@/lib/utils"
import { dayTime, host, href } from "@/lib/format"
import { Page } from "@/components/app/page"
import { STAGE_COLOR } from "@/lib/stage-colors"
import { Body } from "./thread"
import { CallBox, CallControls, DeleteSite, DetailsList, LessonsPanel, MarkSeen, StageBox } from "./site-client"

export async function generateMetadata({ params }: PageProps<"/sites/[id]">): Promise<Metadata> {
  const { id } = await params
  const world = await getWorld()
  return { title: world.sites.find((s) => s.id === id)?.name ?? "Club" }
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 rounded-2xl border bg-surface p-4">
      <h2 className="text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">{title}</h2>
      {children}
    </section>
  )
}

export default async function SitePage({ params }: PageProps<"/sites/[id]">) {
  const { id } = await params
  const world = await getWorld()
  const row = buildRows(world).find((r) => r.id === id)
  if (!row) notFound()

  // One story: every move to a new dashboard stage and every email, oldest first.
  type Item = { at: Date; kind: "stage"; board: ReturnType<typeof boardOf> } | { at: Date; kind: "mail"; m: (typeof row.messages)[number] }
  const items: Item[] = []
  let last: ReturnType<typeof boardOf> | null = null
  for (const e of row.events) {
    const b = boardOf(e.stage)
    if (e.stage !== "new" && b !== last) items.push({ at: e.at, kind: "stage", board: b })
    last = b
  }
  for (const m of row.messages) items.push({ at: m.at, kind: "mail", m })
  items.sort((a, b) => a.at.getTime() - b.at.getTime() || (a.kind === "stage" ? -1 : 1))
  const who = row.contactName || row.name

  return (
    <Page className="max-w-[1100px] pt-6 sm:pt-8">
      {row.unread && <MarkSeen id={row.id} />}
      <Link href="/" className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-3.5" />
        Dashboard
      </Link>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="min-w-0">
          <h1 className="display text-[2rem] leading-[1.05] text-balance sm:text-[2.4rem]">{row.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {row.city && <span className="text-muted-foreground">{row.city}</span>}
            {row.oldSiteUrl && (
              <a href={href(row.oldSiteUrl)} target="_blank" rel="noreferrer" className="font-medium text-court underline decoration-court/30 underline-offset-4 hover:decoration-court">
                {host(row.oldSiteUrl)}
              </a>
            )}
            {row.demoUrl && (
              <a href={href(row.demoUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-semibold text-court underline decoration-court/30 underline-offset-4 hover:decoration-court">
                New site
                <ArrowUpRightIcon className="size-3.5" />
              </a>
            )}
          </div>

          {items.length === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No emails yet. When ChatGPT syncs the mailbox, the conversation with {who} shows up here.</p>
          ) : (
            <ol className="mt-6 grid">
              {items.map((it, i) => (
                <li key={i} className="relative grid grid-cols-[26px_minmax(0,1fr)] gap-3 pb-4 last:pb-0">
                  {i < items.length - 1 && <span aria-hidden className="absolute top-[26px] bottom-0 left-3 w-0.5 bg-border" />}
                  {it.kind === "stage" ? (
                    <>
                      <span className="grid size-[26px] place-items-center rounded-full bg-soft" style={{ color: STAGE_COLOR[it.board] }}>
                        <ArrowRightIcon className="size-3.5" />
                      </span>
                      <p className="pt-[3px] text-[13px] text-muted-foreground">
                        Moved to <span className="font-semibold text-foreground">{BOARD_LABEL[it.board]}</span> · {dayTime(it.at)}
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="grid size-[26px] place-items-center rounded-full bg-soft text-court">
                        <MailIcon className="size-3.5" />
                      </span>
                      <div className={cn("min-w-0 rounded-[14px] px-3.5 py-2.5", it.m.direction === "in" ? "bg-soft" : "border")}>
                        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 text-[12.5px] text-muted-foreground">
                          <span className="font-semibold text-foreground">{it.m.direction === "out" ? "You" : who}</span>
                          <time className="num" dateTime={it.m.at.toISOString()}>
                            {dayTime(it.m.at)}
                          </time>
                        </div>
                        {it.m.subject && <p className="mb-0.5 text-sm font-medium">{it.m.subject}</p>}
                        <Body text={it.m.body || "(empty message)"} />
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ol>
          )}

          <section className="mt-10">
            <h2 className="mb-3 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">Lessons</h2>
            <LessonsPanel siteId={row.id} lessons={row.lessons.map((l) => ({ id: l.id, body: l.body }))} />
          </section>
        </div>

        <aside className="grid gap-3 lg:sticky lg:top-20">
          <Box title="Stage">
            <StageBox id={row.id} board={row.board} />
            {row.stage === "lost" && row.lostReason && <p className="text-sm text-muted-foreground">{row.lostReason}</p>}
            {row.stage === "won" && row.dealValue ? <p className="num text-sm text-muted-foreground">Deal worth €{row.dealValue.toLocaleString()}</p> : null}
          </Box>
          <Box title="Call">
            <CallBox id={row.id} callStatus={row.callStatus} />
            <div className="border-t pt-3">
              <CallControls id={row.id} callAt={row.callAt?.toISOString() ?? null} callNotes={row.callNotes} />
            </div>
          </Box>
          <Box title="Details">
            <DetailsList
              id={row.id}
              site={{ contactName: row.contactName, contactRole: row.contactRole, phone: row.phone, phoneOwner: row.phoneOwner, email: row.email, oldSiteUrl: row.oldSiteUrl, city: row.city }}
            />
            <div className="border-t pt-3">
              <DeleteSite id={row.id} name={row.name} />
            </div>
          </Box>
        </aside>
      </div>
    </Page>
  )
}
