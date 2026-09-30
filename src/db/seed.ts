import { eq } from "drizzle-orm"
import type { LibSQLDatabase } from "drizzle-orm/libsql"
import * as schema from "./schema"
import { transitionsFrom, type NodeKey, type Transition } from "../lib/flow"

type DB = LibSQLDatabase<typeof schema>

/**
 * Fictional demo data: five verticals, three batches, ~40 sites spread across
 * every part of the outreach flow. Loaded from Settings → "Load demo data".
 */

const VERTICALS = [
  {
    name: "Tennis clubs",
    hue: 75,
    playbook:
      "- Lead with courts + coaching, not the clubhouse.\n- Booking is the #1 job: court hire and trial lesson CTAs above the fold.\n- Coach bios with real credentials sell the academy.\n- Parents are the buyer for junior programmes — give them a clear weekly schedule.",
  },
  { name: "Padel clubs", hue: 150, playbook: "- Show the courts at night — lighting sells.\n- Make open-match / find-a-partner obvious.\n- Price per court per hour belongs on the homepage." },
  { name: "Pilates studios", hue: 330, playbook: "- Calm, editorial, lots of whitespace.\n- Intro offer (first class / intro pack) is the primary CTA.\n- Reformer vs mat explained in one line each." },
  { name: "Gyms & boxes", hue: 25, playbook: "- Free trial CTA everywhere.\n- Real member photos beat stock every time.\n- Timetable must work on a phone." },
  { name: "Wedding venues", hue: 260, playbook: "- Photography first; let the venue breathe.\n- Capacity, season, and a brochure download.\n- Enquiry form asks for date + guest count only." },
]

type Script = { steps: string[]; build?: "scouted" | "building" | "ready"; parked?: boolean; deal?: number }

const S: Record<string, Script> = {
  paid: { steps: ["q", "qr", "s", "sp", "cp", "w"], deal: 1800 },
  paidCall: { steps: ["s", "sx", "cp", "w"], deal: 1200 },
  proposal: { steps: ["q", "qn", "s", "sp", "cp"] },
  positive: { steps: ["q", "qr", "s", "sp"] },
  callNeg: { steps: ["s", "sx", "cn"] },
  propNeg: { steps: ["q", "qr", "s", "sp", "cp", "l"] },
  siteNeg: { steps: ["q", "qr", "s", "sn"] },
  siteNeg2: { steps: ["s", "sn"] },
  waitSite: { steps: ["q", "qr", "s"] },
  waitSite2: { steps: ["q", "qn", "s"] },
  waitQ: { steps: ["q"] },
  noReply: { steps: ["s", "sx"] },
  qNoReply: { steps: ["q", "qn"] },
  ready: { steps: [], build: "ready" },
  building: { steps: [], build: "building" },
  scouted: { steps: [], build: "scouted" },
  parked: { steps: ["q", "qn", "s", "sx"], parked: true },
}

// [name, vertical index, city, batch index | null, script]
const FIRMS: [string, number, string, number | null, keyof typeof S][] = [
  ["Duna Tennis Academy", 0, "Budapest", 0, "paid"],
  ["Ace Point Tenisz", 0, "Budapest", 0, "siteNeg"],
  ["Hegyvidék TC", 0, "Budapest", 0, "proposal"],
  ["Rózsadomb Tennis Club", 0, "Budapest", 0, "noReply"],
  ["Balaton Court Club", 0, "Siófok", 0, "callNeg"],
  ["Tisza Tenisz Egyesület", 0, "Szeged", 1, "positive"],
  ["Mátra Ace Club", 0, "Gyöngyös", 1, "waitSite"],
  ["Sopron Tennis Garden", 0, "Sopron", null, "ready"],
  ["Pécs Clay Courts", 0, "Pécs", null, "building"],
  ["Padel Pest", 1, "Budapest", 1, "paidCall"],
  ["Óbuda Padel House", 1, "Budapest", 1, "waitSite2"],
  ["Vértes Padel", 1, "Tatabánya", 2, "positive"],
  ["Győr Padel Club", 1, "Győr", 2, "waitQ"],
  ["Padel Twelve", 1, "Debrecen", 2, "siteNeg2"],
  ["Night Glass Padel", 1, "Budapest", null, "building"],
  ["Line Pilates Studio", 2, "Budapest", 1, "propNeg"],
  ["Core & Calm", 2, "Budapest", 1, "positive"],
  ["Reformer Room", 2, "Szeged", 2, "waitSite"],
  ["Pilates Loft", 2, "Debrecen", 2, "qNoReply"],
  ["Studio Stillness", 2, "Győr", 2, "noReply"],
  ["The Mat House", 2, "Budapest", null, "ready"],
  ["Balance Lab", 2, "Veszprém", null, "scouted"],
  ["Iron District", 3, "Budapest", 1, "siteNeg"],
  ["Forge Box", 3, "Budapest", 1, "parked"],
  ["Kettle Collective", 3, "Miskolc", 2, "waitSite2"],
  ["Northside Strength", 3, "Budapest", null, "building"],
  ["Barbell Club Eger", 3, "Eger", null, "scouted"],
  ["Hársas Kúria", 4, "Etyek", 1, "proposal"],
  ["Tópart Birtok", 4, "Tihany", 2, "waitQ"],
  ["Szőlőhegy Pajta", 4, "Villány", 2, "noReply"],
  ["Villa Marienthal", 4, "Szentendre", null, "ready"],
  ["Malom Rendezvényház", 4, "Tokaj", null, "scouted"],
]

