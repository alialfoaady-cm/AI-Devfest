import Foundation

// Made-up demo data, the same as lib/sampleData.ts. No real people, plates, addresses or locker codes.
enum SampleData {
    static let state = AppState(
        users: [
            User(id: "user-a", name: "Avery (demo A)", credits: 2),
            User(id: "user-b", name: "Blake (demo B)", credits: 10),
        ],
        cars: [
            Car(id: "car-a", ownerId: "user-a", airport: "DTW", model: "Blue hatchback", seats: 5,
                from: "2026-12-18", to: "2026-12-30",
                pin: Pin(lat: 42.2068, lng: -83.3555), spot: "B-214"),
            Car(id: "car-b", ownerId: "user-b", airport: "YYZ", model: "Green wagon", seats: 5,
                from: "2026-12-20", to: "2026-12-27",
                pin: Pin(lat: 43.6831, lng: -79.6135), spot: "C-108"),
        ],
        bookings: [],
        inspections: []
    )

    static let defaultUserId = "user-b"
    static let defaultAirport = "DTW"
    static let defaultFrom = "2026-12-20"
    static let defaultTo = "2026-12-27"
}
