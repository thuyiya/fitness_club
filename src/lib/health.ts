import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
export interface HealthDay {
  date: string;
  steps: number | null;
  activeKcal: number | null;
  exerciseMinutes: number | null;
  distanceKm: number | null;
}
export interface HealthWeek {
  days: HealthDay[];
  weights: { id: string; date: number; kg: number }[];
  workouts: { id: string; date: number; minutes: number; source: string }[];
  updatedAt: number;
}
interface HealthNative {
  isAvailable(): boolean;
  requestAccess(): Promise<boolean>;
  readWeek(): Promise<HealthWeek>;
}
export const healthNative =
  Platform.OS === "ios"
    ? requireOptionalNativeModule<HealthNative>("FitnessHealth")
    : null;
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
