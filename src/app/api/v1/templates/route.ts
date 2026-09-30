import { z } from "zod"
import { json, route } from "@/lib/api"
import { saveTemplates } from "@/lib/domain"
import { getWorld } from "@/lib/data"
import { PLACEHOLDERS } from "@/lib/templates"

const read = async () => {
  const { templates } = await getWorld()
  return {
    ...templates,
    placeholders: PLACEHOLDERS,
    note: "siteFollowUpDays: days of silence after the opening question before the site goes out anyway. callAfterSiteDays: days of silence after the site before a phone call.",
  }
}

export const GET = route(read)

export const PUT = route(
  async (req) => {
    const b = await json(
      req,
      z.object({
        buildPrompt: z.string().min(20).optional(),
        sendSiteTemplate: z.string().min(20).optional(),
        callSchedulingTemplate: z.string().min(20).optional(),
        siteFollowUpDays: z.number().int().optional(),
        callAfterSiteDays: z.number().int().optional(),
      }),
    )
    await saveTemplates(b)
    return read()
  },
  { write: true },
)
