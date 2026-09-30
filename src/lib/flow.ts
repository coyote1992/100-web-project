/**
 * The outreach flow, mirrored from the Whimsical "Outreach flow" board.
 *
 * Send question ─┬─ No reply ─┐
 *                └─ Reply ────┴─ Send site ─┬─ No reply ── Call ─┬─ Negative
 *                                           │                    └─ Call & Proposal ─┬─ Negative
 *                                           └─ Reply ─┬─ Negative                    └─ Paid client
 *                                                     └─ Positive ── Call & Proposal
 */

export const NODE_KEYS = [
  "question_sent",
  "question_no_reply",
  "question_replied",
  "site_sent",
  "site_no_reply",
  "site_replied",
  "call",
  "site_negative",
  "site_positive",
  "call_negative",
  "call_proposal",
  "proposal_negative",
  "paid",
] as const

export type NodeKey = (typeof NODE_KEYS)[number]

/** Who holds the ball at this node. */
export type Status = "waiting" | "your_move" | "won" | "lost"

/** action: something you do (amber in the board); outcome: something that happens to you. */
export type NodeKind = "action" | "outcome" | "won" | "lost"

export type FlowNode = {
  key: NodeKey
  label: string
  short: string
  kind: NodeKind
  status: Status
  /** Grid position for the flow board: column 0–6, row 0–4. */
  col: number
  row: number
}

export const NODES: Record<NodeKey, FlowNode> = {
  question_sent: { key: "question_sent", label: "Send question", short: "Question sent", kind: "action", status: "waiting", col: 0, row: 2 },
  question_no_reply: { key: "question_no_reply", label: "No reply", short: "No reply to question", kind: "outcome", status: "your_move", col: 1, row: 1 },
  question_replied: { key: "question_replied", label: "Reply", short: "Replied to question", kind: "outcome", status: "your_move", col: 1, row: 3 },
  site_sent: { key: "site_sent", label: "Send site", short: "Site sent", kind: "action", status: "waiting", col: 2, row: 2 },
  site_no_reply: { key: "site_no_reply", label: "No reply", short: "No reply to site", kind: "outcome", status: "your_move", col: 3, row: 1 },
  site_replied: { key: "site_replied", label: "Reply", short: "Replied to site", kind: "outcome", status: "waiting", col: 3, row: 3 },
  call: { key: "call", label: "Call", short: "Called", kind: "action", status: "your_move", col: 4, row: 0 },
  site_negative: { key: "site_negative", label: "Negative", short: "Declined the site", kind: "lost", status: "lost", col: 4, row: 2.6 },
  site_positive: { key: "site_positive", label: "Positive", short: "Positive reply", kind: "outcome", status: "your_move", col: 4, row: 3.9 },
  call_negative: { key: "call_negative", label: "Negative", short: "Declined on call", kind: "lost", status: "lost", col: 5, row: 0 },
  call_proposal: { key: "call_proposal", label: "Call & Proposal", short: "Proposal out", kind: "action", status: "waiting", col: 5, row: 1.8 },
  proposal_negative: { key: "proposal_negative", label: "Negative", short: "Declined proposal", kind: "lost", status: "lost", col: 6, row: 1 },
  paid: { key: "paid", label: "Paid client", short: "Paid client", kind: "won", status: "won", col: 6, row: 2.4 },
}

export const EDGES: [NodeKey, NodeKey][] = [
  ["question_sent", "question_no_reply"],
  ["question_sent", "question_replied"],
  ["question_no_reply", "site_sent"],
  ["question_replied", "site_sent"],
  ["site_sent", "site_no_reply"],
  ["site_sent", "site_replied"],
  ["site_no_reply", "call"],
  ["site_replied", "site_negative"],
  ["site_replied", "site_positive"],
  ["call", "call_negative"],
  ["call", "call_proposal"],
  ["site_positive", "call_proposal"],
  ["call_proposal", "proposal_negative"],
  ["call_proposal", "paid"],
]

/** Nodes that count as a positive response. */
export const POSITIVE_NODES: NodeKey[] = ["site_positive", "call_proposal", "paid"]

export type Tone = "default" | "positive" | "negative" | "quiet"

export type Transition = {
  id: string
  label: string
  /** Nodes recorded, in order. Lets one click walk "Reply → Positive". */
  path: NodeKey[]
  tone: Tone
  /** Extra input worth asking for. */
  asks?: "sentiment" | "call" | "deal"
  hint?: string
}

