import { useEffect } from "react";
import { AppState } from "react-native";
import { useHealthStore } from "@/store/healthStore";
export function HealthBootstrap() {
  useEffect(() => {
    void useHealthStore.getState().refresh();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void useHealthStore.getState().refresh();
    });
    const timer = setInterval(() => {
      if (AppState.currentState === "active")
        void useHealthStore.getState().refresh();
    }, 60000);
    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, []);
  return null;
}
