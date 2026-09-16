import { LegalPage } from "../../src/screens/LegalPage";

export default function Terms() {
  return (
    <LegalPage
      title="Terms and conditions"
      updated="16 September 2026"
      intro="The rules for using this app, written so they can actually be read."
      sections={[
        {
          heading: "This is not medical advice",
          body:
            "Calorie targets, macro splits, hydration figures and calorie-burn numbers are ESTIMATES from published formulas — Mifflin-St Jeor for energy, the Compendium of Physical Activities for exertion. They are not diagnoses or prescriptions. Anyone with a medical condition, an injury, or who is pregnant should be cleared by a clinician before following a plan, and should stop and seek advice if something hurts.",
        },
        {
          heading: "Allergens and dietary tags",
          body:
            "Allergen information records what the food's source declared. It is never inferred. Cross-contamination during manufacturing or preparation cannot be known from this data, so anyone with a serious allergy must check the packaging or ask the kitchen. Halal and kosher labels depend on sourcing, slaughter and certification that this data does not capture, and are not a guarantee.",
        },
        {
          heading: "Your account",
          body:
            "Keep your password to yourself; anything done from your account is treated as done by you. Accounts are for one person. Accounts may be suspended for abuse, for impersonating a coach, or for uploading content that is not yours to share.",
        },
        {
          heading: "Coaches and members",
          body:
            "A coach writes plans and gives guidance; they are responsible for the suitability of what they prescribe. The app provides the tools, not the coaching. A member may leave a coach at any time, which ends that coach's access to their data going forward.",
        },
        {
          heading: "Your content",
          body:
            "Photos, notes and logs remain yours. You grant only the permission needed to store them and show them to you and your coach.",
        },
        {
          heading: "Availability",
          body:
            "The service is provided as-is. It may be unavailable during maintenance or faults. Keep your own record of anything you cannot afford to lose.",
        },
      ]}
    />
  );
}
