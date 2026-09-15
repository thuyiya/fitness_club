import { Placeholder } from "../../src/components/Placeholder";
import { useAuth } from "../../src/state/auth";

export default function CoachChat() {
  const { theme } = useAuth();
  return <Placeholder theme={theme} title="Chat" planned={PLANNED} />;
}

const PLANNED = ["Member threads and team announcements","Unread counts per member","Realtime delivery over the /ws endpoint"];
