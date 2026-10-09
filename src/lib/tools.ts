import "server-only"
import { z } from "zod"
import * as d from "./domain"
import { getWorld } from "./data"
import { buildRows, funnel, rates, taskItems, timingOf, type SiteRow } from "./metrics"
import { BUILD_STATES, EXTRACT_KINDS, STAGES, STAGE_LABEL } from "./flow"
import { fillTemplate, PLACEHOLDERS } from "./templates"
import { guide } from "./guide"
import { taskList } from "./api"

/**
 * The tools the Hundred plugin exposes over MCP. Everything the app can do is a tool,
 * so one sentence in a chat can be carried out. Writes go through the same domain code as the web UI.
 */

export type ToolCtx = { base: string }
export type Tool = {
  name: string
  title: string
  description: string
  input: z.ZodObject
  readOnly?: boolean
  destructive?: boolean
  idempotent?: boolean
  run: (args: never, ctx: ToolCtx) => Promise<unknown>
}

const iso = (d?: Date | null) => (d ? d.toISOString() : null)
const dateStr = z.string().refine((s) => !Number.isNaN(Date.parse(s)), "must be an ISO 8601 date-time, e.g. 2026-10-05T14:30:00+02:00")

/** Name, id or email → one site. Fails with the candidates when it isn't unique. */
const siteRef = z.object({
  site: z.string().min(1).describe("The firm: its name (partial is fine), its id, or its email address."),
})

/** A zip belongs to a firm or to a vertical: exactly one of the two is given. */
const target = {
  site: z.string().optional().describe("The firm: name, id or email. Give this or vertical."),
  vertical: z.string().optional().describe("The vertical's name or id. Give this or site."),
}
type Target = { site?: string; vertical?: string }

async function resolveTarget(a: Target) {
  if (!!a.site === !!a.vertical) throw new d.DomainError("Give exactly one of site or vertical.", 422)
  if (a.site) {
    const r = await resolveSite(a.site)
    return { owner: { kind: "site" as const, id: r.id }, label: r.name, page: `/sites/${r.id}`, arg: `site="${r.name}"` }
  }
  const v = await d.findVertical(a.vertical!)
  return { owner: { kind: "vertical" as const, id: v.id }, label: v.name, page: `/verticals/${v.id}`, arg: `vertical="${v.name}"` }
}

async function resolveSite(ref: string): Promise<SiteRow> {
  const rows = buildRows(await getWorld())
  const q = ref.trim().toLowerCase()
  const exact = rows.find((r) => r.id === ref.trim() || r.email.toLowerCase() === q || r.name.toLowerCase() === q)
  if (exact) return exact
  const part = rows.filter((r) => r.name.toLowerCase().includes(q) || (r.oldSiteUrl && r.oldSiteUrl.toLowerCase().includes(q)))
  if (part.length === 1) return part[0]
  if (part.length > 1) throw new d.DomainError(`"${ref}" matches ${part.length} sites: ${part.slice(0, 8).map((r) => `${r.name} (${r.vertical?.name ?? "?"})`).join(", ")}. Use the id or a longer name.`)
  throw new d.DomainError(`No site matches "${ref}". Use list_sites to see them.`)
}

function compact(r: SiteRow) {
  const due = r.steps.filter((s) => s.state === "due")
  return {
    id: r.id,
    name: r.name,
    vertical: r.vertical?.name ?? null,
    city: r.city,
    email: r.email,
    stage: r.stage,
    stageLabel: STAGE_LABEL[r.stage],
    stageSince: iso(r.stageAt),
    build: r.build,
    demoUrl: r.demoUrl || null,
    callAt: iso(r.callAt),
    dueNow: due.map((s) => s.title),
    lastMessage: r.lastMessage ? { direction: r.lastMessage.direction, at: iso(r.lastMessage.at) } : null,
    emails: r.messages.length,
  }
}

const emailItem = z.object({
  site: z.string().optional().describe("The firm (name, id or email). Optional: otherwise it is matched by the email address."),
  email: z.string().optional().describe("The firm's address, if `site` isn't given."),
  direction: z.enum(["in", "out"]).describe("in = they wrote to me, out = I wrote to them."),
  from: z.string().optional(),
  to: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().optional().describe("Plain text without long quoted history."),
  at: dateStr.optional().describe("When it was really sent."),
  externalId: z.string().optional().describe("The Gmail message id. Makes re-logging safe."),
  sentKind: z.enum(["question", "site", "call_scheduling"]).optional().describe("For outgoing mail: which step this email was. Moves the site's stage."),
  questionVariant: z.string().optional().describe("For the opening question: which question it was."),
})

