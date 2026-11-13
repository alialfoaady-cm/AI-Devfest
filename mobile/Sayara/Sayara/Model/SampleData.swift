import Foundation

// Made-up demo data. No real people, plates, addresses or locker codes.
// The first two users and cars match lib/sampleData.ts in the web app, then three test owners for the phone,
// then the web app's 50 demo listings (SeedListings.swift).
enum SampleData {
    static let state = AppState(
        users: [
            User(id: "user-a", name: "Avery (demo A)", credits: 70),
            User(id: "user-b", name: "Blake (demo B)", credits: 350),
            // Test owners, so there are more cars to find than the two demo ones.
            User(id: "user-c", name: "Casey (test)", credits: Config.startingCredits),
            User(id: "user-d", name: "Drew (test)", credits: Config.startingCredits),
            User(id: "user-e", name: "Emery (test)", credits: Config.startingCredits),
        ] + SeedListings.users,
        cars: [
            Car(id: "car-a", ownerId: "user-a", airport: "DTW", model: "Blue hatchback", seats: 5,
                from: "2026-12-18", to: "2026-12-30",
                pin: Pin(lat: 42.2068, lng: -83.3555), spot: "B-214", photo: "sample:hatchback:blue"),
            Car(id: "car-b", ownerId: "user-b", airport: "YYZ", model: "Green wagon", seats: 5,
                from: "2026-12-20", to: "2026-12-27",
                pin: Pin(lat: 43.6831, lng: -79.6135), spot: "C-108", photo: "sample:wagon:green"),

            // Test cars, with the real photos from the web app (Assets.xcassets/Cars).
            Car(id: "car-c", ownerId: "user-c", airport: "DTW", model: "2021 Toyota RAV4", seats: 5,
                from: "2026-12-15", to: "2027-01-03",
                pin: Pin(lat: 42.2072, lng: -83.3548), spot: "C-031", photo: "/cars/toyota-rav4.png"),
            Car(id: "car-d", ownerId: "user-d", airport: "DTW", model: "2019 Honda Odyssey", seats: 8,
                from: "2026-12-19", to: "2026-12-29",
                pin: Pin(lat: 42.2063, lng: -83.3561), spot: "A-112", photo: "/cars/honda-odyssey-north-america.png"),
            Car(id: "car-e", ownerId: "user-e", airport: "YYZ", model: "2022 Subaru Outback", seats: 5,
                from: "2026-12-18", to: "2026-12-31",
                pin: Pin(lat: 43.6827, lng: -79.6128), spot: "D-207", photo: "/cars/subaru-outback.png"),
            Car(id: "car-f", ownerId: "user-c", airport: "ORD", model: "2020 Ford F-150", seats: 5,
                from: "2026-12-20", to: "2027-01-05",
                pin: Pin(lat: 41.9786, lng: -87.9048), spot: "E-410", photo: "/cars/ford-f-series-fourteenth-generation.png"),
            // Free from Dec 21, so it does NOT show for the default Dec 20-27 search: tests the
            // "free for the whole trip" rule. Search YVR from Dec 21 to find it.
            Car(id: "car-g", ownerId: "user-e", airport: "YVR", model: "2023 Tesla Model 3", seats: 5,
                from: "2026-12-21", to: "2026-12-28",
                pin: Pin(lat: 49.1932, lng: -123.1795), spot: "P2-58", photo: "/cars/tesla-model-3.png"),
        ] + SeedListings.cars,
        bookings: [],
        inspections: []
    )

    static let defaultUserId = "user-b"
    static let defaultAirport = "DTW"
    static let defaultFrom = "2026-12-20"
    static let defaultTo = "2026-12-27"
}
