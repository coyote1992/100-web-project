"use client"

import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/components/ui/command"
import { NAV } from "./nav"
import { StatusDot } from "./status"
import { useUI, type Lookup } from "./providers"
import { PlusIcon, SunMoonIcon } from "lucide-react"
import type { STATUS_META } from "@/lib/flow"

export function CommandMenu({ open, onOpenChange, lookup }: { open: boolean; onOpenChange: (o: boolean) => void; lookup: Lookup }) {
  const router = useRouter()
  const ui = useUI()
  const { resolvedTheme, setTheme } = useTheme()
  const vName = new Map(lookup.verticals.map((v) => [v.id, v.name]))

  const go = (fn: () => void) => {
    onOpenChange(false)
    fn()
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Jump to" description="Search sites, pages and actions" className="sm:max-w-xl">
      <Command>
      <CommandInput placeholder="Search sites, pages, actions…" />
      <CommandList className="max-h-[min(24rem,60vh)]">
        <CommandEmpty>Nothing matches.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => go(() => ui.newSite())}>
            <PlusIcon />
            Add a site
            <CommandShortcut>N</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))}>
            <SunMoonIcon />
            Toggle dark mode
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Sites">
          {lookup.sites.map((s) => (
            <CommandItem
              key={s.id}
              value={`${s.name} ${s.city} ${vName.get(s.verticalId) ?? ""}`}
              onSelect={() => go(() => router.push(`/sites/${s.id}`))}
            >
              <StatusDot status={s.status as keyof typeof STATUS_META} className="mx-1" />
              <span className="truncate">{s.name}</span>
              <span className="ml-auto truncate text-xs text-muted-foreground">{vName.get(s.verticalId)}</span>
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
