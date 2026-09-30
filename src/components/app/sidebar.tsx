"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { MenuIcon, MoonIcon, PlusIcon, SearchIcon, SquareIcon, SunIcon } from "lucide-react"
import { stopTimer } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { WORK_KINDS } from "@/lib/flow"
import { useNow } from "@/hooks/use-now"
import { NAV } from "./nav"
import { useUI } from "./providers"
import { vColor } from "./status"

export type RunningTimer = {
  id: string
  startedAt: number
  minutes: number
  kind: string
  prospectId: string | null
  prospectName: string | null
} | null

export type Progress = { name: string; hue: number; count: number; target: number }[]

export function Logo({ className }: { className?: string }) {
  // Twenty dots: one vertical's worth. Five filled — the first batch.
  return (
    <svg viewBox="0 0 22 18" className={cn("size-5", className)} aria-hidden>
      {Array.from({ length: 20 }, (_, i) => {
        const x = (i % 5) * 4.5 + 2
        const y = Math.floor(i / 5) * 4.5 + 2
        return <circle key={i} cx={x} cy={y} r={1.55} fill="currentColor" opacity={i < 7 ? 1 : 0.28} />
      })}
    </svg>
  )
}

function useElapsed(timer: RunningTimer) {
  const now = useNow(!!timer)
  if (!timer) return ""
  if (now === null) return "–:––"
  const s = Math.max(0, Math.floor((now - timer.startedAt) / 1000)) + timer.minutes * 60
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${h ? `${h}:` : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(sec).padStart(2, "0")}`
}

function TimerCard({ timer }: { timer: RunningTimer }) {
  const elapsed = useElapsed(timer)
  const [pending, start] = React.useTransition()
  if (!timer) {
    return (
      <div className="rounded-xl border border-dashed border-sidebar-border px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
        No timer running. Start one from any site to log speculative hours.
      </div>
    )
  }
  const kind = WORK_KINDS.find((k) => k.key === timer.kind)?.label ?? timer.kind
  return (
    <div className="rounded-xl border border-move-line bg-move-soft px-3 py-2.5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="relative flex size-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-st-move opacity-60 [animation-duration:2s]" />
          <span className="relative size-2 rounded-full bg-st-move" />
        </span>
        {kind}
      </div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <div className="min-w-0">
          {timer.prospectId ? (
            <Link href={`/sites/${timer.prospectId}`} className="block truncate text-sm font-medium hover:underline">
              {timer.prospectName}
            </Link>
          ) : (
            <span className="block truncate text-sm font-medium">General work</span>
          )}
          <span className="num text-2xl leading-none font-medium tracking-tight">{elapsed}</span>
        </div>
        <Button
          size="icon-sm"
          variant="outline"
          aria-label="Stop timer"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await stopTimer()
              toast.success(`Logged ${elapsed} of ${kind.toLowerCase()}`)
            })
          }
        >
          <SquareIcon className="fill-current" />
        </Button>
      </div>
    </div>
  )
}

function ProgressRibbon({ progress }: { progress: Progress }) {
  const total = progress.reduce((a, p) => a + p.count, 0)
  const target = progress.reduce((a, p) => a + p.target, 0) || 100
  return (
    <div className="px-1">
      <div className="flex items-baseline justify-between text-xs text-muted-foreground">
        <span>Sites in play</span>
        <span className="num">
          <span className="font-medium text-foreground">{total}</span> / {target}
        </span>
      </div>
      <div className="mt-1.5 flex h-1.5 gap-px overflow-hidden rounded-full bg-foreground/8">
        {progress.map((p) => (
          <span
            key={p.name}
            title={`${p.name}: ${p.count}/${p.target}`}
            className="h-full"
            style={{ width: `${(Math.min(p.count, p.target) / target) * 100}%`, background: vColor(p.hue, 0.7, 0.12) }}
          />
        ))}
      </div>
    </div>
  )
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Toggle dark mode"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <SunIcon className="hidden dark:block" />
      <MoonIcon className="dark:hidden" />
    </Button>
  )
}

function SidebarBody({ timer, badges, progress, onNavigate }: { timer: RunningTimer; badges: Record<string, number>; progress: Progress; onNavigate?: () => void }) {
  const pathname = usePathname()
  const ui = useUI()
  return (
    <div className="flex h-full flex-col gap-5 p-3">
      <div className="flex items-center justify-between px-1 pt-1">
        <Link href="/" onClick={onNavigate} className="flex items-center gap-2">
          <Logo />
          <span className="display text-[1.35rem] leading-none">Hundred</span>
        </Link>
        <ThemeToggle />
      </div>

      <div className="grid gap-1.5">
        <Button className="w-full justify-start" onClick={() => ui.newSite()}>
          <PlusIcon />
          Add a site
          <Kbd className="ml-auto bg-primary-foreground/15 text-primary-foreground">N</Kbd>
        </Button>
        <button
          onClick={() => ui.openCommand()}
          className="pressable flex h-8 items-center gap-2 rounded-lg border border-sidebar-border bg-background/60 px-2.5 text-sm text-muted-foreground hover:bg-background"
        >
          <SearchIcon className="size-4" />
          Jump to…
          <span className="ml-auto flex gap-0.5">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
      </div>

      <nav className="grid gap-0.5">
        {NAV.map((n) => {
          const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href)
          const badge = badges[n.href]
          return (
            <Link
              key={n.href}
              href={n.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors duration-150",
                active ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              <n.icon className={cn("size-4", active ? "opacity-100" : "opacity-60")} />
              {n.label}
              {badge ? (
                <span className="num ml-auto rounded-md bg-st-move/25 px-1.5 text-xs font-medium text-foreground">{badge}</span>
              ) : null}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto grid gap-4">
        <ProgressRibbon progress={progress} />
        <TimerCard timer={timer} />
      </div>
    </div>
  )
}

export function Sidebar(props: { timer: RunningTimer; badges: Record<string, number>; progress: Progress }) {
  const [open, setOpen] = React.useState(false)
  const ui = useUI()
  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
        <SidebarBody {...props} />
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur-md lg:hidden">
        <Button variant="ghost" size="icon" aria-label="Open menu" onClick={() => setOpen(true)}>
          <MenuIcon />
        </Button>
        <Link href="/" className="flex items-center gap-2">
          <Logo />
          <span className="display text-xl leading-none">Hundred</span>
        </Link>
        {props.timer && (
          <span className="ml-2 flex items-center gap-1.5 rounded-full bg-move-soft px-2 py-0.5 text-xs">
            <span className="size-1.5 rounded-full bg-st-move" /> Timer on
          </span>
        )}
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" aria-label="Search" onClick={() => ui.openCommand()}>
            <SearchIcon />
          </Button>
          <Button size="icon" aria-label="Add a site" onClick={() => ui.newSite()}>
            <PlusIcon />
          </Button>
        </div>
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarBody {...props} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  )
}
