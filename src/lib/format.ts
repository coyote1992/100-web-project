import { formatDistanceToNowStrict, format } from "date-fns"

export function hours(h: number) {
  if (h === 0) return "0h"
  if (h < 1) return `${Math.round(h * 60)}m`
  return `${h >= 10 ? Math.round(h) : Math.round(h * 10) / 10}h`
}

export function minutes(m: number) {
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h}h ${r}m` : `${h}h`
}

export function pct(x: number | null) {
  return x === null ? "—" : `${Math.round(x * 100)}%`
}

export function ratio(x: number | null, digits = 2) {
  return x === null ? "—" : x.toFixed(digits)
}

export function ago(d: Date | number) {
  const diff = Date.now() - new Date(d).getTime()
  if (diff < 60_000) return "just now"
  return `${formatDistanceToNowStrict(d)} ago`
}

export function day(d: Date | number) {
  return format(d, "d MMM")
}

export function dayTime(d: Date | number) {
  return format(d, "d MMM, HH:mm")
}

export function money(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n)
}

export function host(url: string) {
  try {
    return new URL(url.includes("://") ? url : `https://${url}`).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

export function href(url: string) {
  return url.includes("://") ? url : `https://${url}`
}
