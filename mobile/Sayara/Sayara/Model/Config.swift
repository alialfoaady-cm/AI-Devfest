import Foundation
import CoreLocation

// Every tunable number in the app lives here. Same values as lib/config.ts in the web app.
enum Config {
    /// ESTIMATE, NOT VERIFIED. README section 2: a rental is about $300-600 a week. The pitch uses $400, about $57 a day.
    static let rentalCostPerDayUSDEstimate = 57

    /// Shown next to the impact figure so nobody reads the estimate as a fact.
    static let impactLabel = "rental cost avoided (estimate)"

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

struct Airport: Identifiable, Hashable {
    let code: String
    let name: String
    let latitude: Double
    let longitude: Double
    var id: String { code }
    var coordinate: CLLocationCoordinate2D { .init(latitude: latitude, longitude: longitude) }

    static let all = [
        Airport(code: "DTW", name: "Detroit Metro", latitude: 42.2124, longitude: -83.3534),
        Airport(code: "YYZ", name: "Toronto Pearson", latitude: 43.6777, longitude: -79.6248),
    ]

    static func named(_ code: String) -> Airport? { all.first { $0.code == code } }
}
