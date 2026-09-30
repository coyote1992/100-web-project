/**
 * The three message templates and the timing rules. All editable on the Templates page and via the API.
 * Placeholders are written [LIKE_THIS] and filled per site.
 */

/** The master website rebuild prompt. Handed to Claude Code as is. */
export const DEFAULT_BUILD_PROMPT = "You are rebuilding an existing business website from the ground up.\n\n## INPUTS\n\n**Existing website / source of truth:**\n[OLD_SITE_URL]\n\n**Primary design reference:**\n[REFERENCE_SITE_1]\n\n**Optional secondary reference:**\n[REFERENCE_SITE_2]\n\nYour job is to inspect these sites thoroughly and then build a substantially better version of the existing website.\n\nDo not just give me recommendations or a design plan. **Actually build the website.**\n\n---\n\n## 1. UNDERSTAND THE BUSINESS FIRST\n\nThoroughly inspect the existing website before designing anything.\n\nUnderstand:\n\n- what the business actually does\n- its services/products\n- its target customers\n- locations\n- pricing if shown\n- team / instructors / staff\n- booking or enquiry flows\n- opening hours\n- contact information\n- social proof\n- existing positioning\n- current site structure\n- important information customers need before converting\n\nTreat the existing website as the primary factual source.\n\nYou may improve the wording, hierarchy and presentation significantly, but **do not invent factual claims, prices, services, credentials, testimonials, locations, statistics, staff members or other business information that is not supported by the source material.**\n\nIf something is unclear, structure the site elegantly around the information that is available rather than hallucinating.\n\n---\n\n## 2. STUDY THE REFERENCE SITES INTENSIVELY\n\nAnalyze the reference site(s) in detail.\n\nI chose them because I think they represent an unusually high design standard.\n\nStudy their:\n\n- visual hierarchy\n- typography\n- spacing\n- color system\n- section composition\n- page rhythm\n- image treatment\n- navigation\n- CTA placement\n- cards\n- buttons\n- backgrounds\n- decorative elements\n- animations\n- transitions\n- interaction patterns\n- use of whitespace\n- mobile behavior\n- storytelling\n- premium feel\n- overall art direction\n\nExtract the **design principles and visual language** that make them excellent.\n\nUse those principles aggressively in the new website.\n\nHowever, do not blindly clone copyrighted text, distinctive graphics, proprietary assets, or reproduce the reference site one-to-one. The final website should feel clearly inspired by the same level of taste and art direction while remaining appropriate and distinctive for this business.\n\nIf I provide two reference sites, intelligently combine the strongest aspects of each rather than producing an incoherent mixture.\n\n---\n\n## 3. THE GOAL\n\nThe new website should feel like the business hired an excellent modern digital studio.\n\nThe difference between the old and new site should be immediately obvious.\n\nOptimize simultaneously for:\n\n1. **Visual quality**\n2. **Brand perception**\n3. **Clarity**\n4. **Trust**\n5. **Conversion**\n6. **Mobile experience**\n7. **Performance**\n8. **Ease of navigation**\n\nDo not create a generic AI-generated website.\n\nAvoid the usual generic patterns:\n\n- excessive gradients\n- generic SaaS layouts\n- random glassmorphism\n- meaningless floating cards\n- overused AI-looking iconography\n- unnecessary pill-shaped everything\n- generic copy\n- excessive animation without purpose\n\nThe website should feel deliberately art-directed for this specific business.\n\n---\n\n## 4. USE THE EXISTING BUSINESS AS RAW MATERIAL\n\nYou have my permission to download and reuse appropriate assets from the existing website, including its:\n\n- photos\n- logos\n- icons\n- illustrations\n- relevant downloadable assets\n\nUse the best existing imagery intelligently.\n\nIf some assets are low quality, compensate through:\n\n- stronger cropping\n- composition\n- overlays\n- typography\n- layout\n- subtle image treatment\n- supporting graphic elements\n\nDo not use unrelated stock imagery unless genuinely necessary.\n\nFor now, do not spend significant effort redesigning the logo unless the existing logo creates a serious visual problem.\n\nYou should visit other site(s), google profile, or sources that directly relate to the same business. There might be photos on its google page that are not on the website directly, or there might be valuable customer feedback.\n\n---\n\n## 5. COPYWRITING\n\nUse the existing website as the factual and strategic backbone, but rewrite the copy wherever improvement would make the website:\n\n- clearer\n- more persuasive\n- more concise\n- more premium\n- easier to scan\n- more customer-oriented\n\nResearch how excellent businesses in this specific vertical communicate online and use that understanding to improve information hierarchy and messaging.\n\nDo not use vague marketing filler such as:\n\n- \"unlock your potential\"\n- \"where passion meets excellence\"\n- \"elevate your journey\"\n- \"experience the difference\"\n\nunless there is a very strong contextual reason.\n\nPrefer specific, human, confident language.\n\nMake headings short and strong.\n\nThe visitor should quickly understand:\n\n**What is this?**\n**Who is it for?**\n**Why is it good?**\n**What should I do next?**\n\n---\n\n## 6. CONVERSION AND USER JOURNEY\n\nDo not treat this only as a visual redesign.\n\nImprove the actual customer journey.\n\nIdentify the primary conversion action from the business model, for example:\n\n- book\n- reserve\n- request an appointment\n- contact\n- request pricing\n- start a trial\n- call\n- visit\n\nMake the primary CTA obvious without making the website feel aggressively sales-oriented.\n\nFix confusing flows from the existing website.\n\nThe visitor should never wonder:\n\n- where to click\n- how to book\n- what a service includes\n- how to contact the business\n- what happens next\n\nUse secondary CTAs only where they genuinely help.\n\n---\n\n## 7. STRUCTURE\n\nYou have freedom to rethink the structure.\n\nDo not mechanically reproduce the old site's section order.\n\nDetermine what information deserves prominence based on the customer journey.\n\nFor the homepage, think in terms of a strong narrative:\n\n**impression → understanding → differentiation → proof → offering → experience → conversion**\n\nBut adapt this to the actual business rather than following a rigid template.\n\nIf some existing pages should be consolidated, reorganized or represented differently, do it.\n\n---\n\n## 8. PREMIUM DETAILS\n\nWhere appropriate, use sophisticated details that make the site feel unusually polished:\n\n- subtle scroll interactions\n- tasteful entrance animations\n- custom hover states\n- editorial typography\n- creative section transitions\n- image reveals\n- subtle parallax\n- custom line work\n- sketches\n- diagrams\n- texture\n- tasteful motion\n- interesting responsive behavior\n\nThese should support the brand.\n\nDo not add effects merely to demonstrate technical ability.\n\nOne excellent interaction is better than ten unnecessary ones.\n\nIf the business and design direction warrant it, you can create one distinctive \"signature\" visual element that makes the homepage memorable.\n\n---\n\n## 9. MOBILE FIRST\n\nThe mobile version is not an afterthought.\n\nPay particular attention to:\n\n- navigation\n- typography sizes\n- line lengths\n- spacing\n- image crops\n- button sizes\n- section heights\n- sticky/floating CTAs where appropriate\n- forms\n- booking flow\n\nThe mobile site should feel intentionally designed rather than a compressed desktop version.\n\n---\n\n## 10. TECHNICAL QUALITY\n\nBuild this as a production-quality modern website.\n\nPrefer:\n\n- Next.js\n- TypeScript\n- clean component architecture\n- responsive implementation\n- reusable components\n- semantic HTML\n- accessible interactions\n- optimized images\n- good loading performance\n- sensible animations\n- robust mobile behavior\n\nAvoid unnecessary dependencies.\n\nThe project must build successfully.\n\nBefore considering the work finished:\n\n- run the build\n- resolve errors\n- check console errors\n- test major links\n- test buttons/CTAs\n- inspect desktop\n- inspect mobile\n- check overflow problems\n- check spacing inconsistencies\n- check image loading\n- check responsiveness\n- check obvious accessibility problems\n\n---\n\n## 11. DESIGN SKILLS / TOOLS\n\nUse the **Impeccable** design skillset extensively.\n\nAlso inspect/use **Kowalski** where useful.\n\nUse any relevant browser, coding, design, image-processing or frontend tools available to you.\n\nDo not merely invoke these mechanically. Use them to raise the final design quality.\n\n---\n\n## 12. AUTONOMY\n\nDo not stop after producing a first draft if obvious improvements remain.\n\nWork iteratively.\n\nInspect what you have built visually and improve weak areas.\n\nYou are expected to make strong design decisions yourself.\n\nDo not ask me routine questions such as:\n\n- which font should I use?\n- which sections should exist?\n- which shade should the background be?\n- should this image go here?\n\nInfer these decisions from:\n\n1. the business,\n2. the reference site(s),\n3. modern design best practices,\n4. the available assets.\n\nOnly ask me something if you are genuinely blocked by missing information that prevents the build from proceeding.\n\nOtherwise, make the decision and continue.\n\n---\n\n## 13. QUALITY BAR\n\nThe final result should not simply be \"better than the old website.\"\n\nIt should be good enough that, if I sent the link to the business owner without explanation, the visual improvement would be immediately apparent.\n\nAim for:\n\n> **\"I can't believe someone made this for our business without us asking.\"**\n\nrather than:\n\n> **\"This is a nice redesign.\"**\n\nThe site should feel credible enough that the owner could realistically want to replace their current website with it.\n\nStudy the references carefully, understand the business deeply, then execute.\n\nStart now."

