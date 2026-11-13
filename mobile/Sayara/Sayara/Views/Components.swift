import SwiftUI
import MapKit

/// Two date pickers bound to "YYYY-MM-DD" strings.
struct DayRangePicker: View {
    let fromLabel: String
    let toLabel: String
    @Binding var from: String
    @Binding var to: String

    var body: some View {
        VStack(spacing: 10) {
            DatePicker(fromLabel, selection: day($from), displayedComponents: .date)
            Divider().overlay(Theme.line)
            DatePicker(toLabel, selection: day($to), in: Day.date(from)..., displayedComponents: .date)
        }
        .foregroundStyle(Theme.text)
    }

    private func day(_ value: Binding<String>) -> Binding<Date> {
        Binding(get: { Day.date(value.wrappedValue) }, set: { value.wrappedValue = Day.string($0) })
    }
}

/// Shows the chosen airport; tap to search all US and Canadian passenger airports.
struct AirportPicker: View {
    @Binding var code: String
    @State private var choosing = false

    var body: some View {
        let airport = Airport.named(code)
        Button { choosing = true } label: {
            HStack(spacing: 12) {
                Image(systemName: "airplane").font(.headline).foregroundStyle(Theme.green)
                VStack(alignment: .leading, spacing: 2) {
                    Text(airport?.label ?? code).font(.headline).foregroundStyle(Theme.text)
                    Text(airport?.name ?? "Pick an airport").font(.caption).foregroundStyle(Theme.textSoft).lineLimit(1)
                }
                Spacer()
                Image(systemName: "chevron.up.chevron.down").font(.caption).foregroundStyle(Theme.textSoft)
            }
            .padding(14)
            .background(Theme.surfaceRaised, in: RoundedRectangle(cornerRadius: 8))
        }
        .buttonStyle(.plain)
        .sheet(isPresented: $choosing) { AirportSearchSheet(code: $code) }
    }
}

private struct AirportSearchSheet: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @Binding var code: String
    @State private var query = ""

    /// Airports where at least one car is listed, so the demo airports are one tap away.
    private var withCars: [Airport] {
        Set(store.state.cars.map(\.airport)).compactMap(Airport.named).sorted { $0.city < $1.city }
    }

    private func results(_ country: String) -> [Airport] {
        Airport.all.filter { $0.country == country && $0.matches(query) }
            .sorted { ($0.city, $0.code) < ($1.city, $1.code) }
    }

    var body: some View {
        NavigationStack {
            List {
                if query.isEmpty && !withCars.isEmpty {
                    Section("Cars listed here") { ForEach(withCars) { row($0) } }
                }
                let us = results("US"), ca = results("CA")
                if !us.isEmpty { Section("United States") { ForEach(us) { row($0) } } }
                if !ca.isEmpty { Section("Canada") { ForEach(ca) { row($0) } } }
                if us.isEmpty && ca.isEmpty {
                    Text("No airport matches \u{201C}\(query)\u{201D}.").foregroundStyle(Theme.textSoft)
                }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.background)
            .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always),
                        prompt: "City, airport or code")
            .navigationTitle("Airport")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } } }
        }
        .preferredColorScheme(.dark)
        .tint(Theme.green)
    }

    private func row(_ airport: Airport) -> some View {
        Button {
            code = airport.code
            dismiss()
        } label: {
            HStack(spacing: 12) {
                Text(airport.code)
                    .font(.subheadline.weight(.bold)).monospaced()
                    .foregroundStyle(airport.code == code ? Theme.onGreen : Theme.text)
                    .frame(width: 52, height: 32)
                    .background(airport.code == code ? Theme.green : Theme.surfaceRaised, in: RoundedRectangle(cornerRadius: 6))
                VStack(alignment: .leading, spacing: 2) {
                    Text(airport.place).foregroundStyle(Theme.text)
                    Text(airport.name).font(.caption).foregroundStyle(Theme.textSoft).lineLimit(1)
                }
            }
        }
        .listRowBackground(Theme.surface)
    }
}

/// The listing photo, or a quiet placeholder with the car's name when there is none.
struct CarPhotoView: View {
    let car: Car?
    var model: String? = nil
    var preview: UIImage? = nil

