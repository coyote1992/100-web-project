import type { Prospect } from "@/db/schema"
import { host } from "./format"

const FREEMAIL = new Set(["gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "yahoo.com", "icloud.com", "freemail.hu", "citromail.hu", "t-online.hu"])

/** Pull a bare address out of `"Name" <a@b.c>`. */
export function address(s: string) {
  const m = s.match(/<([^>]+)>/)
  return (m ? m[1] : s).trim().toLowerCase()
}

/** Match an email address to a site: exact address first, then the company domain. */
export function matchProspect(addr: string, prospects: Prospect[]) {
  const a = address(addr)
  const exact = prospects.find((p) => p.email && p.email.toLowerCase() === a)
  if (exact) return exact
  const domain = a.split("@")[1]
  if (!domain || FREEMAIL.has(domain)) return undefined
  return prospects.find((p) => [p.oldSiteUrl, p.email.split("@")[1] ?? ""].some((u) => u && host(u).toLowerCase() === domain))
}
