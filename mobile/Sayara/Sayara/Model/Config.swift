import Foundation
import CoreLocation

// Every tunable number in the app lives here. Same values as lib/config.ts in the web app.
enum Config {
    /// ESTIMATE, NOT VERIFIED. README section 2: a rental is about $300-600 a week. The pitch uses $400, about $57 a day.
    static let rentalCostPerDayUSDEstimate = 57

    /// Shown next to the impact figure so nobody reads the estimate as a fact.
    static let impactLabel = "rental cost avoided (estimate)"

    /// Credits are miles: one credit pays for one mile. A day of a trip includes 35 miles, so a day
    /// costs 35 credits, and every mile past a trip's total costs one more. Same as lib/config.ts.
    static let milesIncludedPerDay = 35
    static let creditsPerExtraMile = 1
    static let creditsPerDay = milesIncludedPerDay * creditsPerExtraMile

    /// What a credit costs in money. Any price can be paid in credits, in dollars, or part in each.
    static let usdPerCredit = 1.5

    /// Cover for a trip: with it Sayara pays for damage the owner confirms, without it the borrower does.
    static let insuranceCreditsPerDay = 10

    /// A day of airport parking, in dollars. An estimate: real rates differ by airport and by lot.
    static let parkingFeePerDayUSDEstimate = 20.0

    /// Sayara's share when a trip is cancelled, on top of the other person's parking fees.
    static let cancellationCut = 0.15

    /// The dashboard reading is stored in kilometres.
    static let kmPerMile = 1.609344

    /// What a new account starts with: a first week away, before lending a car.
    static let startingCredits = 7 * creditsPerDay

    /// A finding below this confidence is shown as "unsure", never as damage.
    static let minDamageConfidence = 0.6

    /// Long edge, in pixels, of any photo stored or sent for inspection.
    static let maxImageEdgePx: CGFloat = 1120

    /// Average brightness (0-1) below which a photo gets a "too dark" warning.
    static let darkPhotoThreshold = 0.18

    /// The Next.js server that runs the photo check (`/api/inspect`). nil = the built-in mock, no network.
    /// The IBM key lives only on that server, never in this app. Example: URL(string: "http://192.168.1.20:3000")
    static let inspectionServerURL: URL? = nil
}

/// A US or Canadian passenger airport. The full list is in AirportList.swift.
struct Airport: Identifiable, Hashable {
    let code: String      // IATA, e.g. "DTW"
    let name: String      // official name, e.g. "Detroit Metropolitan Wayne County Airport"
    let city: String
    let region: String    // state or province, e.g. "MI", "ON"
    let country: String   // "US" or "CA"
    let latitude: Double
    let longitude: Double
    var id: String { code }

    /// "Detroit (DTW)"
    var label: String { "\(city.isEmpty ? name : city) (\(code))" }
    /// "Detroit, MI"
    var place: String { [city, region].filter { !$0.isEmpty }.joined(separator: ", ") }

    /// Where the map opens before an owner drops a pin. For the two demo airports this is the
    /// parking garage (same as AIRPORT_PARKING in the web app); elsewhere it is the airport itself.
    var coordinate: CLLocationCoordinate2D {
        if let garage = Self.parking[code] { return garage }
        return .init(latitude: latitude, longitude: longitude)
    }

    private static let parking: [String: CLLocationCoordinate2D] = [
        "DTW": .init(latitude: 42.2068, longitude: -83.3555), // McNamara terminal garage
        "YYZ": .init(latitude: 43.6831, longitude: -79.6135), // Terminal 1 garage
    ]

    static var all: [Airport] { list }

    private static let byCode: [String: Airport] = Dictionary(uniqueKeysWithValues: list.map { ($0.code, $0) })
    static func named(_ code: String) -> Airport? { byCode[code] }

    /// Matches a search against code, city, name and state or province.
    func matches(_ query: String) -> Bool {
        let q = query.trimmingCharacters(in: .whitespaces)
        guard !q.isEmpty else { return true }
        if code.caseInsensitiveCompare(q) == .orderedSame { return true }
        return [code, city, name, region].contains { $0.localizedStandardContains(q) }
    }
}