    var body: some View {
        ZStack {
            if let preview {
                Image(uiImage: preview).resizable().scaledToFill()
            } else if let asset = car.flatMap({ Self.assetName($0.photo) }) {
                Showroom(asset: asset)
            } else if let spec = car?.photo, SampleCarPortrait.isSample(spec) {
                SampleCarPortrait(spec: spec)
            } else if let name = car?.photo, let image = PhotoStore.load(name) {
                Image(uiImage: image).resizable().scaledToFill()
            } else {
                Theme.surfaceRaised
                VStack(spacing: 6) {
                    Image(systemName: "car.side.fill").font(.system(size: 34, weight: .light))
                    Text(model ?? car?.model ?? "Car").font(.footnote.weight(.medium)).lineLimit(1)
                }
                .foregroundStyle(Theme.textSoft)
                .padding(.horizontal, 8)
            }
        }
        .clipped()
    }

    /// "/cars/toyota-rav4.png" (the web app's path) -> "toyota-rav4", the image in Assets.xcassets/Cars.
    static func assetName(_ photo: String?) -> String? {
        guard let photo, photo.hasPrefix("/cars/") else { return nil }
        let name = String(photo.dropFirst("/cars/".count).split(separator: ".").first ?? "")
        return UIImage(named: name) == nil ? nil : name
    }
}

/// A cut-out car photo centred on a dark showroom floor, like the web app's demo cars.
private struct Showroom: View {
    let asset: String

    var body: some View {
        GeometryReader { geo in
            ZStack {
                LinearGradient(colors: [Color(hex: 0x2A2F36), Color(hex: 0x15181C)], startPoint: .top, endPoint: .bottom)
                Ellipse()
                    .fill(.black.opacity(0.55))
                    .frame(width: geo.size.width * 0.72, height: geo.size.height * 0.09)
                    .blur(radius: 6)
                    .offset(y: geo.size.height * 0.27)
                Image(asset)
                    .resizable()
                    .scaledToFit()
                    .padding(.horizontal, geo.size.width * 0.07)
                    .padding(.vertical, geo.size.height * 0.08)
            }
        }
    }
}

/// A trip's car: small photo, name and dates. Used at the top of a trip.
struct CarSummary: View {
    let car: Car
    var owner: User? = nil

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            CarPhotoView(car: car)
                .frame(width: 96, height: 72)
                .clipShape(RoundedRectangle(cornerRadius: 8))
            VStack(alignment: .leading, spacing: 4) {
                Text("\(car.model) at \(car.airport)").font(.headline).foregroundStyle(Theme.text)
                Text("\(plural(car.seats, "seat"))\(owner.map { ". Lent by \($0.name.components(separatedBy: " ").first ?? $0.name)" } ?? ""), back by \(Day.short(car.to)).")
                    .font(.subheadline).foregroundStyle(Theme.textSoft)
            }
        }
    }
}

/// An empty list: an icon, what is missing, and the one thing to do about it.
struct EmptyState<Action: View>: View {
    let symbol: String
    let title: String
    let message: String
    @ViewBuilder var action: Action

    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: symbol).font(.system(size: 36, weight: .light)).foregroundStyle(Theme.textSoft)
            Text(title).font(.headline).multilineTextAlignment(.center).foregroundStyle(Theme.text)
            Text(message).font(.subheadline).multilineTextAlignment(.center).foregroundStyle(Theme.textSoft)
            action.padding(.top, 6)
        }
        .padding(24)
        .frame(maxWidth: .infinity)
        .background(Theme.surface, in: RoundedRectangle(cornerRadius: Theme.radius))
    }
}

/// A quiet amber note, e.g. "Borrowers cannot find this car until you drop its pin."
struct AmberNote: View {
    let message: String

    var body: some View {
        Label(message, systemImage: "exclamationmark.circle.fill")
            .font(.subheadline.weight(.medium))
            .foregroundStyle(Theme.unsure)
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.unsure.opacity(0.12), in: RoundedRectangle(cornerRadius: 8))
    }
}

struct LockerCodeView: View {
    let bookingId: String

    var body: some View {
        let code = Rules.lockerCode(bookingId)
        Card {
            Label("Key locker code", systemImage: "lock.open.fill")
                .font(.headline).foregroundStyle(Theme.greenText)
            HStack(spacing: 10) {
                ForEach(Array(code.enumerated()), id: \.offset) { _, digit in
                    Text(String(digit))
                        .font(.system(size: 44, weight: .bold, design: .rounded))
                        .foregroundStyle(Theme.greenText)
                        .frame(width: 58, height: 72)
                        .background(Theme.surfaceRaised, in: RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.greenText.opacity(0.4)))
                }
            }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("Code \(code.map(String.init).joined(separator: " "))")
            Text("Unlocked by your pickup photos. The code is made up for this demo: there is no real locker yet.")
                .font(.caption).foregroundStyle(Theme.textSoft)
        }
    }
}

