import SwiftUI

/// Home: your next trip, the cars you track, and cars suggested from your searches and from busy airports.
/// Tapping a car opens Find a car on that airport and dates; booking stays on Find a car.
struct HomeView: View {
    @Environment(AppStore.self) private var store
    /// Opens Find a car with the given airport and dates.
    var onOpen: (_ airport: String, _ from: String, _ to: String, _ carId: String?) -> Void
    var onTrip: (_ bookingId: String) -> Void

    var body: some View {
        let state = store.state
        let me = store.currentUserId
        let name = store.currentUser?.name.components(separatedBy: " ").first ?? "there"
        let tracked = (state.tracked[me] ?? []).compactMap { state.car($0) }
        let searched = Recommend.fromSearches(state, userId: me)
        let popular = Recommend.popular(state, userId: me)

        Screen {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 12) {
                    Image("SayaraLogo")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 40, height: 40)
                        .accessibilityLabel("Sayara")
                    Text("Hi \(name)").font(.largeTitle.bold()).foregroundStyle(Theme.text)
                }
                Text("Cars you track, and cars that suit where you're headed.")
                    .font(.subheadline).foregroundStyle(Theme.textSoft)
            }

            if let next = nextTrip(state, me) { nextTripCard(next) }

            // Tracked cars
            sectionHeader("Cars you're tracking", symbol: "heart.fill",
                          detail: tracked.isEmpty ? nil : "Tap the heart on a car to stop tracking it.")
            if tracked.isEmpty {
                EmptyState(symbol: "heart", title: "Track cars you like",
                           message: "Tap the heart on any car in Find a car. It shows up here with its dates, so you can book it when you're ready.") {
                    Button("Find a car") { onOpen(store.searchAirport, store.searchFrom, store.searchTo, nil) }.buttonStyle(.primary)
                }
            } else {
                ForEach(tracked) { car in trackedRow(car) }
            }

            // Because you searched
            ForEach(searched, id: \.search.airport) { row in
                let place = Airport.named(row.search.airport)?.city ?? row.search.airport
                sectionHeader("Because you searched \(place)", symbol: "clock.arrow.circlepath",
                              detail: "\(Day.short(row.search.from)) – \(Day.short(row.search.to)) when it's free, otherwise its next open week.")
                carRow(row.cars)
            }

            // Popular
            if !popular.isEmpty {
                sectionHeader("Popular right now", symbol: "flame.fill", detail: "The airports with the most cars free to book.")
                ForEach(popular, id: \.airport) { row in
                    let airport = Airport.named(row.airport)
                    Text("\(airport?.city ?? row.airport) (\(row.airport)) · \(plural(row.cars.count, "car"))")
                        .font(.subheadline.weight(.semibold)).foregroundStyle(Theme.text)
                        .padding(.top, 2)
                    carRow(row.cars)
                }
            }
        }
    }

    // MARK: Pieces

    private func sectionHeader(_ title: String, symbol: String, detail: String?) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Label(title, systemImage: symbol)
                .font(.title3.bold())
                .foregroundStyle(Theme.text)
                .symbolRenderingMode(.hierarchical)
            if let detail { Text(detail).font(.caption).foregroundStyle(Theme.textSoft) }
        }
        .padding(.top, 10)
    }

    private func nextTrip(_ state: AppState, _ me: String) -> Booking? {
        state.bookings
            .filter { $0.userId == me && $0.status == .booked }
            .sorted { $0.from < $1.from }
            .first
    }

    private func nextTripCard(_ booking: Booking) -> some View {
        let car = store.state.car(booking.carId)
        let stage = store.state.stage(booking.id)
        return Button { onTrip(booking.id) } label: {
            HStack(spacing: 14) {
                CarPhotoView(car: car)
                    .frame(width: 92, height: 66)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                VStack(alignment: .leading, spacing: 3) {
                    Text("Your next trip").font(.caption.weight(.semibold)).foregroundStyle(Theme.greenText)
                    Text("\(car?.model ?? "Car") at \(car?.airport ?? "")").font(.headline).foregroundStyle(Theme.text).lineLimit(1)
                    Text("\(Day.short(booking.from)) – \(Day.short(booking.to)) · \(stage == .pickup ? "ready to pick up" : "on the road")")
                        .font(.caption).foregroundStyle(Theme.textSoft)
                }
                Spacer(minLength: 0)
                Image(systemName: "chevron.right").foregroundStyle(Theme.textSoft)
            }
            .padding(14)
            .glassEffect(.regular.tint(Theme.green.opacity(0.12)).interactive(), in: RoundedRectangle(cornerRadius: Theme.radius))
        }
        .buttonStyle(.plain)
    }

    private func trackedRow(_ car: Car) -> some View {
        let status = Recommend.status(of: car, state: store.state, userId: store.currentUserId)
        let trip = Recommend.trip(for: car, preferred: nil, state: store.state)
        return HStack(spacing: 14) {
            CarPhotoView(car: car)
                .frame(width: 104, height: 72)
                .clipShape(RoundedRectangle(cornerRadius: 10))
            VStack(alignment: .leading, spacing: 4) {
                Text(car.model).font(.headline).foregroundStyle(Theme.text).lineLimit(1)
                Text("\(Airport.named(car.airport)?.label ?? car.airport) · \(plural(car.seats, "seat"))")
                    .font(.caption).foregroundStyle(Theme.textSoft)
                Pill(text: status.text, color: status.free ? Theme.greenText : Theme.textSoft,
                     symbol: status.free ? "checkmark.circle.fill" : "clock")
            }
            Spacer(minLength: 0)
            TrackButton(carId: car.id)
        }
        .padding(12)
        .background(Theme.surface, in: RoundedRectangle(cornerRadius: Theme.radius))
        .overlay(RoundedRectangle(cornerRadius: Theme.radius).stroke(Theme.line, lineWidth: 1))
        .contentShape(Rectangle())
        .onTapGesture { if let trip { onOpen(car.airport, trip.from, trip.to, car.id) } }
    }

    private func carRow(_ cars: [Suggestion]) -> some View {
        ScrollView(.horizontal) {
            LazyHStack(alignment: .top, spacing: 12) {
                ForEach(cars) { s in suggestionCard(s) }
            }
            .scrollTargetLayout()
        }
        .scrollTargetBehavior(.viewAligned)
        .scrollIndicators(.hidden)
        .contentMargins(.horizontal, 16, for: .scrollContent)
        .padding(.horizontal, -16)
    }

    private func suggestionCard(_ s: Suggestion) -> some View {
        let days = Rules.tripDays(s.from, s.to)
        return Button { onOpen(s.car.airport, s.from, s.to, s.car.id) } label: {
            VStack(alignment: .leading, spacing: 6) {
                CarPhotoView(car: s.car)
                    .frame(width: 220, height: 140)
                    .clipShape(RoundedRectangle(cornerRadius: Theme.radius))
                    .overlay(alignment: .topTrailing) { TrackButton(carId: s.car.id).padding(8) }
                Text(s.car.model).font(.subheadline.weight(.bold)).foregroundStyle(Theme.text).lineLimit(1)
                Text("\(Day.short(s.from)) – \(Day.short(s.to)) · \(plural(s.car.seats, "seat"))")
                    .font(.caption).foregroundStyle(Theme.textSoft)
                Text("\(plural(Rules.tripCost(days), "credit")) for \(plural(days, "day"))")
                    .font(.caption.weight(.semibold)).foregroundStyle(Theme.greenText)
            }
            .frame(width: 220, alignment: .leading)
        }
        .buttonStyle(.plain)
    }
}

/// The heart: tracks a car so it shows on Home.
struct TrackButton: View {
    @Environment(AppStore.self) private var store
    let carId: String

    var body: some View {
        let on = store.state.isTracked(carId, by: store.currentUserId)
        Button {
            try? store.update { Recommend.toggleTrack(&$0, userId: store.currentUserId, carId: carId) }
        } label: {
            Image(systemName: on ? "heart.fill" : "heart")
                .font(.headline)
                .foregroundStyle(on ? Theme.flag : .white)
                .frame(width: 38, height: 38)
                .contentTransition(.symbolEffect(.replace))
        }
        .glassEffect(.regular.interactive(), in: Circle())
        .sensoryFeedback(.selection, trigger: on)
        .accessibilityLabel(on ? "Stop tracking this car" : "Track this car")
    }
}
