"use client"

import { PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUI } from "./providers"

export function NewSiteButton({ verticalId, batchId, label = "Add a site" }: { verticalId?: string; batchId?: string; label?: string }) {
  const ui = useUI()
  return (
    <Button onClick={() => ui.newSite({ verticalId, batchId })}>
      <PlusIcon />
      {label}
    </Button>
  )
}
