import SwiftUI
import MapKit

/// List a car for the days the owner is away, and see your listed cars.
struct LendView: View {
    @Environment(AppStore.self) private var store

    @State private var model = ""
    @State private var seats = 5
    @State private var airport = SampleData.defaultAirport
    @State private var from = SampleData.defaultFrom
    @State private var to = SampleData.defaultTo
    @State private var spotNote = ""
    @State private var pin: CLLocationCoordinate2D?
    @State private var error: String?
    @State private var listed = false

    private var myCars: [Car] { store.state.cars.filter { $0.ownerId == store.currentUserId } }

    var body: some View {
        Screen {
            Text("Your car sits at the airport while you travel. Lend it to someone landing in your city and earn 1 credit for every day it is borrowed.")
                .font(.subheadline).foregroundStyle(Theme.textSoft)

            if !myCars.isEmpty {
                SectionTitle(text: "Your cars")
                ForEach(myCars) { car in
                    Card {
                        CarSummary(car: car)
                        let bookings = store.state.bookings.filter { $0.carId == car.id }
                        Text(bookings.isEmpty ? "No bookings yet." : "\(plural(bookings.count, "booking")) · see My trips")
                            .font(.caption).foregroundStyle(Theme.green)
                    }
                }
            }

            SectionTitle(text: "List a car", detail: "Park it, drop a pin, leave the key in the CarSwap locker.")

            Card {
                TextField("", text: $model, prompt: Text("Car, e.g. Silver minivan").foregroundStyle(Theme.textSoft))
                    .textInputAutocapitalization(.sentences)
                    .padding(12)
                    .background(Theme.surfaceRaised, in: RoundedRectangle(cornerRadius: 10))
                Stepper("\(seats) seats", value: $seats, in: 2...9)
                AirportPicker(code: $airport)
                DayRangePicker(fromLabel: "I fly out", toLabel: "I land back", from: $from, to: $to)
                Text("Nobody can book past the day you land.")
                    .font(.caption).foregroundStyle(Theme.textSoft)
            }

            Card {
                Text("Drop a pin where you parked").font(.headline)
                PinDropMap(airport: airport, pin: $pin)
                    .frame(height: 200)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                Text(pin == nil ? "Tap the map to place the pin." : "Pin placed. Tap again to move it.")
                    .font(.caption).foregroundStyle(pin == nil ? Theme.textSoft : Theme.green)
                TextField("", text: $spotNote, prompt: Text("Spot, e.g. Lot P3, row C").foregroundStyle(Theme.textSoft))
                    .padding(12)
                    .background(Theme.surfaceRaised, in: RoundedRectangle(cornerRadius: 10))
            }

            if let error { ErrorBanner(message: error) }
            if listed {
                Label("Listed. Travellers landing at \(airport) can now book it.", systemImage: "checkmark.circle.fill")
                    .foregroundStyle(Theme.green).font(.subheadline.weight(.semibold))
            }

            Button("List my car", action: list).buttonStyle(.primary)
        }
        .foregroundStyle(Theme.text)
        .onChange(of: airport) { pin = nil }
    }

    private func list() {
        do {
            let parking = pin.map { ParkingPin(latitude: $0.latitude, longitude: $0.longitude, note: spotNote) }
            try store.update {
                try Rules.listCar(&$0, ownerId: store.currentUserId, airport: airport, model: model,
                                  seats: seats, from: from, to: to, pin: parking)
            }
            error = nil
            listed = true
            model = ""; spotNote = ""; pin = nil
        } catch {
            self.error = error.localizedDescription
            listed = false
        }
    }
}

private struct PinDropMap: View {
    let airport: String
    @Binding var pin: CLLocationCoordinate2D?

    var body: some View {
        let center = Airport.named(airport)?.coordinate ?? .init(latitude: 42.2124, longitude: -83.3534)
        MapReader { proxy in
            Map(initialPosition: .camera(MapCamera(centerCoordinate: center, distance: 3500))) {
                if let pin { Marker("My car", systemImage: "car.fill", coordinate: pin).tint(Theme.green) }
            }
            .mapStyle(.standard(pointsOfInterest: .excludingAll))
            .onTapGesture { point in pin = proxy.convert(point, from: .local) }
        }
        .id(airport) // re-center when the airport changes
    }
}
