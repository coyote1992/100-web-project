import { z } from "zod"
import { appUrl, json, route, siteSummary } from "@/lib/api"
import { createSites } from "@/lib/domain"
import { getWorld } from "@/lib/data"
import { buildRows } from "@/lib/metrics"
import { isStage } from "@/lib/flow"

export const GET = route(async (req) => {
  const q = new URL(req.url).searchParams
  const world = await getWorld()
  let rows = buildRows(world)
  const stage = q.get("stage")
  if (stage) rows = rows.filter((r) => (isStage(stage) ? r.stage === stage : false))
  const vertical = q.get("vertical")
  if (vertical) rows = rows.filter((r) => r.vertical?.name.toLowerCase() === vertical.toLowerCase() || r.verticalId === vertical)
  const email = q.get("email")
  if (email) rows = rows.filter((r) => r.email.toLowerCase() === email.toLowerCase())
  if (q.get("needs") === "attention") rows = rows.filter((r) => r.steps.some((s) => s.state === "due"))
  const base = appUrl(req)
  return { count: rows.length, lastSyncAt: world.lastSyncAt?.toISOString() ?? null, sites: rows.map((r) => siteSummary(r, base)) }
})

const site = z.object({
  name: z.string().min(1),
  vertical: z.string().min(1),
  city: z.string().optional(),
  oldSiteUrl: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  contactName: z.string().optional(),
})

export const POST = route(
  async (req) => {
    const body = await json(req, z.union([z.object({ sites: z.array(site).min(1).max(100) }), site]))
    const results = await createSites("sites" in body ? body.sites : [body])
    return { created: results.filter((r) => r.created).length, results }
  },
  { write: true },
)
