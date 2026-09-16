import { LegalPage } from "../../src/screens/LegalPage";

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy"
      updated="16 September 2026"
      intro="This app holds information about your body, what you eat and what your coach says to you. This page states plainly what is collected, who can see it and how to get rid of it."
      sections={[
        {
          heading: "What is collected",
          body:
            "Your name and email; the profile figures used to calculate targets (sex, height, date of birth, weight, activity level, goal); everything you log — meals, training, hydration, body measurements and progress photos; goals and their daily results; messages between you and your coach; and survey answers.",
        },
        {
          heading: "Who can see it",
          body:
            "Your coach can see the logs, goals, plans and survey answers of the members they are actively linked to, and nobody else's. Being in the same gym is not enough on its own. Administrators can see account and gym records, not your food diary or messages. Other members can never see your data.",
        },
        {
          heading: "Where it is stored",
          body:
            "On servers operated by the gym or its provider. Passwords are stored only as an argon2id hash and can never be read back. Sessions use short-lived tokens; signing out or changing your password ends every other session.",
        },
        {
          heading: "Health app data",
          body:
            "If you connect Apple Health or Google Fit, steps, active energy, exercise minutes, resting heart rate and sleep are read to fill in your summaries. That connection is optional, is off until you turn it on, and can be revoked at any time in your device settings.",
        },
        {
          heading: "What is never done",
          body:
            "Your data is not sold. It is not used to train anyone's models. There is no advertising, and no third-party analytics that carries your health information off the server.",
        },
        {
          heading: "Deleting your account",
          body:
            "Ask in the app or by email and the account is removed along with its logs, goals, messages and photos. Records a gym must keep for its own accounting, such as payment history, are retained without your health data attached.",
        },
      ]}
      contact={[{ label: "Questions", value: "privacy@example.com" }]}
    />
  );
}
