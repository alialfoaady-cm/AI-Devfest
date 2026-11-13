import Foundation

// Booking rules from README section 6, the same as lib/rules.ts in the web app.
// Each rule throws a RuleError with a message a user can read.

enum Day {
    private static let formatter: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(identifier: "UTC")
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    static func string(_ date: Date) -> String {
        // Use the user's calendar day, then store it as a plain UTC day string.
        let parts = Calendar.current.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", parts.year ?? 2000, parts.month ?? 1, parts.day ?? 1)
    }

    static func date(_ day: String) -> Date {
        guard let utc = formatter.date(from: day) else { return .now }
        let parts = Calendar(identifier: .gregorian).dateComponents(in: TimeZone(identifier: "UTC")!, from: utc)
        return Calendar.current.date(from: DateComponents(year: parts.year, month: parts.month, day: parts.day)) ?? .now
    }

    /// "Dec 20"
    static func short(_ day: String) -> String {
        date(day).formatted(.dateTime.month(.abbreviated).day())
    }
}

enum Rules {
    /// Whole days between two dates. 1 credit = 1 day.
    static func tripDays(_ from: String, _ to: String) -> Int {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(identifier: "UTC")
        f.dateFormat = "yyyy-MM-dd"
        guard let a = f.date(from: from), let b = f.date(from: to) else { return 0 }
        return Int((b.timeIntervalSince(a) / 86_400).rounded())
    }

    /// Back-to-back is not an overlap: one trip may end the day the next begins.
    static func overlaps(_ aFrom: String, _ aTo: String, _ bFrom: String, _ bTo: String) -> Bool {
        aFrom < bTo && bFrom < aTo
    }

    static func insideOwnerWindow(_ car: Car, _ from: String, _ to: String) -> Bool {
        car.from <= from && to <= car.to
    }

    static func hasOverlap(_ state: AppState, _ carId: String, _ from: String, _ to: String) -> Bool {
        state.bookings.contains { $0.carId == carId && overlaps($0.from, $0.to, from, to) }
    }

    static func availableCars(_ state: AppState, airport: String, from: String, to: String, userId: String) -> [Car] {
        guard tripDays(from, to) >= 1 else { return [] }
        return state.cars.filter { car in
            car.airport == airport
                && car.ownerId != userId
                && insideOwnerWindow(car, from, to)
                && !hasOverlap(state, car.id, from, to)
        }
    }

    @discardableResult
    static func book(_ state: inout AppState, userId: String, carId: String, from: String, to: String) throws -> Booking {
        let days = tripDays(from, to)
        guard days >= 1 else { throw RuleError("A trip must be at least 1 day.") }
        guard let userIndex = state.users.firstIndex(where: { $0.id == userId }),
              let car = state.car(carId) else { throw RuleError("That user or car does not exist.") }
        guard car.ownerId != userId else { throw RuleError("You cannot book your own car.") }
        guard insideOwnerWindow(car, from, to) else {
            throw RuleError("This car is free from \(Day.short(car.from)) until its owner lands on \(Day.short(car.to)).")
        }
        guard !hasOverlap(state, carId, from, to) else {
            throw RuleError("Those dates overlap another booking on this car.")
        }
        let credits = state.users[userIndex].credits
        guard credits >= days else {
            throw RuleError("This trip costs \(days) credits and you have \(credits).")
        }

        state.users[userIndex].credits -= days
        let booking = Booking(id: "b\(state.bookings.count + 1)", carId: carId, userId: userId,
                              from: from, to: to, days: days, status: .booked)
        state.bookings.append(booking)
        return booking
    }

    /// Marks the booking returned and pays the owner. The owner earns credits on return, not on booking.
    static func returnCar(_ state: inout AppState, bookingId: String) throws {
        guard let index = state.bookings.firstIndex(where: { $0.id == bookingId }) else {
            throw RuleError("That booking does not exist.")
        }
        let booking = state.bookings[index]
        guard booking.status != .returned else { throw RuleError("This car has already been returned.") }

        if let ownerId = state.car(booking.carId)?.ownerId,
           let ownerIndex = state.users.firstIndex(where: { $0.id == ownerId }) {
            state.users[ownerIndex].credits += booking.days
        }
        state.bookings[index].status = .returned
    }

    // MARK: Lending and photo check

    static func listCar(_ state: inout AppState, ownerId: String, airport: String, model: String,
                        seats: Int, from: String, to: String, pin: ParkingPin?) throws {
        let name = model.trimmingCharacters(in: .whitespaces)
        guard !name.isEmpty else { throw RuleError("Give the car a short description, like \"Blue hatchback\".") }
        guard tripDays(from, to) >= 1 else { throw RuleError("You must be away for at least 1 day.") }
        guard seats >= 1 else { throw RuleError("A car needs at least 1 seat.") }
        state.cars.append(Car(id: "car-\(state.cars.count + 1)-\(UUID().uuidString.prefix(4).lowercased())",
                              ownerId: ownerId, airport: airport, model: name, seats: seats,
                              from: from, to: to, pin: pin))
    }

    static func savePickup(_ state: inout AppState, bookingId: String, photos: [Slot: String]) throws {
        guard state.inspection(bookingId, .pickup) == nil else { throw RuleError("Pickup photos are already saved.") }
        guard photos.count == Slot.allCases.count else { throw RuleError("Take all six photos first.") }
        state.inspections.append(Inspection(id: "\(bookingId)-pickup", bookingId: bookingId, phase: .pickup,
                                            photos: photos, aiResult: nil, aiProvider: nil, ownerDecision: [:]))
    }

    /// Saves the return photos with the AI's flags, then returns the car, which pays the owner.
    static func saveReturn(_ state: inout AppState, bookingId: String, photos: [Slot: String],
                           results: [Slot: InspectionResult], provider: String) throws {
        guard state.inspection(bookingId, .pickup) != nil else { throw RuleError("Take the pickup photos first.") }
        try returnCar(&state, bookingId: bookingId)
        state.inspections.append(Inspection(id: "\(bookingId)-return", bookingId: bookingId, phase: .return,
                                            photos: photos, aiResult: results, aiProvider: provider,
                                            ownerDecision: [:]))
    }

    /// The owner's call on one finding. It is recorded and nothing else: no credits move.
    static func decide(_ state: inout AppState, inspectionId: String, findingKey: String, decision: OwnerDecision) {
        guard let index = state.inspections.firstIndex(where: { $0.id == inspectionId }) else { return }
        state.inspections[index].ownerDecision[findingKey] = decision
    }

    /// A made-up 4-digit code derived from the booking id. There is no real locker.
    static func lockerCode(_ bookingId: String) -> String {
        var hash = 7
        for scalar in bookingId.unicodeScalars { hash = (hash * 31 + Int(scalar.value)) % 10_000 }
        return String(format: "%04d", hash)
    }
}
