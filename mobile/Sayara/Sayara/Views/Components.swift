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
            DatePicker(toLabel, selection: day($to), displayedComponents: .date)
        }
        .foregroundStyle(Theme.text)
    }

    private func day(_ value: Binding<String>) -> Binding<Date> {
        Binding(get: { Day.date(value.wrappedValue) }, set: { value.wrappedValue = Day.string($0) })
    }
}

struct AirportPicker: View {
    @Binding var code: String

    var body: some View {
        Picker("Airport", selection: $code) {
            ForEach(Airport.all) { Text("\($0.code) · \($0.name)").tag($0.code) }
        }
        .pickerStyle(.segmented)
    }
}

/// Model, seats, airport and the owner's window. Used in search results and trip pages.
struct CarSummary: View {
    let car: Car
    var owner: User? = nil

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            Image(systemName: "car.side.fill")
                .font(.title2)
                .foregroundStyle(Theme.green)
                .frame(width: 52, height: 52)
                .background(Theme.greenTint, in: RoundedRectangle(cornerRadius: 12))
            VStack(alignment: .leading, spacing: 4) {
                Text(car.model).font(.headline).foregroundStyle(Theme.text)
                Text("\(car.seats) seats · \(car.airport)\(owner.map { " · lent by \($0.name)" } ?? "")")
                    .font(.subheadline).foregroundStyle(Theme.textSoft)
                Text("Free \(Day.short(car.from)) – \(Day.short(car.to)) (owner lands \(Day.short(car.to)))")
                    .font(.caption).foregroundStyle(Theme.textSoft)
            }
        }
    }
}

struct LockerCodeView: View {
    let bookingId: String

    var body: some View {
        let code = Rules.lockerCode(bookingId)
        Card {
            Label("Key locker code", systemImage: "lock.open.fill")
                .font(.headline).foregroundStyle(Theme.green)
            HStack(spacing: 10) {
                ForEach(Array(code.enumerated()), id: \.offset) { _, digit in
                    Text(String(digit))
                        .font(.system(size: 44, weight: .bold, design: .rounded))
                        .foregroundStyle(Theme.green)
                        .frame(width: 58, height: 72)
                        .background(Theme.surfaceRaised, in: RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.green.opacity(0.4)))
                }
            }
            .frame(maxWidth: .infinity)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("Code \(code.map(String.init).joined(separator: " "))")
            Text("Unlocked by your pickup photos. A made-up code: there is no real locker.")
                .font(.caption).foregroundStyle(Theme.textSoft)
        }
    }
}

/// Where the owner parked. A fixed map, no panning.
struct ParkingMapView: View {
    let car: Car

    var body: some View {
        let airport = Airport.named(car.airport)
        let coordinate = car.pin.map { CLLocationCoordinate2D(latitude: $0.latitude, longitude: $0.longitude) }
            ?? airport?.coordinate ?? .init(latitude: 42.2124, longitude: -83.3534)
        Card {
            Label("Find the car", systemImage: "mappin.and.ellipse")
                .font(.headline).foregroundStyle(Theme.green)
            Map(initialPosition: .camera(MapCamera(centerCoordinate: coordinate, distance: 1800)),
                interactionModes: []) {
                Marker(car.model, systemImage: "car.fill", coordinate: coordinate).tint(Theme.green)
            }
            .mapStyle(.standard(pointsOfInterest: .excludingAll))
            .frame(height: 180)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            Text(car.pin?.note.isEmpty == false ? car.pin!.note : "Parked at \(airport?.name ?? car.airport)")
                .font(.subheadline).foregroundStyle(Theme.textSoft)
        }
    }
}

/// The dollar figure for judges. Its inputs are estimates and the screen says so.
struct ImpactView: View {
    let days: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text("$\(days * Config.rentalCostPerDayUSDEstimate)")
                    .font(.system(size: 54, weight: .heavy, design: .rounded))
                    .monospacedDigit()
                Text(Config.impactLabel).font(.headline)
            }
            Text("\(plural(days, "day")) at about $\(Config.rentalCostPerDayUSDEstimate) a day for a rental car. No money changed hands.")
                .font(.subheadline)
                .opacity(0.8)
        }
        .foregroundStyle(.black)
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
