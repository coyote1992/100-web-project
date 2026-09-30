/**
 * The outreach flow, as the application understands it.
 *
 *  new → question_sent ─┬─ (they reply) question_replied ─┐
 *                       └─ (silent N days) ───────────────┴→ site_sent ─┬─ site_replied → site_positive → call_scheduling → call_scheduled → called → proposal_sent → won
 *                                                                        └─ (silent M days) → call ───────────────────────────────┘
 *  any stage → lost
 */

export const STAGES = [
  "new",
  "question_sent",
  "question_replied",
  "site_sent",
  "site_replied",
  "site_positive",
  "call_scheduling",
  "call_scheduled",
  "called",
  "proposal_sent",
  "won",
  "lost",
] as const
export type Stage = (typeof STAGES)[number]

export const BUILD_STATES = ["todo", "building", "ready"] as const
export type BuildState = (typeof BUILD_STATES)[number]

export const EXTRACT_KINDS = ["objection", "question", "interest", "other"] as const
export type ExtractKind = (typeof EXTRACT_KINDS)[number]

export const STAGE_LABEL: Record<Stage, string> = {
  new: "Not contacted",
  question_sent: "Question sent",
  question_replied: "Replied to question",
  site_sent: "Site sent",
  site_replied: "Replied to site",
  site_positive: "Positive reply",
  call_scheduling: "Scheduling a call",
  call_scheduled: "Call scheduled",
  called: "Called",
  proposal_sent: "Proposal sent",
  won: "Paid client",
  lost: "Closed",
}

export const BUILD_LABEL: Record<BuildState, string> = { todo: "Not built", building: "Building", ready: "Site ready" }
export const EXTRACT_LABEL: Record<ExtractKind, string> = {
  objection: "Objections",
  question: "Questions",
  interest: "Interest",
  other: "Other",
}

/** The steps shown in the progress strip on a site page. */
export const PIPELINE: { stage: Stage; label: string }[] = [
  { stage: "question_sent", label: "Question" },
  { stage: "site_sent", label: "Site" },
  { stage: "site_positive", label: "Positive" },
  { stage: "call_scheduled", label: "Call" },
  { stage: "proposal_sent", label: "Proposal" },
  { stage: "won", label: "Paid" },
]

/** Position of a stage along the strip; stages between two markers count as the earlier one. */
export function pipelineIndex(stage: Stage) {
  const order: Record<Stage, number> = {
    new: -1,
    question_sent: 0,
    question_replied: 0,
    site_sent: 1,
    site_replied: 1,
    site_positive: 2,
    call_scheduling: 2,
    call_scheduled: 3,
    called: 3,
    proposal_sent: 4,
    won: 5,
    lost: -2,
  }
  return order[stage]
}

export type Status = "not_started" | "waiting" | "your_move" | "won" | "lost"

export const STATUS_META: Record<Status, { label: string; token: string }> = {
  not_started: { label: "Not contacted", token: "var(--st-idle)" },
  waiting: { label: "Waiting on them", token: "var(--st-wait)" },
  your_move: { label: "Your move", token: "var(--st-move)" },
  won: { label: "Paid client", token: "var(--st-won)" },
  lost: { label: "Closed", token: "var(--st-lost)" },
}

export type Timing = { siteFollowUpDays: number; callAfterSiteDays: number }
export const DEFAULT_TIMING: Timing = { siteFollowUpDays: 4, callAfterSiteDays: 3 }

/* ------------------------------------------------------------------ actions */

export type ActionAsk = "callAt" | "deal" | "reason"
export type StepAction = {
  id: string
  label: string
  to: Stage
  tone: "default" | "positive" | "negative"
  asks?: ActionAsk
}

const A = (a: StepAction) => a
const lost = (label = "Close as lost"): StepAction => A({ id: "lost", label, to: "lost", tone: "negative", asks: "reason" })

