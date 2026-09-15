import { Placeholder } from "../../src/components/Placeholder";
import { useAuth } from "../../src/state/auth";

export default function CoachSettings() {
  const { theme } = useAuth();
  return <Placeholder theme={theme} title="Settings" planned={PLANNED} />;
}

const PLANNED = ["Gym profile and join requests","Members, teams and permissions","Plan templates and the meal builder","Billing and subscription plans"];