const REFS = ["https://www.lagunabeachtennisacademy.com", "https://www.examplestudio.design", "https://www.reference-venue.example"]

const LESSONS: [number | null, string][] = [
  [0, "Sending the question first roughly doubled replies vs. cold-sending the site. People want to be asked."],
  [0, "Owners reply at night. Emails sent 19:00–21:00 got answered same evening; morning sends got buried."],
  [2, "Pilates owners respond to calm, image-led demos. The busier variant got zero replies."],
  [null, "Opus plan → Sonnet execution was ~40% faster per site with no visible quality drop on 4 of 5 builds."],
  [4, "Wedding venues forward the link to a partner before replying — expect 5–7 days, don't chase before day 6."],
  [3, "Gyms are price-anchored against cheap templates. Lead the call with booking/trial conversions, not design."],
]

function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export async function seed(db: DB, now = Date.now()) {
  const rand = rng(1992)
  const between = (a: number, b: number) => a + rand() * (b - a)
  const DAY = 86_400_000
  const HOUR = 3_600_000

  const vIds: string[] = []
  for (const [i, v] of VERTICALS.entries()) {
    const [row] = await db.insert(schema.verticals).values({ ...v, sortOrder: i, target: 20 }).returning({ id: schema.verticals.id })
    vIds.push(row.id)
  }

  const batchDefs = [
    { name: "Batch 1 · Tennis pilot", notes: "First five, all tennis. Question first, then site.", at: now - 49 * DAY },
    { name: "Batch 2 · Mixed ten", notes: "Two per vertical to compare response rates.", at: now - 30 * DAY },
    { name: "Batch 3 · Twelve", notes: "Bigger batch; lighter polish per site.", at: now - 14 * DAY },
  ]
  const bIds: string[] = []
  for (const b of batchDefs) {
    const [row] = await db
      .insert(schema.batches)
      .values({ name: b.name, notes: b.notes, createdAt: new Date(b.at) })
      .returning({ id: schema.batches.id })
    bIds.push(row.id)
  }

  const methods = ["Opus full", "Opus plan → Sonnet", "Opus full", "Opus plan → Sonnet"]

  for (const [name, vi, city, bi, scriptKey] of FIRMS) {
    const script = S[scriptKey]
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
    const start = bi !== null ? batchDefs[bi].at - between(4, 8) * DAY : now - between(1, 9) * DAY
    const build = script.build ?? "ready"

    const [p] = await db
      .insert(schema.prospects)
      .values({
        name,
        verticalId: vIds[vi],
        batchId: bi !== null ? bIds[bi] : null,
        city,
        oldSiteUrl: `https://${slug}.example`,
        demoUrl: build === "ready" ? `https://${slug}-demo.vercel.app` : "",
        references: REFS[vi % 2],
        contactName: "",
        email: `hello@${slug}.example`,
        phone: "",
        build,
        buildMethod: build === "scouted" ? "" : methods[Math.floor(rand() * methods.length)],
        parked: !!script.parked,
        dealValue: script.deal ?? null,
        createdAt: new Date(start),
        updatedAt: new Date(start),
      })
      .returning({ id: schema.prospects.id })

    // Work logs: research → build → qa (→ outreach per contact step)
    const logs: { kind: "research" | "build" | "qa" | "outreach"; h: number }[] = []
    if (build !== "scouted") logs.push({ kind: "research", h: between(0.4, 1.1) })
    if (build !== "scouted") logs.push({ kind: "build", h: build === "building" ? between(0.8, 2) : between(1.6, 4.2) })
    if (build === "ready") logs.push({ kind: "qa", h: between(0.4, 1.4) })
    let t = start + HOUR * 18
    for (const l of logs) {
      const minutes = Math.round(l.h * 60)
      await db.insert(schema.workLogs).values({
        prospectId: p.id,
        kind: l.kind,
        minutes,
        startedAt: new Date(t),
        endedAt: new Date(t + minutes * 60_000),
      })
      t += minutes * 60_000 + between(2, 20) * HOUR
    }

    // Walk the flow.
    let stage: NodeKey | null = null
    let at = bi !== null ? batchDefs[bi].at + between(0, 2) * DAY : t
    for (const stepId of script.steps) {
      const tr: Transition | undefined = transitionsFrom(stage).find((x) => x.id === stepId)
      if (!tr) throw new Error(`Seed: ${name} cannot ${stepId} from ${stage}`)
      if (at > now - HOUR) at = now - between(2, 20) * HOUR
      await db.insert(schema.events).values(
        tr.path.map((node, i) => ({
          prospectId: p.id,
          node,
          at: new Date(at + i),
          sentiment: tr.asks === "sentiment" && i === tr.path.length - 1 ? 1 : null,
          minutes: node === "call" || node === "call_proposal" ? Math.round(between(12, 35)) : null,
          note:
            node === "site_positive"
              ? "“Wow, this looks much better than ours. Can we talk this week?”"
              : node === "site_negative"
                ? "“Thanks, we're happy with the current site.”"
                : node === "call_proposal"
                  ? "Walked through the demo, sent a proposal with two options."
                  : "",
        })),
      )
      if (tr.path.includes("question_sent") || tr.path.includes("site_sent")) {
        const minutes = Math.round(between(10, 30))
        await db.insert(schema.workLogs).values({
          prospectId: p.id,
          kind: "outreach",
          minutes,
          startedAt: new Date(at - minutes * 60_000),
          endedAt: new Date(at),
        })
      }
      if (tr.asks === "call") {
        const minutes = Math.round(between(15, 35))
        await db.insert(schema.workLogs).values({ prospectId: p.id, kind: "sales", minutes, startedAt: new Date(at - minutes * 60_000), endedAt: new Date(at), note: "Call" })
      }
      if (tr.path.includes("question_replied") || tr.path.includes("site_positive") || tr.path.includes("site_negative")) {
        await db.insert(schema.messages).values({
          prospectId: p.id,
          direction: "in",
          fromAddr: `hello@${slug}.example`,
          subject: tr.path.includes("question_replied") ? "Re: A quick question about your website" : "Re: I rebuilt your homepage",
          body: tr.path.includes("site_negative") ? "Thanks, but we're happy with the current one." : "Sure, happy to take a look — send it over.",
          at: new Date(at - HOUR),
          rating: tr.path.includes("site_negative") ? -1 : 1,
          source: "manual",
        })
      }
      stage = tr.path.at(-1)!
      at += between(1.5, 6) * DAY
    }

    if (stage) {
      await db.update(schema.prospects).set({ stage, updatedAt: new Date(Math.min(at, now)) }).where(eq(schema.prospects.id, p.id))
    }
  }

  // An unmatched inbound email to show the inbox triage.
  await db.insert(schema.messages).values({
    direction: "in",
    fromAddr: "info@unknown-sender.example",
    subject: "Re: Your new website",
    body: "Hi, who is this from? We might be interested.",
    at: new Date(now - 5 * HOUR),
    source: "webhook",
    externalId: "demo-unmatched-1",
  })

  for (const [vi, body] of LESSONS) {
    await db.insert(schema.notes).values({
      verticalId: vi !== null ? vIds[vi] : null,
      body,
      isLesson: true,
      createdAt: new Date(now - between(1, 40) * DAY),
    })
  }
}
