import type { DB } from "./index"
import * as schema from "./schema"
import type { Stage } from "../lib/flow"

/**
 * Fictional demo data: five verticals and ~30 firms spread across every stage,
 * with the emails, extracted notes and lessons that would come with them.
 */

const VERTICALS = [
  { name: "Tennis clubs", hue: 75, ref1: "https://www.lagunabeachtennisacademy.com", ref2: "https://www.nettennisclub.example" },
  { name: "Padel clubs", hue: 150, ref1: "https://www.padelhaus.example", ref2: "https://www.smashpadel.example" },
  { name: "Pilates studios", hue: 330, ref1: "https://www.reformerstudio.example", ref2: "" },
  { name: "Gyms & boxes", hue: 25, ref1: "", ref2: "" },
  { name: "Wedding venues", hue: 260, ref1: "https://www.villaestate.example", ref2: "https://www.barnvenue.example" },
]

type Path = Stage[]
const P = {
  won: ["question_sent", "question_replied", "site_sent", "site_replied", "site_positive", "call_scheduling", "call_scheduled", "called", "proposal_sent", "won"],
  wonCold: ["question_sent", "site_sent", "called", "proposal_sent", "won"],
  proposal: ["question_sent", "question_replied", "site_sent", "site_replied", "site_positive", "call_scheduled", "called", "proposal_sent"],
  called: ["question_sent", "site_sent", "called"],
  scheduled: ["question_sent", "question_replied", "site_sent", "site_replied", "site_positive", "call_scheduling", "call_scheduled"],
  scheduling: ["question_sent", "question_replied", "site_sent", "site_replied", "site_positive", "call_scheduling"],
  positive: ["question_sent", "question_replied", "site_sent", "site_replied", "site_positive"],
  rate: ["question_sent", "question_replied", "site_sent", "site_replied"],
  siteNo: ["question_sent", "question_replied", "site_sent", "site_replied", "lost"],
  callNo: ["question_sent", "site_sent", "lost"],
  propNo: ["question_sent", "question_replied", "site_sent", "site_replied", "site_positive", "call_scheduled", "called", "proposal_sent", "lost"],
  siteSent: ["question_sent", "question_replied", "site_sent"],
  siteSentSilent: ["question_sent", "site_sent"],
  qReplied: ["question_sent", "question_replied"],
  qSent: ["question_sent"],
  fresh: [],
} satisfies Record<string, Path>

// name, vertical, city, path, days since the last change, build
const FIRMS: [string, number, string, Path, number, "todo" | "building" | "ready"][] = [
  ["Duna Tennis Academy", 0, "Budapest", P.won, 21, "ready"],
  ["Ace Point Tenisz", 0, "Budapest", P.siteNo, 24, "ready"],
  ["Hegyvidék TC", 0, "Budapest", P.proposal, 9, "ready"],
  ["Rózsadomb Tennis Club", 0, "Budapest", P.siteSentSilent, 3.6, "ready"],
  ["Balaton Court Club", 0, "Siófok", P.callNo, 15, "ready"],
  ["Tisza Tenisz Egyesület", 0, "Szeged", P.positive, 0.6, "ready"],
  ["Mátra Ace Club", 0, "Gyöngyös", P.qSent, 5.4, "building"],
  ["Sopron Tennis Garden", 0, "Sopron", P.qReplied, 0.4, "ready"],
  ["Pécs Clay Courts", 0, "Pécs", P.fresh, 1, "todo"],
  ["Padel Pest", 1, "Budapest", P.wonCold, 12, "ready"],
  ["Óbuda Padel House", 1, "Budapest", P.siteSent, 1.2, "ready"],
  ["Vértes Padel", 1, "Tatabánya", P.scheduled, 1.5, "ready"],
  ["Győr Padel Club", 1, "Győr", P.qSent, 1.5, "todo"],
  ["Padel Twelve", 1, "Debrecen", P.siteNo, 7, "ready"],
  ["Night Glass Padel", 1, "Budapest", P.fresh, 0.5, "todo"],
  ["Line Pilates Studio", 2, "Budapest", P.propNo, 11, "ready"],
  ["Core & Calm", 2, "Budapest", P.scheduling, 2, "ready"],
  ["Reformer Room", 2, "Szeged", P.rate, 0.2, "ready"],
  ["Pilates Loft", 2, "Debrecen", P.qReplied, 1.1, "todo"],
  ["Studio Stillness", 2, "Győr", P.called, 2, "ready"],
  ["The Mat House", 2, "Budapest", P.qSent, 4.3, "ready"],
  ["Balance Lab", 2, "Veszprém", P.fresh, 2, "todo"],
  ["Iron District", 3, "Budapest", P.siteNo, 16, "ready"],
  ["Forge Box", 3, "Budapest", P.siteSent, 4.4, "ready"],
  ["Kettle Collective", 3, "Miskolc", P.siteSentSilent, 1, "ready"],
  ["Northside Strength", 3, "Budapest", P.qSent, 0.8, "building"],
  ["Barbell Club Eger", 3, "Eger", P.fresh, 0.3, "todo"],
  ["Hársas Kúria", 4, "Etyek", P.proposal, 6, "ready"],
  ["Tópart Birtok", 4, "Tihany", P.qSent, 2.1, "ready"],
  ["Szőlőhegy Pajta", 4, "Villány", P.siteSentSilent, 6, "ready"],
  ["Villa Marienthal", 4, "Szentendre", P.fresh, 3, "ready"],
  ["Malom Rendezvényház", 4, "Tokaj", P.fresh, 4, "todo"],
]

