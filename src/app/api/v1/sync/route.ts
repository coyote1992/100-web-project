import { z } from "zod"
import { dateString, route } from "@/lib/api"
import { markSync } from "@/lib/domain"

/** Call at the end of every mailbox sweep, even when nothing was new, so the app can show the sweep is alive. */
export const POST = route(
  async (req) => {
    const raw = await req.json().catch(() => ({}))
    const b = z.object({ note: z.string().max(500).optional(), at: dateString.optional() }).parse(raw ?? {})
    await markSync(b.note, b.at)
    return { ok: true }
  },
  { write: true },
)