export const DEFAULT_SEND_SITE_TEMPLATE = `Subject: I rebuilt the [BUSINESS_NAME] website. Here's how it could look

Hi [CONTACT_NAME],

Thanks for getting back to me. As promised, I rebuilt your homepage with your own photos and your own words, and put it online so you can click through it:

[DEMO_URL]

It's a working preview, not a mockup: look at it on your phone too. Nothing changes on your current site ([OLD_SITE_URL]) unless you decide you want it.

If you like where it's going, I'd be happy to walk you through it in a short call. Just tell me what time suits you.

Best regards,
[SENDER_NAME]`

export const DEFAULT_CALL_SCHEDULING_TEMPLATE = `Subject: Re: I rebuilt the [BUSINESS_NAME] website. When can we talk?

Hi [CONTACT_NAME],

Great to hear you like it! Let's take 15 minutes to go through it together and talk about what you'd change or add.

Would any of these work for a quick call?

- [SLOT_1]
- [SLOT_2]
- [SLOT_3]

If none fit, tell me what does and I'll adapt.

Best regards,
[SENDER_NAME]`

export type Templates = {
  buildPrompt: string
  sendSiteTemplate: string
  callSchedulingTemplate: string
  siteFollowUpDays: number
  callAfterSiteDays: number
}

