import { route } from "@/lib/api"
import { guide } from "@/lib/guide"

export const GET = route(async () => new Response(guide(), { headers: { "content-type": "text/plain; charset=utf-8" } }))
