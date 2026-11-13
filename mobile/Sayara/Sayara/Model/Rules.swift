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
    /// Whole days between two dates.
    static func tripDays(_ from: String, _ to: String) -> Int {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(identifier: "UTC")
        f.dateFormat = "yyyy-MM-dd"
        guard let a = f.date(from: from), let b = f.date(from: to) else { return 0 }
        return Int((b.timeIntervalSince(a) / 86_400).rounded())
    }

    /// What a trip costs to book: 35 credits a day, which is the 35 miles a day it includes at 1 credit a mile.
    static func tripCost(_ days: Int) -> Int { days * Config.creditsPerDay }

    /// What cover for a trip costs: 10 credits a day.
    static func insuranceCost(_ days: Int) -> Int { days * Config.insuranceCreditsPerDay }

    /// A price paid with some credits and the rest in dollars, at $1.50 a credit.
    /// shortcut: there is no payment provider, so the dollar part is recorded, not charged.
    static func splitPayment(_ cost: Int, creditsUsed: Int) throws -> Payment {
        guard (0...cost).contains(creditsUsed) else {
            throw RuleError("Choose how many credits to use, from 0 to \(cost).")
        }
        return Payment(credits: creditsUsed, usd: Double(cost - creditsUsed) * Config.usdPerCredit)
    }

    /// How many credits go towards a price: as many as the person has, up to the price, or none.
    static func creditsToUse(_ cost: Int, balance: Int, useCredits: Bool) -> Int {
        useCredits ? min(max(balance, 0), cost) : 0
    }

    /// Back-to-back is not an overlap: one trip may end the day the next begins.
    static func overlaps(_ aFrom: String, _ aTo: String, _ bFrom: String, _ bTo: String) -> Bool {
        aFrom < bTo && bFrom < aTo
    }

    static func insideOwnerWindow(_ car: Car, _ from: String, _ to: String) -> Bool {
        car.from <= from && to <= car.to
    }

    /// A cancelled trip frees the car's dates.
    static func hasOverlap(_ state: AppState, _ carId: String, _ from: String, _ to: String) -> Bool {
        state.bookings.contains { $0.carId == carId && $0.status != .cancelled && overlaps($0.from, $0.to, from, to) }
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

    /// `creditsUsed` is how much of the price comes from credits; the rest is paid in dollars. Left out, it is all credits.
    @discardableResult
    static func book(_ state: inout AppState, userId: String, carId: String, from: String, to: String,
                     creditsUsed: Int? = nil) throws -> Booking {
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
        let cost = tripCost(days)
        let paid = try splitPayment(cost, creditsUsed: creditsUsed ?? cost)
        let credits = state.users[userIndex].credits
        guard credits >= paid.credits else {
            throw RuleError("This trip costs \(cost) credits and you have \(credits). Pay the rest in dollars.")
        }

        state.users[userIndex].credits -= paid.credits
        let booking = Booking(id: "b\(state.bookings.count + 1)", carId: carId, userId: userId,
                              from: from, to: to, days: days, status: .booked, paid: paid)
        state.bookings.append(booking)
        return booking
    }

    /// Cover for one trip, bought by its borrower before pickup. It moves nothing later: it only
    /// records that Sayara, not the borrower, pays for damage the owner confirms.
    static func insureTrip(_ state: inout AppState, userId: String, bookingId: String, creditsUsed: Int? = nil) throws {
        guard let index = state.bookings.firstIndex(where: { $0.id == bookingId && $0.userId == userId }),
              let userIndex = state.users.firstIndex(where: { $0.id == userId }) else {
            throw RuleError("That trip is not yours.")
        }
        let booking = state.bookings[index]
        guard booking.insurance == nil else { throw RuleError("This trip is already covered.") }
        guard booking.status == .booked, !state.inspections.contains(where: { $0.bookingId == bookingId }) else {
            throw RuleError("Cover has to be bought before you pick up the car.")
        }
        let cost = insuranceCost(booking.days)
        let paid = try splitPayment(cost, creditsUsed: creditsUsed ?? cost)
        let credits = state.users[userIndex].credits
        guard credits >= paid.credits else {
            throw RuleError("This cover costs \(cost) credits and you have \(credits). Pay the rest in dollars.")
        }
        state.users[userIndex].credits -= paid.credits
        state.bookings[index].insurance = paid
    }

    /// What cancelling a trip costs, in credits: the other person's airport parking for the trip's
    /// days, plus Sayara's 15% on top.
    static func cancellationFee(_ days: Int) -> (parking: Int, cut: Int, total: Int) {
        let parking = Int((Double(days) * Config.parkingFeePerDayUSDEstimate / Config.usdPerCredit).rounded())
        let cut = Int((Double(parking) * Config.cancellationCut).rounded())
        return (parking, cut, parking + cut)
    }

    /// What the borrower paid for a trip and its cover: all of it comes back if the trip is cancelled.
    static func refundOf(_ booking: Booking) -> Payment {
        let trip = booking.paid ?? Payment(credits: tripCost(booking.days), usd: 0)
        return Payment(credits: trip.credits + (booking.insurance?.credits ?? 0),
                       usd: trip.usd + (booking.insurance?.usd ?? 0))
    }

    /// Either person on a trip can cancel it before pickup. The borrower gets their payment back.
    /// Whoever cancels pays the fee: the parking part goes to the other person, the rest to Sayara.
    static func cancelBooking(_ state: inout AppState, userId: String, bookingId: String, creditsUsed: Int? = nil) throws {
        guard let index = state.bookings.firstIndex(where: { $0.id == bookingId }),
              let ownerId = state.car(state.bookings[index].carId)?.ownerId,
              state.bookings[index].userId == userId || ownerId == userId else {
            throw RuleError("That trip is not yours.")
        }
        let booking = state.bookings[index]
        guard booking.status == .booked, !state.inspections.contains(where: { $0.bookingId == bookingId }) else {
            throw RuleError("A trip can only be cancelled before pickup.")
        }

        let fee = cancellationFee(booking.days)
        let paid = try splitPayment(fee.total, creditsUsed: creditsUsed ?? fee.total)
        let refund = refundOf(booking)
        let otherId = userId == booking.userId ? ownerId : booking.userId
        func change(_ id: String) -> Int {
            (id == booking.userId ? refund.credits : 0) - (id == userId ? paid.credits : 0) + (id == otherId ? fee.parking : 0)
        }
        guard let canceller = state.user(userId), canceller.credits + change(userId) >= 0 else {
            throw RuleError("Cancelling costs \(fee.total) credits and you do not have that many. Pay the rest in dollars.")
        }

        for i in state.users.indices { state.users[i].credits += change(state.users[i].id) }
        state.bookings[index].status = .cancelled
        state.bookings[index].cancelled = Cancellation(by: userId, fee: paid, parkingCredits: fee.parking, refund: refund)
    }

    /// A trip includes 35 miles a day. Each mile past the total costs a credit. (With another rate
    /// the charge is rounded to whole credits: nobody pays a fraction.)
    static func mileageCharge(_ days: Int, kmDriven: Int, creditsPerExtraMile: Double = Double(Config.creditsPerExtraMile)) -> MileageCharge {
        let miles = Int((Double(kmDriven) / Config.kmPerMile).rounded())
        let included = days * Config.milesIncludedPerDay
        let extraMiles = max(0, miles - included)
        return MileageCharge(miles: miles, included: included, extraMiles: extraMiles,
                             credits: Int((Double(extraMiles) * creditsPerExtraMile).rounded()))
    }

    /// The owner is paid what the trip cost to book. With the kilometres driven (read from the two
    /// dashboard photos), any extra miles are paid too, by the borrower, who can go below zero.
    static func returnCar(_ state: inout AppState, bookingId: String, kmDriven: Int? = nil) throws {
        guard let index = state.bookings.firstIndex(where: { $0.id == bookingId }) else {
            throw RuleError("That booking does not exist.")
        }
        let booking = state.bookings[index]
        guard booking.status != .returned else { throw RuleError("This car has already been returned.") }
        guard booking.status != .cancelled else { throw RuleError("This trip was cancelled.") }

        let ownerId = state.car(booking.carId)?.ownerId
        let mileage = kmDriven.map { mileageCharge(booking.days, kmDriven: $0) }
        let extra = mileage?.credits ?? 0
        for i in state.users.indices {
            if state.users[i].id == ownerId { state.users[i].credits += tripCost(booking.days) + extra }
            else if state.users[i].id == booking.userId { state.users[i].credits -= extra }
        }
        state.bookings[index].status = .returned
        state.bookings[index].mileage = mileage
    }

    // MARK: Lending and photo check

    /// Lists a car and returns its id. The pin and spot come next, in their own step (setParking).
    @discardableResult
    static func listCar(_ state: inout AppState, ownerId: String, airport: String, model: String,
                        seats: Int, from: String, to: String, photo: String?) throws -> String {
        let name = model.trimmingCharacters(in: .whitespaces)
        guard !name.isEmpty else { throw RuleError("Name the car, for example 2019 Honda Civic.") }
        guard (1...9).contains(seats) else { throw RuleError("Seats must be a number from 1 to 9.") }
        guard Airport.named(airport) != nil else { throw RuleError("Pick one of the airports in the list.") }
        guard tripDays(from, to) >= 1 else { throw RuleError("The day you land must be after the day you fly out.") }
        let id = "car-\(state.cars.count + 1)-\(UUID().uuidString.prefix(4).lowercased())"
        state.cars.append(Car(id: id, ownerId: ownerId, airport: airport, model: name, seats: seats,
                              from: from, to: to, pin: nil, spot: nil, photo: photo))
        return id
    }

    /// Where the owner parked: the pin on the map and the painted bay number (up to 8 characters).
    static func setParking(_ state: inout AppState, carId: String, ownerId: String, pin: Pin, spot: String) throws {
        guard let index = state.cars.firstIndex(where: { $0.id == carId && $0.ownerId == ownerId }) else {
            throw RuleError("That car is not yours.")
        }
        guard abs(pin.lat) <= 90, abs(pin.lng) <= 180 else { throw RuleError("Drop the pin on the map first.") }
        let trimmed = String(spot.trimmingCharacters(in: .whitespaces).prefix(8))
        state.cars[index].pin = pin
        state.cars[index].spot = trimmed.isEmpty ? nil : trimmed
    }

    static func savePickup(_ state: inout AppState, bookingId: String, photos: [Slot: String]) throws {
        guard state.inspection(bookingId, .pickup) == nil else { throw RuleError("Pickup photos are already saved.") }
        guard state.booking(bookingId)?.status != .cancelled else { throw RuleError("This trip was cancelled.") }
        guard photos.count == Slot.allCases.count else { throw RuleError("Take all six photos first.") }
        state.inspections.append(Inspection(id: "\(bookingId)-pickup", bookingId: bookingId, phase: .pickup,
                                            photos: photos, aiResult: nil, aiProvider: nil, ownerDecision: [:]))
    }

    /// Saves the return photos with the AI's flags, then returns the car, which pays the owner:
    /// the days, plus any miles past the allowance, measured from the two dashboard readings.
    static func saveReturn(_ state: inout AppState, bookingId: String, photos: [Slot: String],
                           results: [Slot: InspectionResult], provider: String) throws {
        guard state.inspection(bookingId, .pickup) != nil else { throw RuleError("Take the pickup photos first.") }
        try returnCar(&state, bookingId: bookingId, kmDriven: Verdict.kmDriven(results[.dashboard]))
        state.inspections.append(Inspection(id: "\(bookingId)-return", bookingId: bookingId, phase: .return,
                                            photos: photos, aiResult: results, aiProvider: provider,
                                            ownerDecision: [:]))
    }

    /// The owner's call on one finding. It is recorded and nothing else: no credits move.
    static func decide(_ state: inout AppState, inspectionId: String, findingKey: String, decision: OwnerDecision) {
        guard let index = state.inspections.firstIndex(where: { $0.id == inspectionId }) else { return }
        state.inspections[index].ownerDecision[findingKey] = decision
    }

    // MARK: Chat

    /// Only the two people on a trip can message each other, and only once the car is booked.
    static func sendMessage(_ state: inout AppState, bookingId: String, senderId: String, text: String, at date: Date = .now) throws {
        guard let booking = state.booking(bookingId), let car = state.car(booking.carId),
              senderId == booking.userId || senderId == car.ownerId else {
            throw RuleError("Only the borrower and the owner can message about this trip.")
        }
        guard booking.status != .cancelled else { throw RuleError("This trip was cancelled, so the chat is closed.") }
        let body = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !body.isEmpty else { throw RuleError("Write a message first.") }
        guard body.count <= 500 else { throw RuleError("Keep it under 500 characters.") }
        state.messages.append(ChatMessage(id: UUID().uuidString, bookingId: bookingId, senderId: senderId, text: body, sentAt: date))
    }

    /// A made-up 4-digit code derived from the booking id. There is no real locker.
    static func lockerCode(_ bookingId: String) -> String {
        var hash = 7
        for scalar in bookingId.unicodeScalars { hash = (hash * 31 + Int(scalar.value)) % 10_000 }
        return String(format: "%04d", hash)
    }
}
