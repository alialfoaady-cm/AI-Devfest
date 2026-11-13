import SwiftUI
import MapKit
import CoreLocation

enum LendRoute: Hashable {
    case newCar
    case spot(carId: String)
    case trip(bookingId: String)
}

/// Your cars: photo, pin, and who borrowed it. One credit for every day borrowed, paid on return.
struct LendView: View {
    @Environment(AppStore.self) private var store
    @Binding var path: [LendRoute]

    private var myCars: [Car] { store.state.cars.filter { $0.ownerId == store.currentUserId } }

    var body: some View {
        Screen {
            Text("\(Config.creditsPerDay) credits for every day someone borrows it, plus 1 for each mile past \(Config.milesIncludedPerDay) a day. Paid when it comes back.")
                .font(.subheadline).foregroundStyle(Theme.textSoft)

            if myCars.isEmpty {
                EmptyState(symbol: "key", title: "Your car could be earning while you fly",
                           message: "List it for the days you are away. Travellers landing at your airport borrow it, and it is back before you are.") {
                    Button("List my car") { path.append(.newCar) }.buttonStyle(.primary)
                }
            } else {
                Button { path.append(.newCar) } label: { Label("List a car", systemImage: "plus") }
                    .buttonStyle(.secondary)
            }

            ForEach(myCars) { car in carCard(car) }
        }
    }

    private func carCard(_ car: Car) -> some View {
        let loans = store.state.bookings.filter { $0.carId == car.id }
        return VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 0) {
                CarPhotoView(car: car).frame(maxWidth: .infinity).frame(height: 130)
                Group {
                    if let pin = car.pin {
                        ParkingMapView(pin: pin, spot: car.spot)
                    } else {
                        VStack(spacing: 6) {
                            Image(systemName: "mappin.and.ellipse").font(.title2.weight(.light))
                            Text("No pin yet").font(.footnote)
                        }
                        .foregroundStyle(Theme.textSoft)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(Theme.surfaceRaised)
                    }
                }
                .frame(maxWidth: .infinity).frame(height: 130)
                .allowsHitTesting(false)
            }

            VStack(alignment: .leading, spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(car.model).font(.title3.bold()).foregroundStyle(Theme.text)
                    Text("\(Airport.named(car.airport)?.label ?? car.airport). Free from \(Day.short(car.from)) until you land on \(Day.short(car.to)).")
                        .font(.subheadline).foregroundStyle(Theme.textSoft)
                }
                if car.pin == nil {
                    AmberNote(message: "Borrowers cannot find this car until you drop its pin.")
                }
                Button { path.append(.spot(carId: car.id)) } label: {
                    Label(car.pin == nil ? "Drop the pin" : "Move the pin", systemImage: "mappin")
                }
                .modifier(PinButtonStyle(primary: car.pin == nil))

                Text("Borrowers").font(.subheadline.weight(.semibold)).foregroundStyle(Theme.text).padding(.top, 6)
                if loans.isEmpty {
                    Text("Nobody has borrowed it yet.").font(.subheadline).foregroundStyle(Theme.textSoft)
                }
                ForEach(loans) { loan in borrowerRow(loan) }
            }
            .padding(16)
        }
        .background(Theme.surface, in: RoundedRectangle(cornerRadius: Theme.radius))
        .clipShape(RoundedRectangle(cornerRadius: Theme.radius))
        .overlay(RoundedRectangle(cornerRadius: Theme.radius).stroke(Theme.line, lineWidth: 1))
    }

    private func borrowerRow(_ loan: Booking) -> some View {
        let name = store.state.firstName(loan.userId)
        let stage = store.state.stage(loan.id)
        let returned = stage == .returned
        return VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 10) {
                Initial(name: name)
                (Text(name).fontWeight(.medium).foregroundStyle(Theme.text)
                 + Text(", \(Day.short(loan.from)) to \(Day.short(loan.to))").foregroundStyle(Theme.textSoft))
                    .font(.subheadline)
                Spacer()
                Pill(text: stage == .cancelled ? "Cancelled"
                        : returned ? "Earned \(Rules.tripCost(loan.days) + (loan.mileage?.credits ?? 0))"
                        : "Earns \(Rules.tripCost(loan.days))",
                     color: returned ? Theme.greenText : Theme.textSoft)
            }
            if stage == .driving || stage == .returned {
                Button(returned ? "Review return photos" : "See the trip") { path.append(.trip(bookingId: loan.id)) }
                    .buttonStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}

