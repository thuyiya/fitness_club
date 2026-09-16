import { LegalPage } from "../../src/screens/LegalPage";

export default function Help() {
  return (
    <LegalPage
      title="Help and support"
      updated="16 September 2026"
      intro="Answers to what people ask most, and how to reach someone when they do not cover it."
      sections={[
        {
          heading: "My targets say a figure is missing",
          body:
            "Calorie and macro targets need sex, height, date of birth and a logged weight — the Mifflin-St Jeor equation cannot be computed without all four. Settings shows exactly which are still missing.",
        },
        {
          heading: "My gym is waiting for approval",
          body:
            "A gym you create is reviewed by an administrator before members can find it. Until then it appears in your list marked Pending and is invisible in member search. Joining a gym your organisation already set up avoids the wait.",
        },
        {
          heading: "A member cannot see the plan I assigned",
          body:
            "Check the start date has arrived and that the assignment is still active. If you edited the plan and chose Save as a new plan, existing members stayed on the previous version by design; if you chose Update and unassign, they were removed from it deliberately.",
        },
        {
          heading: "The calorie burn looks wrong",
          body:
            "It is estimated as MET x 3.5 x your bodyweight / 200 x minutes, using your most recently logged weight. Log a current weight to improve it, or type the figure from your watch when logging a session to override the estimate entirely.",
        },
        {
          heading: "Search is not finding a food",
          body:
            "Typos are handled, so 'chiken' finds chicken. Plain descriptions work too — 'food for after a hard workout' finds the post-workout options. If something genuinely is not there, a coach can add it as a custom food.",
        },
        {
          heading: "I want my data deleted",
          body:
            "Write to the support address below from the email on the account. Deletion covers logs, goals, photos and messages.",
        },
      ]}
      contact={[
        { label: "Support", value: "support@example.com" },
        { label: "Response", value: "Within two working days" },
      ]}
    />
  );
}
