import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { db, ready, schema } from "@/db"
import { address, matchProspect } from "@/lib/match"

/**
 * Email webhook. Point your mailbox's forwarder (Cloudflare Email Worker, Postmark
 * inbound, a Gmail Apps Script…) here. Both directions work: BCC yourself on
 * outgoing mail and it's logged as "out".
 *
 *   POST /api/inbound
 *   Authorization: Bearer $INBOUND_TOKEN
 *   { "from": "...", "to": "...", "subject": "...", "text": "...", "date": "...", "messageId": "..." }
 */

const body = z.object({
  from: z.string().default(""),
  to: z.string().default(""),
  subject: z.string().default(""),
  text: z.string().default(""),
  date: z.string().optional(),
  messageId: z.string().optional(),
  direction: z.enum(["in", "out"]).optional(),
})

export async function POST(req: Request) {
  const token = process.env.INBOUND_TOKEN
  if (!token) return NextResponse.json({ error: "INBOUND_TOKEN is not set on the server" }, { status: 503 })
  if (req.headers.get("authorization") !== `Bearer ${token}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const parsed = body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const m = parsed.data

  await ready()
  const own = (process.env.OUTREACH_ADDRESS ?? "").toLowerCase()
  const direction = m.direction ?? (own && address(m.from) === own ? "out" : "in")
  const counterpart = direction === "in" ? m.from : m.to
  const prospects = await db.select().from(schema.prospects)
  const match = matchProspect(counterpart, prospects)

  const inserted = await db
    .insert(schema.messages)
    .values({
      prospectId: match?.id ?? null,
      direction,
      fromAddr: m.from,
      toAddr: m.to,
      subject: m.subject,
      body: m.text.slice(0, 20000),
      at: m.date ? new Date(m.date) : new Date(),
      externalId: m.messageId ?? null,
      source: "webhook",
    })
    .onConflictDoNothing()
    .returning({ id: schema.messages.id })

  revalidatePath("/", "layout")
  return NextResponse.json({ ok: true, duplicate: inserted.length === 0, matched: match ? { id: match.id, name: match.name } : null })
}
