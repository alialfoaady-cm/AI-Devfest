import SwiftUI

/// Pick an airport and dates, see cars free for the whole trip, book with credits.
struct FindCarView: View {
    @Environment(AppStore.self) private var store
    var onBooked: (String) -> Void
    var onLend: () -> Void

    @State private var airport = SampleData.defaultAirport
    @State private var from = SampleData.defaultFrom
    @State private var to = SampleData.defaultTo
    @State private var error: String?
    @State private var pending: Car?

    private var days: Int { Rules.tripDays(from, to) }
    private var credits: Int { store.currentUser?.credits ?? 0 }
    private var results: [Car] {
        Rules.availableCars(store.state, airport: airport, from: from, to: to, userId: store.currentUserId)
    }

    var body: some View {
        Screen {
            Text("Find a car where you land")
                .font(.largeTitle.bold()).foregroundStyle(Theme.text)

            Card {
                Text("Where").font(.caption.weight(.semibold)).foregroundStyle(Theme.textSoft)
                AirportPicker(code: $airport)
                DayRangePicker(fromLabel: "Pick up", toLabel: "Return", from: $from, to: $to)
            }

            summary

            if let error { ErrorBanner(message: error) }
            if days >= 1 && credits < days && !results.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    AmberNote(message: "This trip needs \(plural(days, "credit")) and you have \(credits). Lend your car to earn more, or shorten the trip.")
                    Button("Lend my car", action: onLend).buttonStyle(.secondary)
                }
            }

            ForEach(results) { car in carCard(car) }

            if days >= 1 && results.isEmpty {
                EmptyState(symbol: "car.side",
                           title: "No cars at \(airport) for those dates yet",
                           message: "Try other dates or another airport. If you park here when you fly, your car could be the first.") {
                    Button("List my car", action: onLend).buttonStyle(.primary)
                }
            }
        }
        .onChange(of: airport) { error = nil }
        .onChange(of: from) { error = nil }
        .onChange(of: to) { error = nil }
        .alert(pending.map { "Book the \($0.model)?" } ?? "",
               isPresented: Binding(get: { pending != nil }, set: { if !$0 { pending = nil } })) {
            Button("Cancel", role: .cancel) {}
            Button("Book") { if let car = pending { book(car) } }
        } message: {
            Text("\(Day.short(from)) to \(Day.short(to)). \(plural(days, "credit")) come off your balance now. The owner gets them when you return the car.")
        }
    }

    @ViewBuilder private var summary: some View {
        if days >= 1 {
            let place = Airport.named(airport)?.city ?? airport
            (Text(plural(results.count, "car")).bold().foregroundStyle(Theme.text)
             + Text(" at \(place) for \(plural(days, "day")). Each costs \(plural(days, "credit")); you have \(credits)."))
                .font(.subheadline)
                .foregroundStyle(Theme.textSoft)
        } else {
            Text("Pick a return date at least one day after pickup.")
                .font(.subheadline).foregroundStyle(Theme.flag)
        }
    }

    /// Turo-style card: big 3:2 photo, heavy name, one line of facts, price and Book.
    private func carCard(_ car: Car) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            CarPhotoView(car: car)
                .aspectRatio(3 / 2, contentMode: .fit)
                .frame(maxWidth: .infinity)
                .clipShape(RoundedRectangle(cornerRadius: Theme.radius))
            Text(car.model).font(.title3.weight(.heavy)).foregroundStyle(Theme.text)
            Text("\(plural(car.seats, "seat")). Lent by \(store.state.firstName(car.ownerId)), back by \(Day.short(car.to)).")
                .font(.subheadline).foregroundStyle(Theme.textSoft)
            HStack {
                (Text(plural(days, "credit")).bold().foregroundStyle(Theme.text)
                 + Text(" for \(plural(days, "day"))").foregroundStyle(Theme.textSoft))
                    .monospacedDigit()
                Spacer()
                Button("Book") { pending = car }
                    .buttonStyle(.primary)
                    .frame(width: 110)
                    .disabled(credits < days)
            }
        }
        .padding(.bottom, 10)
    }

    private func book(_ car: Car) {
        do {
            var booking: Booking?
            try store.update { booking = try Rules.book(&$0, userId: store.currentUserId, carId: car.id, from: from, to: to) }
            error = nil
            if let booking { onBooked(booking.id) }
        } catch {
            self.error = error.localizedDescription
        }
    }
}
