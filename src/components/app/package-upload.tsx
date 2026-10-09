"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { DownloadIcon, PackageIcon, Trash2Icon } from "lucide-react"
import { finishUpload, prepareUpload, removePackage } from "@/app/actions"
import { cn } from "@/lib/utils"

const mb = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`)

/** Drop or pick a zip of the finished site. It goes straight to storage, then gets attached to the site. */
export type PackageView = { id: string; name: string; size: number; at: number }

export function PackageUpload({ kind, id, packages, title = "Packages (zip)" }: { kind: "site" | "vertical"; id: string; packages: PackageView[]; title?: string }) {
  const router = useRouter()
  const input = React.useRef<HTMLInputElement>(null)
  const [busy, setBusy] = React.useState(false)
  const [over, setOver] = React.useState(false)

  async function upload(file: File | undefined) {
    if (!file) return
    if (!/\.zip$/i.test(file.name)) return void toast.error("Pick a .zip file.")
    if (file.size > 50 * 1024 * 1024) return void toast.error("That zip is over 50 MB.")
    setBusy(true)
    try {
      const prep = await prepareUpload(kind, id, file.name)
      if (!prep.ok) return void toast.error(prep.error)
      const put = await fetch(prep.value.uploadUrl, { method: "PUT", headers: { "content-type": "application/zip" }, body: file })
      if (!put.ok) return void toast.error(`Upload failed (${put.status}).`)
      const fin = await finishUpload(kind, id, prep.value.path, prep.value.name)
      if (!fin.ok) return void toast.error(fin.error)
      toast.success("Package attached.")
      router.refresh()
    } catch {
      toast.error("Upload failed. Check your connection and try again.")
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ""
    }
  }

  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium">{title}</p>
      {packages.map((pkg) => (
        <div key={pkg.id} className="flex items-center gap-3 rounded-lg border bg-surface px-3 py-2 text-sm">
          <PackageIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate">{pkg.name}</span>
          <span className="num text-xs text-muted-foreground">{mb(pkg.size)}</span>
          <a href={`/api/packages/${kind}/${id}?file=${pkg.id}`} aria-label={`Download ${pkg.name}`} className="text-muted-foreground hover:text-foreground">
            <DownloadIcon className="size-4" />
          </a>
          <button
            aria-label={`Remove ${pkg.name}`}
            className="text-muted-foreground hover:text-foreground"
            onClick={async () => {
              const r = await removePackage(kind, id, pkg.id)
              if (!r.ok) toast.error(r.error)
              else router.refresh()
            }}
          >
            <Trash2Icon className="size-4" />
          </button>
        </div>
      ))}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          void upload(e.dataTransfer.files[0])
        }}
        className={cn("rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground transition-colors", over && "border-foreground/60 bg-accent")}
      >
        {busy ? "Uploading…" : (
          <>
            Drop a zip here or{" "}
            <button className="underline hover:text-foreground" onClick={() => input.current?.click()}>
              choose a file
            </button>
            {kind === "site" && packages.length ? ". It replaces the current one." : "."}
          </>
        )}
        <input ref={input} type="file" accept=".zip,application/zip" className="hidden" onChange={(e) => void upload(e.target.files?.[0])} />
      </div>
    </div>
  )
}