/** What can be recorded from a stage. Ticking a task performs one of these. */
export function actionsFrom(stage: Stage): StepAction[] {
  switch (stage) {
    case "new":
      return [
        A({ id: "question_sent", label: "Question sent", to: "question_sent", tone: "default" }),
        A({ id: "site_sent", label: "Site sent", to: "site_sent", tone: "default" }),
      ]
    case "question_sent":
      return [
        A({ id: "question_replied", label: "They replied", to: "question_replied", tone: "positive" }),
        A({ id: "site_sent", label: "Site sent", to: "site_sent", tone: "default" }),
        lost(),
      ]
    case "question_replied":
      return [A({ id: "site_sent", label: "Site sent", to: "site_sent", tone: "default" }), lost()]
    case "site_sent":
      return [
        A({ id: "site_replied", label: "They replied", to: "site_replied", tone: "positive" }),
        A({ id: "call_scheduled", label: "Call booked", to: "call_scheduled", tone: "default", asks: "callAt" }),
        A({ id: "called", label: "Called — interested", to: "called", tone: "positive" }),
        lost("Called — not interested"),
      ]
    case "site_replied":
      return [
        A({ id: "site_positive", label: "Positive", to: "site_positive", tone: "positive" }),
        lost("Negative — close"),
      ]
    case "site_positive":
      return [
        A({ id: "call_scheduling", label: "Scheduling email sent", to: "call_scheduling", tone: "default" }),
        A({ id: "call_scheduled", label: "Call booked", to: "call_scheduled", tone: "default", asks: "callAt" }),
        lost(),
      ]
    case "call_scheduling":
      return [A({ id: "call_scheduled", label: "Call booked", to: "call_scheduled", tone: "default", asks: "callAt" }), lost()]
    case "call_scheduled":
      return [A({ id: "called", label: "Call done — interested", to: "called", tone: "positive" }), lost("Call done — not interested")]
    case "called":
      return [A({ id: "proposal_sent", label: "Proposal sent", to: "proposal_sent", tone: "default" }), lost()]
    case "proposal_sent":
      return [A({ id: "won", label: "Paid", to: "won", tone: "positive", asks: "deal" }), lost("Declined")]
    default:
      return []
  }
}

/* ------------------------------------------------------------------ next steps */

export type StepKind = "send_question" | "send_site" | "build" | "call" | "rate_reply" | "schedule_email" | "proposal"

export type Step = {
  kind: StepKind
  title: string
  detail?: string
  due: Date
  /** due: needs you now. upcoming: scheduled for later. */
  state: "due" | "upcoming"
  actions: StepAction[]
}

const DAY = 86_400_000
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY)

type StepInput = { stage: Stage; stageAt: Date; build: BuildState; callAt: Date | null; createdAt: Date }

/** Live next steps for a site, from its stage, the clock and the timing settings. */
export function nextSteps(site: StepInput, timing: Timing, now = new Date()): Step[] {
  const mk = (s: Omit<Step, "state">): Step => ({ ...s, state: s.due.getTime() <= now.getTime() ? "due" : "upcoming" })
  const acts = actionsFrom(site.stage)
  const pick = (...ids: string[]) => acts.filter((a) => ids.includes(a.id))
  const out: Step[] = []
  const built = site.build === "ready"

  switch (site.stage) {
    case "new":
      out.push(mk({ kind: "send_question", title: "Send the opening question", due: site.createdAt, actions: pick("question_sent") }))
      break
    case "question_sent": {
      const due = addDays(site.stageAt, timing.siteFollowUpDays)
      out.push(
        mk({
          kind: "send_site",
          title: built ? `Send the site if still no reply` : `Send the site if still no reply (not built yet)`,
          detail: `No reply after ${timing.siteFollowUpDays} days means the site goes out anyway.`,
          due,
          actions: pick("question_replied", "site_sent", "lost"),
        }),
      )
      if (!built) out.push(mk({ kind: "build", title: "Build the site", detail: "It needs to be ready by the time the question has been quiet.", due, actions: [] }))
      break
    }
    case "question_replied":
      if (built) out.push(mk({ kind: "send_site", title: "They replied — send the site", due: site.stageAt, actions: pick("site_sent", "lost") }))
      else out.push(mk({ kind: "build", title: "They replied — build the site now", due: site.stageAt, actions: [] }))
      break
    case "site_sent":
      out.push(
        mk({
          kind: "call",
          title: "No reply — call them",
          detail: `Silent for ${timing.callAfterSiteDays} days after the site went out.`,
          due: addDays(site.stageAt, timing.callAfterSiteDays),
          actions: pick("site_replied", "call_scheduled", "called", "lost"),
        }),
      )
      break
    case "site_replied":
      out.push(mk({ kind: "rate_reply", title: "Rate their reply", detail: "Positive or negative?", due: site.stageAt, actions: pick("site_positive", "lost") }))
      break
    case "site_positive":
      out.push(mk({ kind: "schedule_email", title: "Positive reply — send the call scheduling email", due: site.stageAt, actions: pick("call_scheduling", "call_scheduled", "lost") }))
      break
    case "call_scheduled":
      out.push(mk({ kind: "call", title: "Call them", due: site.callAt ?? site.stageAt, actions: pick("called", "lost") }))
      break
    case "called":
      out.push(mk({ kind: "proposal", title: "Send the proposal", due: site.stageAt, actions: pick("proposal_sent", "lost") }))
      break
  }
  return out
}

export function statusOf(stage: Stage, steps: Step[]): Status {
  if (stage === "won") return "won"
  if (stage === "lost") return "lost"
  if (stage === "new") return "not_started"
  return steps.some((s) => s.state === "due" && s.kind !== "build") ? "your_move" : "waiting"
}

export function isStage(x: unknown): x is Stage {
  return typeof x === "string" && (STAGES as readonly string[]).includes(x)
}
