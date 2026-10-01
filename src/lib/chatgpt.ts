import { EXTRACT_KINDS, STAGES } from "./flow"

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
