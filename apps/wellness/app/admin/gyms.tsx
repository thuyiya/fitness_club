import { Placeholder } from "../../src/components/Placeholder";
import { useAuth } from "../../src/state/auth";

export default function AdminGyms() {
  const { theme } = useAuth();
  return (
    <Placeholder theme={theme} title="Gyms" planned={["Gym directory and approval queue", "Coach assignment and seat limits", "Per-gym usage and billing"]} />
  );
}
