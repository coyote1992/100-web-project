# Hundred

A project-management view of the speculative website experiment: 5 verticals, 20 firms each. **ChatGPT does the admin** (adds firms, syncs the Gmail inbox, pulls out what people say, moves sites along). **This app is where you see it all**, and where you tick, copy and write lessons.

## How it fits together

```
Gmail (outreach inbox) ⇄ ChatGPT ⇄ /api/v1 ⇄ Hundred (Next.js) ⇄ Supabase (Postgres)
```

- **Verticals** (you): name, plus the two reference sites, pasted by hand.
- **Sites** (ChatGPT): one page per firm, created through the API. Each page has the email conversation (read-only), what ChatGPT extracted from it (call time, objections, questions, interest), the next step, a **copy-ready build prompt** for Claude Code, and a place for your lessons.
- **Tasks**: next steps appear on their own from each site's stage and the clock (send the site after N quiet days, call after M quiet days, rate a reply, send the scheduling email, call on the booked day, send the proposal). Tick one and the site moves on. You can add your own tasks too.
- **Templates**: the build prompt, the send-the-site email and the call-scheduling email, plus the two timing values. ChatGPT reads them through the API.
- **Insights**: funnel, reply and positive rates with the sample size next to them, does asking first help, reply timing, pace, by vertical, by opening question, where sites are lost, and what people objected to.

## The flow

`new → question sent → (replied) → site sent → (replied → positive) → scheduling a call → call scheduled → called → proposal → paid`, with *closed* possible anywhere. If the question stays quiet for `siteFollowUpDays` (4) the site goes out anyway. If the site stays quiet for `callAfterSiteDays` (3), a call task appears.

## Run it

```bash
npm install
npm run db:seed     # optional: fictional demo data (or "Load demo data" in Settings)
npm run dev
```

Without `DATABASE_URL` it runs on a local Postgres in `./data/pglite`, with the same SQL as Supabase.

## Deploy (Vercel + Supabase)

1. **Supabase.** Create a project; copy the connection string (Project settings → Database → Connection string, the pooler one) into `DATABASE_URL` on Vercel. Tables are created on first load. The Vercel × Supabase integration works too (`POSTGRES_URL` is read as well).
2. **API token.** Set `API_TOKEN` to a long random string.
3. **Password.** Set `APP_PASSWORD` so the app isn't public (browser sign-in, any username). The API uses the token instead.
4. Redeploy, then follow **Settings → Connect ChatGPT**.

Until `DATABASE_URL` is set, Vercel runs on temporary storage and the app shows a banner saying so.

## The API (`/api/v1`, bearer token)

Machine-readable spec: `/api/v1/openapi.json` (import it as a Custom GPT action). The operating manual for ChatGPT is on the Settings page and at `/api/v1/instructions`.

| | |
|---|---|
| `GET /sites` · `POST /sites` | list (filter by stage, vertical, email, `needs=attention`) · add one or many firms |
| `GET /sites/{id}` | everything on a site, plus ready-filled drafts of the build prompt and both emails |
| `PATCH /sites/{id}` | stage (optionally backdated), call time and notes, demo URL, contact details… |
| `POST /messages` | log emails, in or out. Matches the site by id, address or domain, dedupes by `externalId`, moves the stage on replies and on `sentKind` |
| `POST /sites/{id}/extracts` | objections, questions, interest |
| `GET /tasks` · `POST /tasks` · `PATCH /tasks/{id}` | what needs you, and tasks of your own |
| `GET /templates` · `PUT /templates` | templates and timing |
| `POST /sync` | stamp the end of a mailbox sweep, shown in the sidebar |

## Where things live

| | |
|---|---|
| `src/lib/flow.ts` | Stages, the actions from each stage, and the next-step rules |
| `src/lib/metrics.ts` | Every number on the dashboards |
| `src/lib/domain.ts` | All writes, shared by the UI and the API |
| `src/lib/chatgpt.ts` | ChatGPT instructions and the OpenAPI schema |
| `src/db/schema.ts` | Tables. After changing them run `npm run db:generate` |
