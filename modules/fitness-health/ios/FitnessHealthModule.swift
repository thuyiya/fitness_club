import ExpoModulesCore
import HealthKit

public class FitnessHealthModule: Module {
  private let health = HKHealthStore()
  private let metrics: [(String, HKQuantityTypeIdentifier, HKUnit)] = [
    ("steps", .stepCount, .count()),
    ("activeKcal", .activeEnergyBurned, .kilocalorie()),
    ("exerciseMinutes", .appleExerciseTime, .minute()),
    ("distanceKm", .distanceWalkingRunning, .meterUnit(with: .kilo))
  ]

  public func definition() -> ModuleDefinition {
    Name("FitnessHealth")
    Function("isAvailable") { HKHealthStore.isHealthDataAvailable() }
    AsyncFunction("requestAccess") { (promise: Promise) in
      guard HKHealthStore.isHealthDataAvailable() else {
        promise.reject("HEALTH_UNAVAILABLE", "Apple Health is unavailable on this device.")
        return
      }
      var types = Set<HKObjectType>(self.metrics.compactMap { HKObjectType.quantityType(forIdentifier: $0.1) })
      types.insert(HKObjectType.quantityType(forIdentifier: .bodyMass)!)
      types.insert(HKObjectType.workoutType())
      // Completion indicates that the permission flow finished, not read access.
      self.health.requestAuthorization(toShare: [], read: types) { success, error in
        if let error = error { promise.reject("HEALTH_AUTH", error.localizedDescription) }
        else { promise.resolve(success) }
      }
    }
    AsyncFunction("readWeek") { () async throws -> [String: Any] in
      let now = Date()
      let calendar = Calendar.current
      let today = calendar.startOfDay(for: now)
      let formatter = DateFormatter()
      formatter.calendar = calendar
      formatter.locale = Locale(identifier: "en_US_POSIX")
      formatter.dateFormat = "yyyy-MM-dd"
      var days: [[String: Any]] = []
      for offset in -6...0 {
        let start = calendar.date(byAdding: .day, value: offset, to: today)!
        let end = min(calendar.date(byAdding: .day, value: 1, to: start)!, now)
        var day: [String: Any] = ["date": formatter.string(from: start)]
        for (key, identifier, unit) in self.metrics {
          let value = try await self.sum(identifier, unit: unit, start: start, end: end)
          day[key] = value.map { $0 as Any } ?? NSNull()
        }
        days.append(day)
      }
      let weightType = HKObjectType.quantityType(forIdentifier: .bodyMass)!
      let weights = try await self.samples(weightType, start: calendar.date(byAdding: .day, value: -90, to: today)!, end: now, limit: 100)
      let weightRows: [[String: Any]] = weights.compactMap { sample in
        guard let quantity = sample as? HKQuantitySample else { return nil }
        return ["id": sample.uuid.uuidString, "date": sample.endDate.timeIntervalSince1970 * 1000, "kg": quantity.quantity.doubleValue(for: .gramUnit(with: .kilo))]
      }
      let workouts = try await self.samples(HKObjectType.workoutType(), start: calendar.date(byAdding: .day, value: -6, to: today)!, end: now, limit: 100)
      let sessions: [[String: Any]] = workouts.compactMap { sample in
        guard let workout = sample as? HKWorkout else { return nil }
        return ["id": workout.uuid.uuidString, "date": workout.startDate.timeIntervalSince1970 * 1000, "minutes": workout.duration / 60, "source": workout.sourceRevision.source.name]
      }
      return ["days": days, "weights": weightRows, "workouts": sessions, "updatedAt": now.timeIntervalSince1970 * 1000]
    }
  }

  private func sum(_ identifier: HKQuantityTypeIdentifier, unit: HKUnit, start: Date, end: Date) async throws -> Double? {
    try await withCheckedThrowingContinuation { continuation in
      let type = HKObjectType.quantityType(forIdentifier: identifier)!
      let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
      let query = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, result, error in
        if let error = error as NSError?, error.code != HKError.Code.errorNoData.rawValue {
          continuation.resume(throwing: error)
        } else { continuation.resume(returning: result?.sumQuantity()?.doubleValue(for: unit)) }
      }
      health.execute(query)
    }
  }
  private func samples(_ type: HKSampleType, start: Date, end: Date, limit: Int) async throws -> [HKSample] {
    try await withCheckedThrowingContinuation { continuation in
      let query = HKSampleQuery(sampleType: type, predicate: HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate), limit: limit, sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)]) { _, samples, error in
        if let error = error { continuation.resume(throwing: error) }
        else { continuation.resume(returning: samples ?? []) }
      }
      health.execute(query)
    }
  }
}
