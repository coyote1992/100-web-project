"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { MoonIcon, SearchIcon, SunIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { cn } from "@/lib/utils"
import { NAV } from "./nav"
import { useUI } from "./providers"

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

/** Three tabs and nothing else. Site pages count as the dashboard. */
export function TopBar() {
  const pathname = usePathname()
  const ui = useUI()
  const { resolvedTheme, setTheme } = useTheme()
  const isActive = (href: string) => (href === "/" ? pathname === "/" || pathname.startsWith("/sites") : pathname.startsWith(href))

  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[1240px] items-center gap-2 px-4 sm:gap-6 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Hundred, dashboard">
          <Logo />
          <span className="display hidden text-[1.3rem] leading-none sm:inline">Hundred</span>
        </Link>

        <nav className="flex min-w-0 items-center gap-0.5" aria-label="Main">
          {NAV.map((n) => {
            const active = isActive(n.href)
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-8 items-center rounded-lg px-2 text-sm sm:px-2.5 transition-colors duration-150",
                  active ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                {n.label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => ui.openCommand()}
            className="pressable hidden h-8 items-center gap-2 rounded-lg border bg-surface px-2.5 text-sm text-muted-foreground hover:text-foreground md:inline-flex"
          >
            <SearchIcon className="size-4" />
            Find a club
            <span className="ml-3 flex gap-0.5">
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>
          <Button variant="ghost" size="icon-sm" aria-label="Find a club" className="md:hidden" onClick={() => ui.openCommand()}>
            <SearchIcon />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Toggle dark mode" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
            <SunIcon className="hidden dark:block" />
            <MoonIcon className="dark:hidden" />
          </Button>
        </div>
      </div>
    </header>
  )
}
