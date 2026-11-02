"use client"

import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { NAV } from "./nav"
import { StageSwatch } from "./stage"
import type { Lookup } from "./providers"
import { SunMoonIcon } from "lucide-react"
import { BOARD_LABEL } from "@/lib/flow"

export function CommandMenu({ open, onOpenChange, lookup }: { open: boolean; onOpenChange: (o: boolean) => void; lookup: Lookup }) {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()

  const go = (fn: () => void) => {
    onOpenChange(false)
    fn()
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Jump to" description="Search clubs and pages" className="sm:max-w-xl">
      <Command>
      <CommandInput placeholder="Search clubs, pages…" />
      <CommandList className="max-h-[min(24rem,60vh)]">
        <CommandEmpty>Nothing matches.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => go(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))}>
            <SunMoonIcon />
            Toggle dark mode
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Clubs">
          {lookup.sites.map((s) => (
            <CommandItem
              key={s.id}
              value={`${s.name} ${s.city}`}
              onSelect={() => go(() => router.push(`/sites/${s.id}`))}
            >
              <StageSwatch stage={s.board} className="mx-1" />
              <span className="truncate">{s.name}</span>
              <span className="ml-auto truncate text-xs text-muted-foreground">{BOARD_LABEL[s.board]}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Pages">
          {NAV.map((n) => (
            <CommandItem key={n.href} onSelect={() => go(() => router.push(n.href))}>
              <n.icon />
              {n.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
      </Command>
    </CommandDialog>
  )
}
