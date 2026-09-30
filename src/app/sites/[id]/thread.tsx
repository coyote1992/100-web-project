import { cn } from "@/lib/utils"
import { dayTime } from "@/lib/format"
import type { Message } from "@/db/schema"

function Body({ text }: { text: string }) {
  if (text.length <= 600) return <p className="text-sm leading-relaxed whitespace-pre-line">{text}</p>
  return (
    <details className="group">
      <summary className="cursor-pointer list-none text-sm leading-relaxed whitespace-pre-line marker:hidden">
        {text.slice(0, 380).trimEnd()}…
        <span className="ml-1 text-xs text-muted-foreground underline group-open:hidden">Show all</span>
      </summary>
      <p className="mt-2 hidden text-sm leading-relaxed whitespace-pre-line group-open:block">{text.slice(380)}</p>
    </details>
  )
}

/** The email conversation, oldest first. Read-only: the ChatGPT sync writes it. */
export function Thread({ messages, name }: { messages: Message[]; name: string }) {
  if (!messages.length)
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        No emails yet. When ChatGPT syncs the mailbox, the conversation with {name} shows up here.
      </div>
    )
  return (
    <ol className="grid gap-3">
      {messages.map((m, i) => {
        const out = m.direction === "out"
        const newSubject = m.subject && m.subject !== messages[i - 1]?.subject
        return (
          <li key={m.id} className={cn("flex flex-col", out ? "items-end" : "items-start")}>
            <div className={cn("max-w-[min(92%,36rem)] rounded-2xl border px-3.5 py-2.5", out ? "rounded-br-md bg-muted/70" : "rounded-bl-md bg-surface shadow-[0_1px_2px_oklch(0.3_0.02_60/0.05)]")}>
              {newSubject && <p className="mb-1 text-sm font-medium">{m.subject}</p>}
              <Body text={m.body || "(empty message)"} />
            </div>
            <time className="num mt-1 px-1 text-xs text-muted-foreground" dateTime={m.at.toISOString()}>
              {out ? "You" : name} · {dayTime(m.at)}
            </time>
          </li>
        )
      })}
    </ol>
  )
}