private struct PinButtonStyle: ViewModifier {
    let primary: Bool
    func body(content: Content) -> some View {
        if primary { content.buttonStyle(.primary) } else { content.buttonStyle(.secondary) }
    }
}

// MARK: - List a car

struct ListCarView: View {
    @Environment(AppStore.self) private var store
    @Binding var path: [LendRoute]

    @State private var model = ""
    @State private var seats = 5
    @State private var airport = SampleData.defaultAirport
    @State private var from = SampleData.defaultFrom
    @State private var to = SampleData.defaultTo
    @State private var photo: UIImage?
    @State private var choosingPhoto = false
    @State private var error: String?

    var body: some View {
        Screen {
            Text("Travellers landing at your airport can borrow it while you are away.")
                .font(.subheadline).foregroundStyle(Theme.textSoft)

            VStack(spacing: 10) {
                CarPhotoView(car: nil, model: model.isEmpty ? "Your car" : model, preview: photo)
                    .aspectRatio(3 / 2, contentMode: .fit)
                    .frame(maxWidth: .infinity)
                    .clipShape(RoundedRectangle(cornerRadius: Theme.radius))
                Button { choosingPhoto = true } label: {
                    Label(photo == nil ? "Add a photo of your car" : "Change photo", systemImage: "camera")
                }
                .buttonStyle(.secondary)
                .photoSource(isPresented: $choosingPhoto, title: "Photo of your car", outline: "car.side") { photo = $0 }
                Text("Borrowers pick a car they can see. A photo from the front corner works best.")
                    .font(.caption).foregroundStyle(Theme.textSoft)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            Card {
                Text("Car").font(.caption.weight(.semibold)).foregroundStyle(Theme.textSoft)
                TextField("", text: $model, prompt: Text("2019 Honda Civic").foregroundStyle(Theme.textSoft))
                    .textInputAutocapitalization(.words)
                    .padding(14)
                    .background(Theme.surfaceRaised, in: RoundedRectangle(cornerRadius: 8))
                    .onChange(of: model) { if model.count > 40 { model = String(model.prefix(40)) } }
                Stepper("\(plural(seats, "seat"))", value: $seats, in: 1...9)
                Text("Parked at").font(.caption.weight(.semibold)).foregroundStyle(Theme.textSoft)
                AirportPicker(code: $airport)
                DayRangePicker(fromLabel: "You fly out", toLabel: "You land back", from: $from, to: $to)
                Text("Nobody can book past the day you land. The car is back before you are.")
                    .font(.caption).foregroundStyle(Theme.textSoft)
            }
            .foregroundStyle(Theme.text)

            if let error { ErrorBanner(message: error) }

            Button("List car and drop the pin", action: list).buttonStyle(.primary)
        }
        .navigationTitle("List your car")
    }

    private func list() {
        do {
            let photoName = try photo.map { try PhotoStore.save($0) }
            var carId = ""
            try store.update {
                carId = try Rules.listCar(&$0, ownerId: store.currentUserId, airport: airport, model: model,
                                          seats: seats, from: from, to: to, photo: photoName)
            }
            error = nil
            // Replace this form with the pin step, so Back goes to your cars.
            path.removeLast()
            path.append(.spot(carId: carId))
        } catch {
            self.error = error.localizedDescription
        }
    }
}

// MARK: - Where is it parked?

/// Drag the map until the fixed pin sits on the car, add the bay number, save.
struct SpotEditorView: View {
    @Environment(AppStore.self) private var store
    @Binding var path: [LendRoute]
    let carId: String

    @State private var center: CLLocationCoordinate2D?
    @State private var camera: MapCameraPosition = .automatic
    @State private var spot = ""
    @State private var error: String?
    @State private var locator = OneShotLocator()
    @State private var started = false

