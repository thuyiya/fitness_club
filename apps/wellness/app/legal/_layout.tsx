import { Stack } from "expo-router";

/** Policy pages are pushed over whichever tab set the person came from. */
export default function LegalLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
