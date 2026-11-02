import { CONTACT_ROLE_LABEL, type ContactRole, type PhoneOwner } from "./flow"

/** A tel: link that dials on phones and opens the call app on computers. */
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`

/** Whose number it is, in a few words: "Reception", "Bogyó Tamás (elnök) · Owner". */
export function phoneWho(r: { phoneOwner: PhoneOwner; contactName: string; contactRole: ContactRole }) {
  if (r.phoneOwner === "reception") return "Reception"
  if (r.phoneOwner === "person") return `${r.contactName || "A person"} · ${CONTACT_ROLE_LABEL[r.contactRole]}`
  return r.contactName ? `Not sure whose number · contact: ${r.contactName}` : "Not sure whose number"
}
