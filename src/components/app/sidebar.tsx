"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { MenuIcon, MoonIcon, SearchIcon, SunIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { NAV } from "./nav"
import { useUI } from "./providers"
import { vColor } from "./status"

export type Progress = { name: string; hue: number; count: number; target: number }[]
export type Sync = { at: number | null; note: string }

export function Logo({ className }: { className?: string }) {
  // Twenty dots: one vertical's worth, seven of them filled.
  return (
    <svg viewBox="0 0 22 18" className={cn("size-5", className)} aria-hidden>
      {Array.from({ length: 20 }, (_, i) => (
        <circle key={i} cx={(i % 5) * 4.5 + 2} cy={Math.floor(i / 5) * 4.5 + 2} r={1.55} fill="currentColor" opacity={i < 7 ? 1 : 0.28} />
      ))}
    </svg>
  )
}

function useTick(ms: number) {
  const [now, setNow] = React.useState<number | null>(null)
  React.useEffect(() => {
    const first = setTimeout(() => setNow(Date.now()), 0)
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => {
      clearTimeout(first)
      clearInterval(t)
    }
  }, [ms])
  return now
}

/** When the ChatGPT mailbox sweep last checked in. Amber when it has gone quiet. */
function SyncChip({ sync }: { sync: Sync }) {
  const now = useTick(30_000)
  if (!sync.at) {
    return (
      <div className="rounded-xl border border-dashed border-sidebar-border px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
        Mailbox sweep hasn&rsquo;t checked in yet.{" "}
        <Link href="/settings" className="underline hover:text-foreground">
          Connect ChatGPT
        </Link>
      </div>
    )
  }
  const mins = now === null ? null : Math.max(0, Math.round((now - sync.at) / 60_000))
  const stale = mins !== null && mins > 90
  const label = mins === null ? "" : mins < 1 ? "just now" : mins < 60 ? `${mins} min ago` : mins < 2880 ? `${Math.round(mins / 60)} h ago` : `${Math.round(mins / 1440)} days ago`
  return (
    <div className={cn("rounded-xl border px-3 py-2.5 text-xs", stale ? "border-move-line bg-move-soft" : "border-sidebar-border")} title={sync.note}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className={cn("size-1.5 rounded-full", stale ? "bg-st-move" : "bg-positive")} />
        Inbox synced <span className="num text-foreground">{label}</span>
      </div>
      {stale && <p className="mt-1 text-muted-foreground">The sweep looks stalled. Check ChatGPT.</p>}
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
          <span key={p.name} title={`${p.name}: ${p.count}/${p.target}`} className="h-full" style={{ width: `${(Math.min(p.count, p.target) / target) * 100}%`, background: vColor(p.hue, 0.7, 0.12) }} />
        ))}
      </div>
    </div>
  )
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  return (
    <Button variant="ghost" size="icon-sm" aria-label="Toggle dark mode" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
      <SunIcon className="hidden dark:block" />
      <MoonIcon className="dark:hidden" />
    </Button>
  )
}

function SidebarBody({ badges, progress, sync, onNavigate }: { badges: Record<string, number>; progress: Progress; sync: Sync; onNavigate?: () => void }) {
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
              {badge ? <span className="num ml-auto rounded-md bg-st-move/25 px-1.5 text-xs font-medium text-foreground">{badge}</span> : null}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto grid gap-4">
        <ProgressRibbon progress={progress} />
        <SyncChip sync={sync} />
      </div>
    </div>
  )
}

export function Sidebar(props: { badges: Record<string, number>; progress: Progress; sync: Sync }) {
  const [open, setOpen] = React.useState(false)
  const ui = useUI()
  const due = props.badges["/tasks"]
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
        <div className="ml-auto flex items-center gap-1">
          {due ? (
            <Link href="/tasks" className="num mr-1 rounded-full bg-st-move/25 px-2 py-0.5 text-xs font-medium">
              {due} due
            </Link>
          ) : null}
          <Button variant="ghost" size="icon" aria-label="Search" onClick={() => ui.openCommand()}>
            <SearchIcon />
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