const LESSONS: [number, string][] = [
  [0, "Asking about bookings first got a reply within hours. The site landed on a warm inbox."],
  [2, "He wanted to see his own coaches on the homepage. Pull staff photos from Instagram earlier."],
  [16, "Silent for five days, then said yes within an hour of my phone call. Call earlier."],
  [27, "Wedding owners forward the link to their partner first. Expect a week, don't chase before day 6."],
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
    const [row] = await db
      .insert(schema.verticals)
      .values({ name: v.name, hue: v.hue, reference1: v.ref1, reference2: v.ref2, sortOrder: i, target: 20 })
      .returning({ id: schema.verticals.id })
    vIds.push(row.id)
  }

  const variants = ["How do you handle court bookings today?", "What's the busiest time of the week for you?"]
  const siteIds: string[] = []

  for (const [name, vi, city, path, age, build] of FIRMS) {
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")

    // Stage times, worked out backwards from "days since the last change".
    const last = now - age * DAY
    const times: number[] = new Array(path.length)
    let t = last
    for (let i = path.length - 1; i >= 0; i--) {
      times[i] = t
      const prev = path[i - 1]
      const cur = path[i]
      const gap =
        cur === "question_replied" || cur === "site_replied"
          ? between(0.15, 1.6)
          : cur === "site_sent" && prev === "question_sent"
            ? between(4.1, 5)
            : cur === "called" && prev === "site_sent"
              ? between(3.1, 4)
              : between(0.5, 3)
      t -= gap * DAY
    }
    const createdAt = new Date((times[0] ?? last) - between(0.4, 2) * DAY)
    const has = (s: Stage) => path.includes(s)
    const finalStage: Stage = path.at(-1) ?? "new"
    const contactName = ["Nagy Gábor", "Kovács Anna", "Szabó Péter", "Tóth Eszter", ""][Math.floor(rand() * 5)]
    const callAt = finalStage === "call_scheduled" ? new Date(now + 1.2 * DAY) : has("call_scheduled") ? new Date(times[path.indexOf("call_scheduled")] + 2 * DAY) : null
    const variant = has("question_sent") ? variants[Math.floor(rand() * variants.length)] : ""

    const [site] = await db
      .insert(schema.sites)
      .values({
        name,
        verticalId: vIds[vi],
        city,
        oldSiteUrl: `https://${slug}.example`,
        demoUrl: build === "ready" ? `https://${slug}-demo.vercel.app` : "",
        contactName,
        email: `hello@${slug}.example`,
        stage: finalStage,
        stageAt: new Date(last),
        build,
        questionVariant: variant,
        callAt,
        callNotes: callAt ? "Walk through the demo, ask about booking pain points, agree next steps." : "",
        lostReason: finalStage === "lost" ? (has("site_replied") ? "Happy with the current site" : "Not interested after the call") : "",
        dealValue: finalStage === "won" ? (rand() > 0.5 ? 1800 : 1200) : null,
        createdAt,
        updatedAt: new Date(last),
      })
      .returning({ id: schema.sites.id })
    siteIds.push(site.id)

    await db.insert(schema.events).values({ siteId: site.id, stage: "new", at: createdAt })
    const from = `hello@${slug}.example`
    const me = "outreach@example.com"
    const mail = async (direction: "in" | "out", at: number, subject: string, body: string) => {
      const [m] = await db
        .insert(schema.messages)
        .values({ siteId: site.id, direction, fromAddr: direction === "in" ? from : me, toAddr: direction === "in" ? me : from, subject, body, at: new Date(at) })
        .returning({ id: schema.messages.id })
      return m.id
    }
    const extract = (kind: schema.Extract["kind"], text: string, messageId?: string) =>
      db.insert(schema.extracts).values({ siteId: site.id, kind, text, messageId: messageId ?? null, createdAt: new Date(last) })

    for (const [i, stage] of path.entries()) {
      const at = times[i]
      const next = path[i + 1]
      await db.insert(schema.events).values({
        siteId: site.id,
        stage,
        at: new Date(at),
        note: stage === "lost" ? (has("site_replied") ? "Happy with the current site" : "Not interested after the call") : "",
      })
      if (stage === "question_sent")
        await mail("out", at, `Quick question about ${name}`, `Hi,\n\n${variant}\n\nI'm asking because I'm working on a few ideas for clubs in ${city}.\n\nBest regards`)
      if (stage === "question_replied") {
        const id = await mail("in", at, `Re: Quick question about ${name}`, "Hi, thanks for asking. Mostly by phone and Facebook messages, to be honest. Why do you ask?")
        if (rand() > 0.4) await extract("question", "Asked why I'm asking, wants to know what the project is.", id)
      }
      if (stage === "site_sent")
        await mail("out", at, `I rebuilt the ${name} website`, `Hi,\n\nI put together a new version of your homepage:\nhttps://${slug}-demo.vercel.app\n\nHave a look on your phone too.\n\nBest regards`)
      if (stage === "site_replied") {
        const neg = next === "lost" || !next
        const id = await mail(
          "in",
          at,
          `Re: I rebuilt the ${name} website`,
          neg ? "Thanks, it looks nice but we're happy with what we have." : "Wow, this looks much better than ours. Can we talk this week?",
        )
        if (neg) await extract("objection", "Happy with the current site; doesn't see a need to change.", id)
        else await extract("interest", "Liked the design a lot; wants to talk this week.", id)
      }
      if (stage === "call_scheduling") await mail("out", at, `Re: I rebuilt the ${name} website`, "Great to hear! Would Thursday 15:00 or Friday 10:00 work for a quick call?\n\nBest regards")
      if (stage === "call_scheduled") {
        const id = await mail("in", at, `Re: I rebuilt the ${name} website`, "Thursday 15:00 works for me. Talk then.")
        await extract("interest", "Booked a call.", id)
      }
      if (stage === "called" && rand() > 0.5) await extract("objection", "Worried about the price and about who maintains the site afterwards.")
    }
    if (finalStage === "won" && rand() > 0.5) await extract("question", "Asked whether they can keep their own domain and email.")
  }

  for (const [i, body] of LESSONS)
    await db.insert(schema.lessons).values({ siteId: siteIds[i], body, createdAt: new Date(now - between(1, 20) * DAY) })

  await db.insert(schema.tasks).values([
    { siteId: siteIds[2], title: "Follow up on the proposal", note: "Sent it last week; ask if they've had a chance to look.", dueAt: new Date(now - 2 * HOUR), source: "chatgpt" },
    { title: "Pick the outreach questions for the padel batch", dueAt: new Date(now + 2 * DAY), source: "manual" },
  ])

  const put = (key: string, value: string) => db.insert(schema.settings).values({ key, value })
  await put("lastSyncAt", String(now - 12 * 60_000))
  await put("lastSyncNote", "Checked the mailbox: 2 new replies.")
}
