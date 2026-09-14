import { StyleSheet, Text, View } from "react-native";

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wellness 2.0</Text>
      <Text style={styles.subtitle}>Scaffold ready. Screens come next.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F6F5F1",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#14161C",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "#8A8D9E",
  },
});
