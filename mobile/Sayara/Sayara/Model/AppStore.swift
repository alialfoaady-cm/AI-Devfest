import Foundation
import Observation

/// The one place app state lives. Saved as JSON in the app's Documents folder; no server.
@Observable
final class AppStore {
    private(set) var state: AppState
    var currentUserId: String {
        didSet { UserDefaults.standard.set(currentUserId, forKey: "currentUserId") }
    }

    private static var fileURL: URL {
        URL.documentsDirectory.appending(path: "sayara-state.json")
    }

    init() {
        if let data = try? Data(contentsOf: Self.fileURL),
           let saved = try? JSONDecoder().decode(AppState.self, from: data) {
            state = saved
        } else {
            state = SampleData.state
        }
        currentUserId = UserDefaults.standard.string(forKey: "currentUserId") ?? SampleData.defaultUserId
    }

    var currentUser: User? { state.user(currentUserId) }

    /// What Find a car is showing. Lives here so Home can open Find on a car's airport and dates.
    var searchAirport = SampleData.defaultAirport
    var searchFrom = SampleData.defaultFrom
    var searchTo = SampleData.defaultTo
    /// The car Home opened Find a car for: the carousel scrolls to it.
    var searchFocusCar: String?

    /// Runs a change on a copy; the state only updates and saves if every rule passes.
    func update(_ change: (inout AppState) throws -> Void) throws {
        var copy = state
        try change(&copy)
        state = copy
        save()
    }

    func reset() {
        state = SampleData.state
        currentUserId = SampleData.defaultUserId
        PhotoStore.deleteAll()
        save()
    }

    private func save() {
        do {
            try JSONEncoder().encode(state).write(to: Self.fileURL, options: .atomic)
        } catch {
            print("Could not save state:", error)
        }
    }
}
