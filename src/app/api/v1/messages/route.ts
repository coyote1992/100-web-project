import { z } from "zod"
import { appUrl, dateString, json, route } from "@/lib/api"
import { ingestMessage, type MessageInput } from "@/lib/domain"
import { STAGE_LABEL } from "@/lib/flow"

const message = z.object({
  siteId: z.string().uuid().optional(),
  email: z.string().optional(),
  direction: z.enum(["in", "out"]),
  from: z.string().optional(),
  to: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  at: dateString.optional(),
  externalId: z.string().optional(),
  sentKind: z.enum(["question", "site", "call_scheduling"]).optional(),
  questionVariant: z.string().optional(),
})

/** One email or a batch. Matched to a site by siteId, or by the firm's address / domain. */
export const POST = route(
  async (req) => {
    const b = await json(req, z.union([z.object({ messages: z.array(message).min(1).max(100) }), message]))
    const list = "messages" in b ? b.messages : [b]
    const base = appUrl(req)
    const results = []
    for (const m of list as MessageInput[]) {
      try {
        const r = await ingestMessage(m)
        results.push({
          ok: true,
          duplicate: r.duplicate,
          site: { id: r.site.id, name: r.site.name, stage: r.site.stage, stageLabel: STAGE_LABEL[r.site.stage], pageUrl: `${base}/sites/${r.site.id}` },
          stageChanged: r.stageChanged,
        })
      } catch (e) {
        results.push({ ok: false, error: e instanceof Error ? e.message : "failed", externalId: m.externalId ?? null })
      }
    }
    return { results }
  },
  { write: true },
)