const T = (t: Transition) => t

/** What you can record next from a given position. `null` = not contacted yet. */
export function transitionsFrom(stage: NodeKey | null): Transition[] {
  switch (stage) {
    case null:
      return [
        T({ id: "q", label: "Sent the question", path: ["question_sent"], tone: "default", hint: "Opener email asking if they'd be open to a new site" }),
        T({ id: "s", label: "Sent the site directly", path: ["site_sent"], tone: "quiet", hint: "Skip the question step" }),
      ]
    case "question_sent":
      return [
        T({ id: "qr", label: "They replied", path: ["question_replied"], tone: "positive", asks: "sentiment" }),
        T({ id: "qn", label: "No reply", path: ["question_no_reply"], tone: "quiet" }),
      ]
    case "question_no_reply":
    case "question_replied":
      return [T({ id: "s", label: "Sent the site", path: ["site_sent"], tone: "default" })]
    case "site_sent":
      return [
        T({ id: "sp", label: "Positive reply", path: ["site_replied", "site_positive"], tone: "positive", asks: "sentiment" }),
        T({ id: "sn", label: "Negative reply", path: ["site_replied", "site_negative"], tone: "negative" }),
        T({ id: "sx", label: "No reply", path: ["site_no_reply"], tone: "quiet" }),
      ]
    case "site_replied":
      return [
        T({ id: "sp", label: "It was positive", path: ["site_positive"], tone: "positive" }),
        T({ id: "sn", label: "It was negative", path: ["site_negative"], tone: "negative" }),
      ]
    case "site_no_reply":
      return [
        T({ id: "cp", label: "Called — wants a proposal", path: ["call", "call_proposal"], tone: "positive", asks: "call" }),
        T({ id: "cn", label: "Called — not interested", path: ["call", "call_negative"], tone: "negative", asks: "call" }),
        T({ id: "c", label: "Called — undecided", path: ["call"], tone: "quiet", asks: "call" }),
      ]
    case "call":
      return [
        T({ id: "cp", label: "Moving to proposal", path: ["call_proposal"], tone: "positive", asks: "call" }),
        T({ id: "cn", label: "Not interested", path: ["call_negative"], tone: "negative" }),
      ]
    case "site_positive":
      return [T({ id: "cp", label: "Call & proposal done", path: ["call_proposal"], tone: "default", asks: "call" })]
    case "call_proposal":
      return [
        T({ id: "w", label: "Paid — new client", path: ["paid"], tone: "positive", asks: "deal" }),
        T({ id: "l", label: "Declined the proposal", path: ["proposal_negative"], tone: "negative" }),
      ]
    default:
      return []
  }
}

export function statusOf(stage: string | null, parked = false): Status | "not_started" | "parked" {
  if (parked) return "parked"
  if (!stage) return "not_started"
  return NODES[stage as NodeKey]?.status ?? "waiting"
}

export const STATUS_META: Record<ReturnType<typeof statusOf>, { label: string; token: string }> = {
  not_started: { label: "Not contacted", token: "var(--st-idle)" },
  waiting: { label: "Waiting on them", token: "var(--st-wait)" },
  your_move: { label: "Your move", token: "var(--st-move)" },
  won: { label: "Paid client", token: "var(--st-won)" },
  lost: { label: "Closed", token: "var(--st-lost)" },
  parked: { label: "Parked", token: "var(--st-idle)" },
}

export function stageLabel(stage: string | null) {
  if (!stage) return "Not contacted"
  return NODES[stage as NodeKey]?.short ?? stage
}

export const BUILD_STEPS = [
  { key: "scouted", label: "Scouted" },
  { key: "building", label: "Building" },
  { key: "ready", label: "Demo ready" },
] as const

export const WORK_KINDS = [
  { key: "research", label: "Research", speculative: true },
  { key: "build", label: "Build", speculative: true },
  { key: "qa", label: "QA & polish", speculative: true },
  { key: "outreach", label: "Outreach", speculative: true },
  { key: "sales", label: "Calls & sales", speculative: false },
  { key: "admin", label: "Admin", speculative: false },
] as const

export type WorkKind = (typeof WORK_KINDS)[number]["key"]

export const SPECULATIVE_KINDS = WORK_KINDS.filter((k) => k.speculative).map((k) => k.key) as string[]
