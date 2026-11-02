import type { BoardKey } from "./flow"

/** The dashboard stages' colours (tokens in globals.css). Shared by server and client components. */
export const STAGE_COLOR: Record<BoardKey, string> = {
  not_contacted: "var(--stage-idle)",
  question_sent: "var(--stage-1)",
  response: "var(--stage-2)",
  site_sent: "var(--stage-3)",
  site_reply: "var(--stage-4)",
  call: "var(--stage-5)",
  order: "var(--stage-6)",
  lost: "var(--stage-lost)",
}
