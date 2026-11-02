import { FileTextIcon, LayoutGridIcon, Settings2Icon } from "lucide-react"

export const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutGridIcon },
  { href: "/templates", label: "Templates", icon: FileTextIcon },
  { href: "/settings", label: "Settings", icon: Settings2Icon },
] as const
