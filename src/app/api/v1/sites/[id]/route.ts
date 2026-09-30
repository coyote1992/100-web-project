import { z } from "zod"
import { appUrl, dateString, json, route, siteDetail } from "@/lib/api"
import { deleteSite, updateSite } from "@/lib/domain"
import { BUILD_STATES } from "@/lib/flow"

export const GET = route(async (req, ctx: RouteContext<"/api/v1/sites/[id]">) => siteDetail((await ctx.params).id, appUrl(req)))

const patch = z.object({
  name: z.string().optional(),
  vertical: z.string().optional(),
  city: z.string().optional(),
  oldSiteUrl: z.string().optional(),
  demoUrl: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  contactName: z.string().optional(),
  build: z.enum(BUILD_STATES).optional(),
  questionVariant: z.string().optional(),
  callAt: dateString.nullable().optional(),
  callNotes: z.string().optional(),
  lostReason: z.string().optional(),
  dealValue: z.number().int().nullable().optional(),
  stage: z.string().optional(),
  stageAt: dateString.optional(),
  note: z.string().optional(),
})

export const PATCH = route(
  async (req, ctx: RouteContext<"/api/v1/sites/[id]">) => {
    const { id } = await ctx.params
    await updateSite(id, await json(req, patch))
    return siteDetail(id, appUrl(req))
  },
  { write: true },
)

export const DELETE = route(
  async (_req, ctx: RouteContext<"/api/v1/sites/[id]">) => {
    await deleteSite((await ctx.params).id)
    return { ok: true }
  },
  { write: true },
)