/// The parking pin on a fixed map, with the spot number riding on it.
struct ParkingMapView: View {
    let pin: Pin
    var spot: String?

    var body: some View {
        let coordinate = CLLocationCoordinate2D(latitude: pin.lat, longitude: pin.lng)
        Map(initialPosition: .camera(MapCamera(centerCoordinate: coordinate, distance: 700)), interactionModes: []) {
            // Centred on the car badge, so the spot label fits on small maps too.
            Annotation(spot ?? "", coordinate: coordinate, anchor: .center) { CarPinView(spot: spot) }
                .annotationTitles(.hidden)
        }
        .mapStyle(.standard(pointsOfInterest: .excludingAll))
        .id("\(pin.lat),\(pin.lng)")
    }
}

/// The green pin: a car badge with the spot number under it when there is one.
struct CarPinView: View {
    var spot: String?

    var body: some View {
        VStack(spacing: 2) {
            if let spot, !spot.isEmpty {
                Text(spot)
                    .font(.caption.weight(.bold)).monospacedDigit()
                    .foregroundStyle(.black)
                    .padding(.horizontal, 7).padding(.vertical, 3)
                    .background(.white, in: Capsule())
            }
            Image(systemName: "car.fill")
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(Theme.onGreen)
                .frame(width: 34, height: 34)
                .background(Theme.green, in: Circle())
                .overlay(Circle().stroke(.black, lineWidth: 2))
            Rectangle().fill(.black).frame(width: 2, height: 8)
        }
    }
}

/// For the borrower: where the car is, the spot number, and a way into Maps.
struct WhereItIs: View {
    let car: Car
    let owner: String
    let returning: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(returning ? "Bring it back to the same spot" : "Find the car")
                        .font(.title3.bold()).foregroundStyle(Theme.text)
                    Text(car.pin == nil ? "\(owner) has not pinned the parking spot yet." : "Pinned by \(owner).")
                        .font(.subheadline).foregroundStyle(Theme.textSoft)
                }
                Spacer()
                if let spot = car.spot {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("Spot").font(.caption).foregroundStyle(Theme.textSoft)
                        Text(spot).font(.title2.bold()).monospacedDigit().foregroundStyle(Theme.text)
                    }
                    .padding(.horizontal, 14).padding(.vertical, 8)
                    .background(Theme.surface, in: RoundedRectangle(cornerRadius: 8))
                }
            }
            if let pin = car.pin {
                ParkingMapView(pin: pin, spot: car.spot)
                    .frame(height: 220)
                    .clipShape(RoundedRectangle(cornerRadius: Theme.radius))
                Button {
                    let item = MKMapItem(location: CLLocation(latitude: pin.lat, longitude: pin.lng), address: nil)
                    item.name = car.spot.map { "\(car.model), spot \($0)" } ?? car.model
                    item.openInMaps()
                } label: {
                    Label("Open in Maps", systemImage: "arrow.up.forward.square")
                }
                .buttonStyle(.secondary)
            }
        }
    }
}

/// The dollar figure for judges. Its inputs are estimates and the screen says so.
struct ImpactView: View {
    let days: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("$\(days * Config.rentalCostPerDayUSDEstimate)")
                .font(.system(size: 50, weight: .bold))
                .monospacedDigit()
            Text(Config.impactLabel).font(.headline)
            Text("\(plural(days, "day")) at about $\(Config.rentalCostPerDayUSDEstimate) a day for a rental car. No money changed hands.")
                .font(.subheadline)
        }
        .foregroundStyle(Theme.onGreen)
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.green, in: RoundedRectangle(cornerRadius: Theme.radius))
    }
}

/// A stored photo, or a placeholder if the file is gone.
struct StoredPhoto: View {
    let name: String?

    var body: some View {
        if let name, let image = PhotoStore.load(name) {
            Image(uiImage: image).resizable().scaledToFill()
        } else {
            Theme.surfaceRaised.overlay(Image(systemName: "photo").foregroundStyle(Theme.textSoft))
        }
    }
}

/// A round initial for a person, e.g. "A" for Avery.
struct Initial: View {
    let name: String

    var body: some View {
        Text(String(name.prefix(1)))
            .font(.subheadline.bold())
            .foregroundStyle(Theme.text)
            .frame(width: 32, height: 32)
            .background(Theme.surfaceRaised, in: Circle())
    }
}
