import Foundation

/// A car to suggest, with dates it is really free on. Never invents a car or a date: every suggestion
/// comes from the listings and passes the same availability rule as Find a car.
struct Suggestion: Identifiable {
    let car: Car
    let from: String
    let to: String
    var id: String { car.id }
}

/// What the Home page suggests, and how searches and tracked cars are kept. Pure functions, like Rules.
enum Recommend {
    /// Recent searches kept per user.
    static let searchesKept = 5
    /// Cars shown per row on Home.
    static let perRow = 8

    static var today: String { Day.string(.now) }

    // MARK: Tracking and search history

    /// The heart on a car: tracks it, or stops tracking it.
    static func toggleTrack(_ state: inout AppState, userId: String, carId: String) {
        var list = state.tracked[userId] ?? []
        if let i = list.firstIndex(of: carId) { list.remove(at: i) } else { list.insert(carId, at: 0) }
        state.tracked[userId] = list
    }

    /// Remembers a search on Find a car, newest first, one entry per airport.
    static func recordSearch(_ state: inout AppState, userId: String, airport: String, from: String, to: String) {
        guard Rules.tripDays(from, to) >= 1 else { return }
        var list = state.searches[userId] ?? []
        list.removeAll { $0.airport == airport }
        list.insert(SavedSearch(airport: airport, from: from, to: to), at: 0)
        state.searches[userId] = Array(list.prefix(searchesKept))
    }

    // MARK: Suggestions

    /// Dates to offer for a car: the person's own dates when the car is free for them, otherwise
    /// the first week (or less) of what is left of the owner's window, starting tomorrow at the earliest.
    static func trip(for car: Car, preferred: SavedSearch?, state: AppState) -> (from: String, to: String)? {
        if let p = preferred, p.from >= today, isFree(car, p.from, p.to, state) { return (p.from, p.to) }
        let tomorrow = Day.string(Calendar.current.date(byAdding: .day, value: 1, to: .now) ?? .now)
        let from = max(car.from, tomorrow)
        guard Rules.tripDays(from, car.to) >= 1 else { return nil }
        let weekLater = Day.string(Calendar.current.date(byAdding: .day, value: 7, to: Day.date(from)) ?? .now)
        let to = min(car.to, weekLater)
        return isFree(car, from, to, state) ? (from, to) : nil
    }

    private static func isFree(_ car: Car, _ from: String, _ to: String, _ state: AppState) -> Bool {
        Rules.insideOwnerWindow(car, from, to) && !Rules.hasOverlap(state, car.id, from, to)
    }

    private static func suggestions(at airport: String, preferred: SavedSearch?, state: AppState, userId: String) -> [Suggestion] {
        state.cars
            .filter { $0.airport == airport && $0.ownerId != userId }
            .compactMap { car in trip(for: car, preferred: preferred, state: state).map { Suggestion(car: car, from: $0.from, to: $0.to) } }
            .sorted { ($0.from, $0.car.model) < ($1.from, $1.car.model) }
            .prefix(perRow)
            .map { $0 }
    }

    /// One row per airport the person searched, newest first, with cars free there.
    static func fromSearches(_ state: AppState, userId: String) -> [(search: SavedSearch, cars: [Suggestion])] {
        (state.searches[userId] ?? []).compactMap { search in
            let cars = suggestions(at: search.airport, preferred: search, state: state, userId: userId)
            return cars.isEmpty ? nil : (search, cars)
        }
    }

    /// The busiest airports: most cars still free to book, then most trips booked there.
    /// Airports already shown from the person's searches are left out.
    static func popular(_ state: AppState, userId: String, count: Int = 3) -> [(airport: String, cars: [Suggestion])] {
        let searched = Set((state.searches[userId] ?? []).map(\.airport))
        let airports = Set(state.cars.map(\.airport)).subtracting(searched)
        return airports
            .map { airport in (airport, suggestions(at: airport, preferred: nil, state: state, userId: userId)) }
            .filter { !$0.1.isEmpty }
            .sorted { a, b in
                let ta = state.bookings.filter { b in state.car(b.carId)?.airport == a.0 }.count
                let tb = state.bookings.filter { x in state.car(x.carId)?.airport == b.0 }.count
                return (a.1.count, ta, b.0) > (b.1.count, tb, a.0)
            }
            .prefix(count)
            .map { (airport: $0.0, cars: $0.1) }
    }

    /// A tracked car's state, in a few words: free for which dates, or booked.
    static func status(of car: Car, state: AppState, userId: String) -> (text: String, free: Bool) {
        if car.to < today { return ("Listing ended \(Day.short(car.to))", false) }
        if let t = trip(for: car, preferred: nil, state: state) {
            return ("Free from \(Day.short(t.from)) · owner back \(Day.short(car.to))", true)
        }
        if let mine = state.bookings.first(where: { $0.carId == car.id && $0.userId == userId && $0.status == .booked }) {
            return ("You booked it \(Day.short(mine.from)) – \(Day.short(mine.to))", false)
        }
        return ("Booked for the rest of its window", false)
    }
}