    var body: some View {
        if let car = store.state.cars.first(where: { $0.id == carId && $0.ownerId == store.currentUserId }) {
            Screen {
                Text("Drag the map until the pin sits on your car. Your borrower sees exactly this.")
                    .font(.subheadline).foregroundStyle(Theme.textSoft)

                ZStack {
                    Map(position: $camera)
                        .mapStyle(.standard(pointsOfInterest: .excludingAll))
                        .onMapCameraChange(frequency: .continuous) { if started { center = $0.region.center } }
                    // The pin stays put; the map moves under it.
                    CarPinView(spot: spot.trimmingCharacters(in: .whitespaces))
                        .allowsHitTesting(false)
                }
                .frame(height: 340)
                .clipShape(RoundedRectangle(cornerRadius: Theme.radius))

                Button { locate() } label: { Label("Use my location", systemImage: "location") }
                    .buttonStyle(.secondary)

                Card {
                    Text("Parking spot number").font(.subheadline.weight(.semibold)).foregroundStyle(Theme.text)
                    TextField("", text: $spot, prompt: Text("B-214").foregroundStyle(Theme.textSoft))
                        .font(.title3.weight(.semibold)).monospacedDigit()
                        .textInputAutocapitalization(.characters)
                        .autocorrectionDisabled()
                        .padding(14)
                        .background(Theme.surfaceRaised, in: RoundedRectangle(cornerRadius: 8))
                        .onChange(of: spot) { if spot.count > 8 { spot = String(spot.prefix(8)) } }
                    Text("The number painted on the bay or the nearest pillar. It rides on the pin.")
                        .font(.caption).foregroundStyle(Theme.textSoft)
                }

                if let error { ErrorBanner(message: error) }

                Button("Save parking spot") { save() }.buttonStyle(.primary)
            }
            .navigationTitle("Where is it parked?")
            .onAppear { start(car) }
        } else {
            Screen { Text("This car is not yours to move.").foregroundStyle(Theme.textSoft) }
        }
    }

    private func start(_ car: Car) {
        // Only once: the map reports its default camera before this runs, so a check on `center` is not enough.
        guard !started else { return }
        started = true
        let fallback = Airport.named(car.airport)?.coordinate ?? CLLocationCoordinate2D(latitude: 42.2068, longitude: -83.3555)
        let start = car.pin.map { CLLocationCoordinate2D(latitude: $0.lat, longitude: $0.lng) } ?? fallback
        center = start
        spot = car.spot ?? ""
        camera = .camera(MapCamera(centerCoordinate: start, distance: 600))
    }

    private func locate() {
        error = nil
        locator.request { result in
            switch result {
            case .success(let here):
                camera = .camera(MapCamera(centerCoordinate: here, distance: 400))
                center = here
            case .failure:
                error = "Location is off or blocked. Drag the map instead."
            }
        }
    }

    private func save() {
        guard let center else { error = "Drop the pin on the map first."; return }
        do {
            try store.update {
                try Rules.setParking(&$0, carId: carId, ownerId: store.currentUserId,
                                     pin: Pin(lat: center.latitude, lng: center.longitude), spot: spot)
            }
            path.removeAll()
        } catch {
            self.error = error.localizedDescription
        }
    }
}

/// Asks for the phone's location once.
@Observable
final class OneShotLocator: NSObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    private var completion: ((Result<CLLocationCoordinate2D, Error>) -> Void)?

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
    }

    func request(_ completion: @escaping (Result<CLLocationCoordinate2D, Error>) -> Void) {
        self.completion = completion
        switch manager.authorizationStatus {
        case .notDetermined: manager.requestWhenInUseAuthorization()
        case .denied, .restricted: finish(.failure(RuleError("Location is off.")))
        default: manager.requestLocation()
        }
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        Task { @MainActor in
            guard self.completion != nil else { return }
            switch manager.authorizationStatus {
            case .authorizedWhenInUse, .authorizedAlways: manager.requestLocation()
            case .denied, .restricted: self.finish(.failure(RuleError("Location is off.")))
            default: break
            }
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        let coordinate = locations.last?.coordinate
        Task { @MainActor in
            if let coordinate { self.finish(.success(coordinate)) }
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in self.finish(.failure(error)) }
    }

    private func finish(_ result: Result<CLLocationCoordinate2D, Error>) {
        completion?(result)
        completion = nil
    }
}