export const DEFAULT_TEMPLATES: Templates = {
  buildPrompt: DEFAULT_BUILD_PROMPT,
  sendSiteTemplate: DEFAULT_SEND_SITE_TEMPLATE,
  callSchedulingTemplate: DEFAULT_CALL_SCHEDULING_TEMPLATE,
  siteFollowUpDays: 4,
  callAfterSiteDays: 3,
}

export const TEMPLATE_KEYS = ["buildPrompt", "sendSiteTemplate", "callSchedulingTemplate"] as const

export const PLACEHOLDERS: Record<(typeof TEMPLATE_KEYS)[number], string[]> = {
  buildPrompt: ["OLD_SITE_URL", "REFERENCE_SITE_1", "REFERENCE_SITE_2", "BUSINESS_NAME", "VERTICAL", "CITY"],
  sendSiteTemplate: ["BUSINESS_NAME", "CONTACT_NAME", "DEMO_URL", "OLD_SITE_URL", "SENDER_NAME"],
  callSchedulingTemplate: ["BUSINESS_NAME", "CONTACT_NAME", "DEMO_URL", "SENDER_NAME", "SLOT_1", "SLOT_2", "SLOT_3"],
}

export type SiteVars = {
  name: string
  city: string
  oldSiteUrl: string
  demoUrl: string
  contactName: string
  vertical?: { name: string; reference1: string; reference2: string }
}

/** Fill a template for one site. `missing` lists inputs the template needs that aren't there yet. */
export function fillTemplate(template: string, site: SiteVars) {
  const missing: string[] = []
  const vars: Record<string, string> = {
    OLD_SITE_URL: site.oldSiteUrl,
    REFERENCE_SITE_1: site.vertical?.reference1 ?? "",
    REFERENCE_SITE_2: site.vertical?.reference2 ?? "",
    BUSINESS_NAME: site.name,
    VERTICAL: site.vertical?.name ?? "",
    CITY: site.city,
    DEMO_URL: site.demoUrl,
    CONTACT_NAME: site.contactName || "there",
  }
  const labels: Record<string, string> = {
    OLD_SITE_URL: "the current website URL",
    REFERENCE_SITE_1: "reference site 1 (set it on the vertical)",
    REFERENCE_SITE_2: "reference site 2 (set it on the vertical)",
    DEMO_URL: "the demo URL",
  }
  const text = template.replace(/\[([A-Z0-9_]+)\]/g, (whole, key: string) => {
    if (!(key in vars)) return whole // SENDER_NAME, SLOT_1… are left for ChatGPT to fill in
    const v = vars[key].trim()
    if (!v) {
      const label = labels[key]
      if (label && !missing.includes(label)) missing.push(label)
      return `(${label ?? key.toLowerCase()} missing)`
    }
    return v
  })
  return { text, missing }
}
