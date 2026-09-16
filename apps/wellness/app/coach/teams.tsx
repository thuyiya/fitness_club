import { Placeholder } from "../../src/components/Placeholder";
import { useAuth } from "../../src/state/auth";

export default function CoachTeams() {
  const { theme } = useAuth();
  return (
    <Placeholder
      theme={theme}
      title="Teams"
      planned={[
        "Group members into squads",
        "Assign a plan to a whole team at once",
        "Team announcements and group chat",
      ]}
    />
  );
}
