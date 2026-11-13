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
        .sheet(item: $pending) { car in
            BookSheet(car: car, from: from, to: to) { bookingId in
                pending = nil
                onBooked(bookingId)
            }
        }
    }

    @ViewBuilder private var summary: some View {
        if days >= 1 {
            let place = Airport.named(airport)?.city ?? airport
            (Text(plural(results.count, "car")).bold().foregroundStyle(Theme.text)
             + Text(" at \(place) for \(plural(days, "day")). Each costs \(priceText(Rules.tripCost(days))); you have \(plural(credits, "credit"))."))
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
                VStack(alignment: .leading, spacing: 2) {
                    (Text(plural(Rules.tripCost(days), "credit")).bold().foregroundStyle(Theme.text)
                     + Text(" for \(plural(days, "day"))").foregroundStyle(Theme.textSoft))
                    Text("or \(usd(Double(Rules.tripCost(days)) * Config.usdPerCredit))")
                        .font(.caption).foregroundStyle(Theme.textSoft)
                }
                .monospacedDigit()
                Spacer()
                Button("Book") { pending = car }
                    .buttonStyle(.primary)
                    .frame(width: 110)
            }
        }
        .padding(.bottom, 10)
    }

}

/// The booking window: the car, the dates, what it costs, and how to pay for it.
private struct BookSheet: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let car: Car
    let from: String
    let to: String
    var onBooked: (String) -> Void

    @State private var useCredits = true
    @State private var error: String?

    var body: some View {
        let days = Rules.tripDays(from, to)
        let cost = Rules.tripCost(days)
        let balance = store.currentUser?.credits ?? 0
        let credits = Rules.creditsToUse(cost, balance: balance, useCredits: useCredits)

        NavigationStack {
            Screen {
                CarSummary(car: car, owner: store.state.user(car.ownerId))
                Card {
                    row("Dates", "\(Day.short(from)) to \(Day.short(to))")
                    row("Miles included", "\(days * Config.milesIncludedPerDay)")
                    row("Price", priceText(cost))
                    Text("Each mile past \(days * Config.milesIncludedPerDay) costs 1 more credit, paid when you return the car. The owner gets the credits on return.")
                        .font(.caption).foregroundStyle(Theme.textSoft)
                }
                PayChoiceView(cost: cost, balance: balance, useCredits: $useCredits)
                if let error { ErrorBanner(message: error) }
                Button("Book for \(payText(Payment(credits: credits, usd: Double(cost - credits) * Config.usdPerCredit)))") {
                    book(credits)
                }
                .buttonStyle(.primary)
            }
            .navigationTitle("Book the \(car.model)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } } }
        }
        .preferredColorScheme(.dark)
        .tint(Theme.green)
    }

    private func row(_ term: String, _ value: String) -> some View {
        HStack {
            Text(term).foregroundStyle(Theme.textSoft)
            Spacer()
            Text(value).fontWeight(.semibold).foregroundStyle(Theme.text).monospacedDigit()
        }
        .font(.subheadline)
    }

    private func book(_ credits: Int) {
        do {
            var booking: Booking?
            try store.update {
                booking = try Rules.book(&$0, userId: store.currentUserId, carId: car.id, from: from, to: to, creditsUsed: credits)
            }
            if let booking { onBooked(booking.id) }
        } catch {
            self.error = error.localizedDescription
        }
    }
}
