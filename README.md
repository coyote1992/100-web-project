# Hundred

A tracker for the speculative website experiment: 5 verticals, 20 firms each. Rebuild a firm's site, send it, and record every step until the firm says no or pays.

## What it does

- **Sites.** Add a firm as soon as you start on it (press `N` and paste its URL). Track the build as *Scouted → Building → Demo ready*.
- **Outreach flow.** Each step from the whiteboard flow is one click: *Send question → Reply / No reply → Send site → Reply (positive / negative) / No reply → Call → Call & Proposal → Paid client*. Every step can be undone, backdated or given a note. Replies get a warm/neutral/cold rating.
- **Time.** A start/stop timer, or quick `+15m / +30m / +1h / +2h` chips, logged per site and per kind of work. Research, build, QA and outreach count as **speculative** time. Calls and admin don't.
- **Notes & lessons.** Write a note on any site and flag the ones worth keeping as lessons. You can promote a lesson into its vertical's **playbook**.
- **Build prompt.** "Copy build prompt" fills in the master rebuild prompt with the firm's URL and reference sites, then adds that vertical's playbook. Edit the template in Settings.
- **Insights.** Positive responses per hour of speculative work, positive rate per batch and batch size, reply rates, median reply time, and breakdowns by vertical, batch and build method.
- **Email.** `POST /api/inbound` accepts forwarded mail (in or out), matches it to a site by address or domain, and drops duplicates. Phone calls are recorded by hand in the flow (length plus what was said).

## Run it

```bash
npm install
npm run db:seed     # optional: fictional demo data (or load it from Settings)
npm run dev
```

The SQLite database lives in `data/hundred.db` and migrations run automatically.

## Deploy

1. Create a Turso database. Set `DATABASE_URL` (libsql://…) and `DATABASE_AUTH_TOKEN`.
2. Set `APP_PASSWORD` so the app isn't public.
3. For email, set `INBOUND_TOKEN` and `OUTREACH_ADDRESS`, then forward the outreach mailbox to `/api/inbound`. Cloudflare Email Workers, Postmark inbound and a Gmail Apps Script all work; see Settings → Email for the payload.

## Stack

Next.js 16 (App Router, server actions), shadcn/ui on Base UI, Tailwind v4, Drizzle and libSQL/SQLite, Recharts, and Sonner.

## Where things live

| | |
|---|---|
| `src/lib/flow.ts` | The outreach flow: nodes, edges, and the steps available from each stage |
| `src/lib/metrics.ts` | Every number on the dashboards |
| `src/db/schema.ts` | Tables. After changing them run `npm run db:generate` |
| `src/app/actions.ts` | All mutations |
| `src/app/api/inbound` | The email webhook |
