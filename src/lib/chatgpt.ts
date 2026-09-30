import { EXTRACT_KINDS, STAGES } from "./flow"

/** The operating manual to paste into the ChatGPT project / custom GPT that runs this app. */
export function instructions(base: string) {
  return `You run the day-to-day admin for "Hundred", an application that tracks a cold-outreach experiment: I rebuild websites for small businesses (tennis clubs, padel clubs, pilates studios, gyms, wedding venues), email the owners, and record what happens. The app is the source of truth for every firm, its email conversation and its stage. You are the link between my dedicated Gmail inbox and the app. Use the Hundred API (the action you have) for everything, and never guess ids: look them up.

App: ${base}
Each firm ("site") has its own page at ${base}/sites/{id}.

## The flow
1. Opening question: I choose questions per vertical, you email each firm a smart question about their service and website. Stage: question_sent.
2. If they reply: stage question_replied, then send the site right away. If they stay silent, send the site anyway after "siteFollowUpDays" (default 4; read it from GET /templates).
3. Sending the site: use the site's "drafts.sendSiteEmail" (GET /sites/{id}), personalise it lightly, send it from Gmail. Stage: site_sent.
4. If they reply to the site: read it. Negative or "no thanks" means stage lost (with lostReason). Positive means stage site_positive, and you send the call scheduling email ("drafts.callSchedulingEmail"), then stage call_scheduling. When a time is agreed, set callAt (stage becomes call_scheduled).
5. If they stay silent for "callAfterSiteDays" (default 3) after the site, it becomes a phone task for me. I make the call and tell you the outcome.
6. After a call: not interested means lost. Interested means stage called, then proposal_sent, then won (with dealValue).
Stages: ${STAGES.join(", ")}.

## Every 30 minutes: mailbox sweep
1. GET /sites to learn each firm's id, email and stage (it also returns lastSyncAt).
2. Look for mail in the outreach inbox newer than the last sweep, to or from those firms (match the address, or the firm's domain).
3. For each email, POST /messages with direction "in" or "out", from, to, subject, body (plain text, without long quoted history), at (the real send time, ISO 8601) and externalId (the Gmail message id, which makes re-sending safe). Include siteId when you know it, otherwise email. For mail I sent, add sentKind: "question", "site" or "call_scheduling" so the stage moves and the follow-up timers start from the true send time. The app moves the stage itself when a reply arrives (question_sent to question_replied, site_sent to site_replied).
4. Read each incoming email and record what matters with POST /sites/{id}/extracts. kind is one of: ${EXTRACT_KINDS.join(", ")}. Write one short sentence each: objections ("Thinks €1,800 is too much"), questions they asked ("Asks who hosts the site"), signs of interest, and anything else useful. Do not repeat extracts that already exist. If they propose or confirm a call time, PATCH the site with callAt and put agenda notes in callNotes.
5. If the reply to the site is clearly positive or negative, PATCH the stage as described above. If it is ambiguous, leave the stage as site_replied and tell me.
6. Finish every sweep with POST /sync and a one-line note ("2 new replies: Core & Calm (positive), Iron District (no thanks)"), even when nothing changed.
Emails that match no site: do not create sites; mention them to me.

## Adding firms
When I give you firms for a vertical, POST /sites with name, vertical (its exact name; GET /verticals lists them), oldSiteUrl, email, city, contactName. I create verticals myself. Duplicates are ignored. Never mark a site built: I do that.

## Sending emails
Draft the email in the chat and wait for my OK before sending. After sending, always log it with POST /messages so the app matches Gmail.

## What I usually ask
- "What needs me?" GET /tasks. Summarise: what's due now, what's coming up, and what to do about each.
- "How's <firm>?" GET /sites/{id}: stage, conversation, extracts, call notes.
- "Send the site to <firm>": as above. "Reply to <firm>": read the thread, draft, wait for OK.
- Editing templates or timing: PUT /templates. Changing a firm's details: PATCH /sites/{id}.
- Lessons: I write those myself on the site page. POST /sites/{id}/lessons only if I dictate one.

## Rules
- Facts only. Do not invent replies, dates or prices. If an email is unclear, say so.
- Do not close a site as lost unless the message is clearly a no.
- Times are ISO 8601 with a timezone. I am in Europe/Budapest.
- If the API returns an error, read the message: it explains what to fix. Try once more, then tell me.`
}

