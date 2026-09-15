import { Placeholder } from "../../src/components/Placeholder";
import { useAuth } from "../../src/state/auth";

export default function MemberChat() {
  const { theme } = useAuth();
  return (
    <Placeholder
      theme={theme}
      title="Chat"
      planned={["Threads with your coach", "Announcements from the gym", "Realtime delivery over the /ws endpoint"]}
    />
  );
}