export const TOOLS: Tool[] = [
  {
    name: "get_guide",
    title: "Read the operating guide",
    description: "Returns the full operating guide: the outreach flow, the 30-minute mailbox sweep, how to add firms and send emails, and the rules. Read it before emailing, sweeping the mailbox, or changing a stage.",
    input: z.object({}),
    readOnly: true,
    run: async () => ({ guide: guide() }),
  },
  {
    name: "get_overview",
    title: "Get the overall picture",
    description: "How the experiment is going: sites per stage and vertical, funnel, reply and positive rates, what is due now, and when the mailbox was last synced.",
    input: z.object({}),
    readOnly: true,
    run: async () => {
      const world = await getWorld()
      const rows = buildRows(world)
      const r = rates(rows, timingOf(world.templates))
      const due = taskItems(rows, world.tasks).filter((i) => i.state === "due")
      const byStage: Record<string, number> = {}
      for (const s of rows) byStage[s.stage] = (byStage[s.stage] ?? 0) + 1
      return {
        sites: rows.length,
        byStage,
        verticals: world.verticals.map((v) => ({ name: v.name, sites: rows.filter((x) => x.verticalId === v.id).length, target: v.target, referenceSites: [v.reference1, v.reference2].filter(Boolean).length })),
        funnel: funnel(rows).map((f) => ({ step: f.label, sites: f.count })),
        rates: { questionAnswered: r.questionRate, siteAnswered: r.siteRate, positiveAfterSite: r.positiveRate, won: r.won, revenueEur: r.revenue },
        dueNow: due.length,
        lastMailboxSync: iso(world.lastSyncAt),
      }
    },
  },
  {
    name: "list_sites",
    title: "List sites",
    description: "Lists firms with stage, build state, email, what is due and the last message. Filter by stage, vertical, text, or only those needing attention. Use get_site for the full conversation.",
    input: z.object({
      stage: z.enum(STAGES).optional(),
      vertical: z.string().optional().describe("Vertical name"),
      search: z.string().optional().describe("Part of a name, city, website or email"),
      needs_attention: z.boolean().optional().describe("Only sites with something due now"),
    }),
    readOnly: true,
    run: async (a: { stage?: string; vertical?: string; search?: string; needs_attention?: boolean }) => {
      let rows = buildRows(await getWorld())
      if (a.stage) rows = rows.filter((r) => r.stage === a.stage)
      if (a.vertical) rows = rows.filter((r) => r.vertical?.name.toLowerCase() === a.vertical!.toLowerCase())
      if (a.search) {
        const q = a.search.toLowerCase()
        rows = rows.filter((r) => `${r.name} ${r.city} ${r.oldSiteUrl} ${r.email}`.toLowerCase().includes(q))
      }
      if (a.needs_attention) rows = rows.filter((r) => r.steps.some((s) => s.state === "due"))
      const world = await getWorld()
      return { count: rows.length, lastMailboxSync: iso(world.lastSyncAt), sites: rows.map(compact) }
    },
  },
  {
    name: "get_site",
    title: "Get one site in full",
    description: "Everything about one firm: contact details, stage and history, the email conversation, extracted notes, lessons, call details, what is due, and ready-filled drafts of the send-the-site email, the call-scheduling email and the build prompt.",
    input: siteRef,
    readOnly: true,
    run: async (a: { site: string }, ctx) => {
      const r = await resolveSite(a.site)
      const world = await getWorld()
      const vars = { name: r.name, city: r.city, oldSiteUrl: r.oldSiteUrl, demoUrl: r.demoUrl, contactName: r.contactName, vertical: r.vertical }
      return {
        ...compact(r),
        oldSiteUrl: r.oldSiteUrl,
        phone: r.phone,
        contactName: r.contactName,
        questionVariant: r.questionVariant,
        callNotes: r.callNotes,
        lostReason: r.lostReason,
        dealValue: r.dealValue,
        pageUrl: `${ctx.base}/sites/${r.id}`,
        history: r.events.map((e) => ({ stage: e.stage, at: iso(e.at), note: e.note })),
        messages: r.messages.map((m) => ({ id: m.id, direction: m.direction, at: iso(m.at), subject: m.subject, body: m.body })),
        extracts: r.extracts.map((e) => ({ id: e.id, kind: e.kind, text: e.text })),
        lessons: r.lessons.map((l) => ({ id: l.id, body: l.body })),
        drafts: {
          sendSiteEmail: fillTemplate(world.templates.sendSiteTemplate, vars).text,
          callSchedulingEmail: fillTemplate(world.templates.callSchedulingTemplate, vars).text,
          buildPrompt: fillTemplate(world.templates.buildPrompt, vars).text,
        },
      }
    },
  },
  {
    name: "add_sites",
    title: "Add firms",
    description: "Adds one or many firms to a vertical; each becomes a site page. The vertical must already exist (see list_verticals). Firms already there (same website or email in that vertical) are skipped.",
    input: z.object({
      sites: z
        .array(
          z.object({
            name: z.string().min(1),
            vertical: z.string().min(1).describe("Exact vertical name"),
            oldSiteUrl: z.string().optional().describe("The firm's current website"),
            email: z.string().optional(),
            city: z.string().optional(),
            phone: z.string().optional(),
            contactName: z.string().optional(),
          }),
        )
        .min(1)
        .max(100),
    }),
    run: async (a: { sites: d.SiteInput[] }) => {
      const results = await d.createSites(a.sites)
      return { created: results.filter((r) => r.created).length, results }
    },
  },
  {
    name: "update_site",
    title: "Update a site",
    description: "Changes a firm: move its stage (optionally backdated with stageAt), set the call time or notes, record a loss reason or deal value, mark the build ready, set the demo URL, or fix contact details. Setting callAt on a site that is waiting for a time marks the call as scheduled.",
    input: siteRef.extend({
      stage: z.enum(STAGES).optional(),
      stageAt: dateStr.optional().describe("When the new stage really began. Defaults to now."),
      note: z.string().optional(),
      lostReason: z.string().optional().describe("With stage lost: why."),
      dealValue: z.number().int().nullable().optional().describe("With stage won: the deal in euros."),
      callAt: dateStr.nullable().optional(),
      callNotes: z.string().optional(),
      build: z.enum(BUILD_STATES).optional(),
      demoUrl: z.string().optional().describe("Saving a demo URL marks the site ready."),
      questionVariant: z.string().optional(),
      name: z.string().optional(),
      city: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      contactName: z.string().optional(),
      oldSiteUrl: z.string().optional(),
      vertical: z.string().optional(),
    }),
    idempotent: true,
    run: async (a: { site: string } & d.SitePatch) => {
      const { site, ...patch } = a
      const r = await resolveSite(site)
      await d.updateSite(r.id, patch)
      const next = buildRows(await getWorld()).find((x) => x.id === r.id)!
      return compact(next)
    },
  },
  {
    name: "get_package_upload",
    title: "Start uploading a zip",
    description:
      "Step 1 of attaching a zip to a firm (its finished site; a new zip replaces the old one) or to a vertical (reference material; it can hold several). Pass site OR vertical. Returns a one-time upload URL and a ready curl command. Run it from a shell that has the zip (PUT the file to the URL), then call confirm_package_upload. Max 50 MB. If you have no shell, tell the user to drag the zip onto the page in the app instead.",
    input: z.object({ ...target, filename: z.string().min(1).describe("File name, e.g. akademia-tenisz.zip") }),
    run: async (a: Target & { filename: string }) => {
      const t = await resolveTarget(a)
      const u = await d.prepareUpload(t.owner, a.filename)
      return {
        for: t.label,
        uploadUrl: u.uploadUrl,
        path: u.path,
        name: u.name,
        curl: `curl -X PUT -H "Content-Type: application/zip" --data-binary @${u.name} "${u.uploadUrl}"`,
        next: `After the upload succeeds, call confirm_package_upload with ${t.arg}, path="${u.path}", name="${u.name}".`,
      }
    },
  },
  {
    name: "confirm_package_upload",
    title: "Finish uploading a zip",
    description: "Step 2: attaches the uploaded zip once the PUT to the upload URL has succeeded. Use the path and name from get_package_upload.",
    input: z.object({ ...target, path: z.string().min(3), name: z.string().min(1) }),
    idempotent: true,
    run: async (a: Target & { path: string; name: string }, ctx) => {
      const t = await resolveTarget(a)
      const pkg = await d.finishUpload(t.owner, a.path, a.name)
      return { attached: pkg.name, sizeBytes: pkg.size, to: t.label, pageUrl: `${ctx.base}${t.page}` }
    },
  },
  {
    name: "list_packages",
    title: "List attached zips",
    description: "Lists the zips attached to a firm or a vertical (pass site OR vertical).",
    input: z.object(target),
    readOnly: true,
    run: async (a: Target) => {
      const t = await resolveTarget(a)
      const list = await d.listPackages(t.owner)
      return { for: t.label, packages: list.map((p) => ({ id: p.id, name: p.name, sizeBytes: p.size, uploadedAt: new Date(p.at).toISOString() })) }
    },
  },
  {
    name: "get_package",
    title: "Get a zip download link",
    description: "A temporary (1 hour) download URL for a zip on a firm or a vertical. If there are several, say which one by name.",
    input: z.object({ ...target, package: z.string().optional().describe("Package name or id, when there is more than one") }),
    readOnly: true,
    run: async (a: Target & { package?: string }) => {
      const t = await resolveTarget(a)
      const { pkg, url } = await d.packageLink(t.owner, a.package)
      return { for: t.label, name: pkg.name, sizeBytes: pkg.size, uploadedAt: new Date(pkg.at).toISOString(), downloadUrl: url }
    },
  },
  {
    name: "delete_package",
    title: "Remove a zip",
    description: "Deletes one zip (by name) from a firm or a vertical. Only when the user asks.",
    input: z.object({ ...target, package: z.string().optional().describe("Package name or id. Omit only if there is exactly one.") }),
    destructive: true,
    run: async (a: Target & { package?: string }) => {
      const t = await resolveTarget(a)
      const list = await d.listPackages(t.owner)
      if (!a.package && list.length > 1) throw new d.DomainError(`There are ${list.length} packages: ${list.map((p) => p.name).join(", ")}. Say which one.`, 422)
      return { removed: await d.removePackage(t.owner, a.package) }
    },
  },
  {
    name: "delete_site",
    title: "Delete a site",
    description: "Permanently deletes a firm with its emails, extracted notes and lessons. Only when the user clearly asks for it.",
    input: siteRef,
    destructive: true,
    run: async (a: { site: string }) => {
      const r = await resolveSite(a.site)
      await d.deleteSite(r.id)
      return { deleted: r.name }
    },
  },
  {
    name: "log_emails",
    title: "Log emails",
    description: "Records emails, incoming or outgoing, on the right site's conversation. Matches the site by name/id or by the firm's address or domain, ignores duplicates (externalId), and moves the stage: a reply to the question or the site advances it, and an outgoing mail with sentKind starts the follow-up timers from its real send time.",
    input: z.object({ emails: z.array(emailItem).min(1).max(100) }),
    run: async (a: { emails: z.infer<typeof emailItem>[] }, ctx) => {
      const results = []
      for (const m of a.emails) {
        try {
          const siteId = m.site ? (await resolveSite(m.site)).id : undefined
          const r = await d.ingestMessage({ siteId, email: m.email, direction: m.direction, from: m.from, to: m.to, subject: m.subject, body: m.body, at: m.at, externalId: m.externalId, sentKind: m.sentKind, questionVariant: m.questionVariant })
          results.push({ ok: true, duplicate: r.duplicate, site: r.site.name, stage: r.site.stage, stageChanged: r.stageChanged, pageUrl: `${ctx.base}/sites/${r.site.id}` })
        } catch (e) {
          results.push({ ok: false, error: e instanceof Error ? e.message : "failed", externalId: m.externalId ?? null })
        }
      }
      return { results }
    },
  },
  {
    name: "add_extracts",
    title: "Record what an email said",
    description: "Saves short notes pulled out of emails on the site: objections, questions they asked, signs of interest, anything else. They show on the site page. Repeats are ignored.",
    input: siteRef.extend({
      extracts: z.array(z.object({ kind: z.enum(EXTRACT_KINDS), text: z.string().min(1).describe("One short sentence.") })).min(1).max(50),
    }),
    run: async (a: { site: string; extracts: { kind: (typeof EXTRACT_KINDS)[number]; text: string }[] }) => {
      const r = await resolveSite(a.site)
      const results = []
      for (const e of a.extracts) results.push(await d.addExtract(r.id, e.kind, e.text))
      return { site: r.name, saved: results.filter((x) => !x.duplicate).length, duplicates: results.filter((x) => x.duplicate).length }
    },
  },
  {
    name: "delete_extract",
    title: "Delete a wrong extracted note",
    description: "Removes one extracted note by its id (get_site lists them).",
    input: z.object({ extract_id: z.string().uuid() }),
    destructive: true,
    run: async (a: { extract_id: string }) => {
      await d.deleteExtract(a.extract_id)
      return { deleted: true }
    },
  },
  {
    name: "add_lesson",
    title: "Add a lesson",
    description: "Adds a lesson to a site. Lessons are the user's own; use this only when they dictate one.",
    input: siteRef.extend({ lesson: z.string().min(1) }),
    run: async (a: { site: string; lesson: string }) => {
      const r = await resolveSite(a.site)
      await d.addLesson(r.id, a.lesson)
      return { site: r.name, saved: true }
    },
  },
  {
    name: "list_tasks",
    title: "What needs doing",
    description: "Everything waiting on the user: next steps that are due now or coming up (send the site, call, rate a reply…), plus their own tasks. Completing a next step means doing it and updating the site with update_site or log_emails.",
    input: z.object({}),
    readOnly: true,
    run: async (_a: never, ctx) => ({ tasks: await taskList(ctx.base) }),
  },
  {
    name: "add_task",
    title: "Add a task",
    description: "Creates a task for the user, optionally tied to a site and a due date.",
    input: z.object({ title: z.string().min(1), site: z.string().optional(), note: z.string().optional(), dueAt: dateStr.optional() }),
    run: async (a: { title: string; site?: string; note?: string; dueAt?: string }) => {
      const siteId = a.site ? (await resolveSite(a.site)).id : undefined
      const t = await d.addTask({ siteId, title: a.title, note: a.note, dueAt: a.dueAt, source: "chatgpt" })
      return { id: t.id, title: t.title }
    },
  },
  {
    name: "complete_task",
    title: "Tick or untick a task",
    description: "Marks one of the user's own tasks (from list_tasks, source \"task\") done or not done. Next steps of the flow aren't ticked: they clear when the site's stage changes.",
    input: z.object({ task_id: z.string().uuid(), done: z.boolean().default(true) }),
    idempotent: true,
    run: async (a: { task_id: string; done: boolean }) => {
      const t = await d.setTaskDone(a.task_id, a.done)
      return { id: t.id, done: !!t.doneAt }
    },
  },
  {
    name: "list_verticals",
    title: "List verticals",
    description: "The verticals with their reference sites, site counts and targets.",
    input: z.object({}),
    readOnly: true,
    run: async () => {
      const world = await getWorld()
      return { verticals: world.verticals.map((v) => ({ id: v.id, name: v.name, target: v.target, referenceSites: [v.reference1, v.reference2], sites: world.sites.filter((s) => s.verticalId === v.id).length })) }
    },
  },
  {
    name: "create_vertical",
    title: "Create a vertical",
    description: "Creates a vertical, optionally with its two reference sites. Only when the user asks.",
    input: z.object({ name: z.string().min(1), reference1: z.string().optional(), reference2: z.string().optional() }),
    run: async (a: { name: string; reference1?: string; reference2?: string }) => {
      const v = await d.createVertical(a)
      return { id: v.id, name: v.name }
    },
  },
  {
    name: "update_vertical",
    title: "Update a vertical",
    description: "Changes a vertical's name, its two reference sites or its target number of sites.",
    input: z.object({ vertical: z.string().min(1).describe("Vertical name or id"), name: z.string().optional(), reference1: z.string().optional(), reference2: z.string().optional(), target: z.number().int().min(1).max(500).optional() }),
    idempotent: true,
    run: async (a: { vertical: string; name?: string; reference1?: string; reference2?: string; target?: number }) => {
      const v = await d.findVertical(a.vertical)
      const { vertical: _ignored, ...patch } = a
      void _ignored
      await d.updateVertical(v.id, patch)
      return { updated: v.name }
    },
  },
  {
    name: "get_templates",
    title: "Read the templates and timing",
    description: "The website build prompt, the send-the-site email, the call-scheduling email, and the two timing values: siteFollowUpDays (quiet days after the opening question before the site goes out anyway) and callAfterSiteDays (quiet days after the site before a call).",
    input: z.object({}),
    readOnly: true,
    run: async () => ({ ...(await getWorld()).templates, placeholders: PLACEHOLDERS }),
  },
  {
    name: "update_templates",
    title: "Edit templates or timing",
    description: "Replaces any of the templates or timing values. Send only what changes. Templates use [PLACEHOLDERS] that are filled per site.",
    input: z.object({
      buildPrompt: z.string().min(20).optional(),
      sendSiteTemplate: z.string().min(20).optional(),
      callSchedulingTemplate: z.string().min(20).optional(),
      siteFollowUpDays: z.number().int().min(1).max(60).optional(),
      callAfterSiteDays: z.number().int().min(1).max(60).optional(),
    }),
    idempotent: true,
    run: async (a: d.TemplatePatch) => {
      await d.saveTemplates(a)
      return { saved: Object.keys(a) }
    },
  },
  {
    name: "record_sync",
    title: "Record a finished mailbox sweep",
    description: "Call at the end of every mailbox sweep, even when nothing was new, so the app can show when the inbox was last checked.",
    input: z.object({ note: z.string().max(500).optional().describe("One line on what the sweep found.") }),
    idempotent: true,
    run: async (a: { note?: string }) => {
      await d.markSync(a.note)
      return { ok: true }
    },
  },
]
