import { Placeholder } from "../../src/components/Placeholder";
import { useAuth } from "../../src/state/auth";

export default function CoachProfile() {
  const { theme } = useAuth();
  return (
    <Placeholder
      theme={theme}
      title="Profile"
      planned={[
        "Name, photo and bio shown to members",
        "Change password",
        "Coaching credentials",
      ]}
    />
  );
}
