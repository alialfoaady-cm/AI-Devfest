import Foundation

// Data model from README section 8. Dates are "YYYY-MM-DD" strings, which compare correctly as text.

enum Slot: String, Codable, CaseIterable, Identifiable, CodingKeyRepresentable {
    case front, back, left, right, interior, dashboard

    var id: String { rawValue }

    var label: String {
        switch self {
        case .front: "Front"
        case .back: "Back"
        case .left: "Left side"
        case .right: "Right side"
        case .interior: "Interior"
        case .dashboard: "Dashboard"
        }
    }

    var symbol: String {
        switch self {
        case .front: "car.front.waves.up"
        case .back: "car.rear"
        case .left, .right: "car.side"
        case .interior: "carseat.left"
        case .dashboard: "gauge.with.dots.needle.50percent"
        }
    }
}

struct User: Codable, Identifiable, Equatable {
    let id: String
    var name: String
    var credits: Int
}

/// Where the owner parked. A pin on the map plus a short note such as "Lot P3, row C".
struct ParkingPin: Codable, Equatable {
    var latitude: Double
    var longitude: Double
    var note: String
}

/// `from`/`to` is the owner's away window. `to` is the day the owner lands: a hard cutoff.
struct Car: Codable, Identifiable, Equatable {
    let id: String
    var ownerId: String
    var airport: String
    var model: String
    var seats: Int
    var from: String
    var to: String
    var pin: ParkingPin?
}

enum BookingStatus: String, Codable {
    case booked, returned
}

struct Booking: Codable, Identifiable, Equatable {
    let id: String
    var carId: String
    var userId: String
    var from: String
    var to: String
    var days: Int
    var status: BookingStatus
}

/// One finding from the model. It is a flag for a person to review, never a verdict.
struct Damage: Codable, Equatable {
    var location: String
    var type: String
    var severity: String
    var confidence: Double
}

/// README section 7 shape, plus `odometer_before_km` (km driven needs both readings).
struct InspectionResult: Codable, Equatable {
    var newDamage: [Damage]
    var odometerKm: Int?
    var odometerBeforeKm: Int?
    var fuelLevel: String?
    var notes: String

    enum CodingKeys: String, CodingKey {
        case newDamage = "new_damage"
        case odometerKm = "odometer_km"
        case odometerBeforeKm = "odometer_before_km"
        case fuelLevel = "fuel_level"
        case notes
    }
}

enum InspectionPhase: String, Codable {
    case pickup, `return`
}

enum OwnerDecision: String, Codable {
    case confirmed, disputed
}

struct Inspection: Codable, Identifiable, Equatable {
    let id: String
    var bookingId: String
    var phase: InspectionPhase
    /// File names in the app's photo folder, one per slot.
    var photos: [Slot: String]
    /// Return phase only. A missing slot means the answer could not be trusted: show "unsure".
    var aiResult: [Slot: InspectionResult]?
    /// Which service produced aiResult: "mock" or "server".
    var aiProvider: String?
    /// Keyed "slot:index" of a finding in aiResult[slot].newDamage.
    var ownerDecision: [String: OwnerDecision]
}

struct AppState: Codable, Equatable {
    var users: [User]
    var cars: [Car]
    var bookings: [Booking]
    var inspections: [Inspection]

    func user(_ id: String) -> User? { users.first { $0.id == id } }
    func car(_ id: String) -> Car? { cars.first { $0.id == id } }
    func booking(_ id: String) -> Booking? { bookings.first { $0.id == id } }
    func inspection(_ bookingId: String, _ phase: InspectionPhase) -> Inspection? {
        inspections.first { $0.bookingId == bookingId && $0.phase == phase }
    }
}

struct RuleError: LocalizedError {
    let message: String
    init(_ message: String) { self.message = message }
    var errorDescription: String? { message }
}
