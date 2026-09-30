import { appUrl, route } from "@/lib/api"
import { instructions } from "@/lib/chatgpt"

export const GET = route(async (req) => new Response(instructions(appUrl(req)), { headers: { "content-type": "text/plain; charset=utf-8" } }))
