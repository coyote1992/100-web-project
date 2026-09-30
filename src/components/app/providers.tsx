"use client"

import * as React from "react"
import { ThemeProvider } from "next-themes"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { NewSiteDialog } from "./new-site-dialog"
import { CommandMenu } from "./command-menu"

export type Lookup = {
  verticals: { id: string; name: string; hue: number }[]
  batches: { id: string; name: string }[]
  sites: { id: string; name: string; verticalId: string; city: string; status: string; stage: string | null }[]
}

type UI = {
  newSite: (preset?: { verticalId?: string; batchId?: string }) => void
  openCommand: () => void
}

const UIContext = React.createContext<UI | null>(null)

export function useUI() {
  const ctx = React.useContext(UIContext)
  if (!ctx) throw new Error("useUI outside provider")
  return ctx
}

export function Providers({
  children,
  lookup,
}: {
  children: React.ReactNode
  lookup: Lookup
}) {
  const [newOpen, setNewOpen] = React.useState(false)
  const [preset, setPreset] = React.useState<{ verticalId?: string; batchId?: string }>()
  const [cmdOpen, setCmdOpen] = React.useState(false)
  const [newKey, setNewKey] = React.useState(0)

  const ui = React.useMemo<UI>(
    () => ({
      newSite: (p) => {
        setPreset(p)
        setNewKey((k) => k + 1)
        setNewOpen(true)
      },
      openCommand: () => setCmdOpen(true),
    }),
    [],
  )

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const typing = target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setCmdOpen((o) => !o)
      } else if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault()
        ui.newSite()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [ui])

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider delay={250}>
        <UIContext.Provider value={ui}>
          {children}
          <NewSiteDialog key={newKey} open={newOpen} onOpenChange={setNewOpen} preset={preset} lookup={lookup} />
          <CommandMenu open={cmdOpen} onOpenChange={setCmdOpen} lookup={lookup} />
          <Toaster position="bottom-right" />
        </UIContext.Provider>
      </TooltipProvider>
    </ThemeProvider>
  )
}