type Schema = Record<string, unknown>
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` })
const idParam = { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
const ok = (description: string, schema?: Schema) => ({ description, content: { "application/json": { schema: schema ?? { type: "object" } } } })
const body = (schema: Schema) => ({ required: true, content: { "application/json": { schema } } })

/** OpenAPI 3.1 description of /api/v1, for a Custom GPT action (or any HTTP client). */
export function openapi(base: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: "Hundred API",
      version: "1.0.0",
      description: "Read and update the Hundred outreach tracker: sites, their email conversations, extracted notes, tasks, templates.",
    },
    servers: [{ url: base }],
    security: [{ bearer: [] }],
    paths: {
      "/api/v1/sites": {
        get: {
          operationId: "listSites",
          summary: "List sites with stage, next steps and last message",
          parameters: [
            { name: "stage", in: "query", schema: { type: "string", enum: [...STAGES] } },
            { name: "vertical", in: "query", schema: { type: "string" }, description: "Vertical name or id" },
            { name: "email", in: "query", schema: { type: "string" } },
            { name: "needs", in: "query", schema: { type: "string", enum: ["attention"] }, description: "Only sites with something due now" },
          ],
          responses: { "200": ok("Sites") },
        },
        post: {
          operationId: "createSites",
          summary: "Add one or many firms (each becomes a site page)",
          requestBody: body({ oneOf: [ref("NewSite"), { type: "object", required: ["sites"], properties: { sites: { type: "array", items: ref("NewSite") } } }] }),
          responses: { "200": ok("Created") },
        },
      },
      "/api/v1/sites/{id}": {
        get: { operationId: "getSite", summary: "Full detail: messages, extracts, lessons, history, and drafts of every email and the build prompt", parameters: [idParam], responses: { "200": ok("Site") } },
        patch: { operationId: "updateSite", summary: "Change stage, call time, contact details, build/demo URL, etc.", parameters: [idParam], requestBody: body(ref("SitePatch")), responses: { "200": ok("Updated site") } },
        delete: { operationId: "deleteSite", summary: "Delete a site and everything on it", parameters: [idParam], responses: { "200": ok("Deleted") } },
      },
      "/api/v1/messages": {
        post: {
          operationId: "logMessages",
          summary: "Log one or many emails (incoming or outgoing). Matches the site, dedupes by externalId, moves the stage on replies and on sentKind.",
          requestBody: body({ oneOf: [ref("Message"), { type: "object", required: ["messages"], properties: { messages: { type: "array", items: ref("Message") } } }] }),
          responses: { "200": ok("Per-message results") },
        },
      },
      "/api/v1/sites/{id}/extracts": {
        post: {
          operationId: "addExtracts",
          summary: "Record objections, questions, interest found in emails",
          parameters: [idParam],
          requestBody: body({ oneOf: [ref("Extract"), { type: "object", required: ["extracts"], properties: { extracts: { type: "array", items: ref("Extract") } } }] }),
          responses: { "200": ok("Saved") },
        },
      },
      "/api/v1/extracts/{id}": { delete: { operationId: "deleteExtract", summary: "Remove a wrong extract", parameters: [idParam], responses: { "200": ok("Deleted") } } },
      "/api/v1/sites/{id}/lessons": {
        post: {
          operationId: "addLesson",
          summary: "Add a lesson to a site (only when the user dictates one)",
          parameters: [idParam],
          requestBody: body({ type: "object", required: ["body"], properties: { body: { type: "string" } } }),
          responses: { "200": ok("Saved") },
        },
      },
      "/api/v1/tasks": {
        get: { operationId: "listTasks", summary: "What needs the user: due now and coming up (next steps of every site plus manual tasks)", responses: { "200": ok("Tasks") } },
        post: {
          operationId: "createTask",
          summary: "Create a task, optionally tied to a site",
          requestBody: body({ type: "object", required: ["title"], properties: { siteId: { type: "string", format: "uuid" }, title: { type: "string" }, note: { type: "string" }, dueAt: { type: "string", format: "date-time" } } }),
          responses: { "200": ok("Created") },
        },
      },
      "/api/v1/tasks/{id}": {
        patch: { operationId: "completeTask", summary: "Tick or untick a task", parameters: [idParam], requestBody: body({ type: "object", required: ["done"], properties: { done: { type: "boolean" } } }), responses: { "200": ok("Updated") } },
      },
      "/api/v1/verticals": { get: { operationId: "listVerticals", summary: "Verticals with their reference sites and site counts", responses: { "200": ok("Verticals") } } },
      "/api/v1/templates": {
        get: { operationId: "getTemplates", summary: "Build prompt, send-site email, call-scheduling email and the follow-up timing", responses: { "200": ok("Templates") } },
        put: { operationId: "updateTemplates", summary: "Edit any template or timing value", requestBody: body(ref("TemplatePatch")), responses: { "200": ok("Templates") } },
      },
      "/api/v1/sync": {
        post: {
          operationId: "markSynced",
          summary: "Call at the end of every mailbox sweep so the app shows when it last ran",
          requestBody: { required: false, content: { "application/json": { schema: { type: "object", properties: { note: { type: "string" } } } } } },
          responses: { "200": ok("Recorded") },
        },
      },
    },
    components: {
      securitySchemes: { bearer: { type: "http", scheme: "bearer" } },
      schemas: {
        NewSite: {
          type: "object",
          required: ["name", "vertical"],
          properties: { name: { type: "string" }, vertical: { type: "string", description: "Exact vertical name" }, oldSiteUrl: { type: "string" }, email: { type: "string" }, city: { type: "string" }, phone: { type: "string" }, contactName: { type: "string" } },
        },
        SitePatch: {
          type: "object",
          properties: {
            stage: { type: "string", enum: [...STAGES] },
            stageAt: { type: "string", format: "date-time", description: "When the stage really began (defaults to now)" },
            note: { type: "string" },
            lostReason: { type: "string" },
            dealValue: { type: "integer" },
            callAt: { type: ["string", "null"], format: "date-time" },
            callNotes: { type: "string" },
            build: { type: "string", enum: ["todo", "building", "ready"] },
            demoUrl: { type: "string" },
            questionVariant: { type: "string" },
            name: { type: "string" },
            city: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            contactName: { type: "string" },
            oldSiteUrl: { type: "string" },
            vertical: { type: "string" },
          },
        },
        Message: {
          type: "object",
          required: ["direction"],
          properties: {
            siteId: { type: "string", format: "uuid" },
            email: { type: "string", description: "The firm's address if siteId is unknown" },
            direction: { type: "string", enum: ["in", "out"] },
            from: { type: "string" },
            to: { type: "string" },
            subject: { type: "string" },
            body: { type: "string" },
            at: { type: "string", format: "date-time" },
            externalId: { type: "string", description: "Gmail message id; makes re-sending safe" },
            sentKind: { type: "string", enum: ["question", "site", "call_scheduling"], description: "For outgoing mail: which step it was" },
            questionVariant: { type: "string", description: "Which opening question was used" },
          },
        },
        Extract: { type: "object", required: ["kind", "text"], properties: { kind: { type: "string", enum: [...EXTRACT_KINDS] }, text: { type: "string" }, messageId: { type: "string", format: "uuid" } } },
        TemplatePatch: {
          type: "object",
          properties: { buildPrompt: { type: "string" }, sendSiteTemplate: { type: "string" }, callSchedulingTemplate: { type: "string" }, siteFollowUpDays: { type: "integer" }, callAfterSiteDays: { type: "integer" } },
        },
      },
    },
  }
}
