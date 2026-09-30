import { NextResponse } from "next/server"
import { appUrl } from "@/lib/api"
import { openapi } from "@/lib/chatgpt"

/** Public on purpose: it describes the API but grants nothing. Import this URL into a Custom GPT action. */
export function GET(req: Request) {
  return NextResponse.json(openapi(appUrl(req)))
}
