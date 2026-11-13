import SwiftUI

/// Pick an airport and dates, see cars free for the whole trip, book with credits.
struct FindCarView: View {
    @Environment(AppStore.self) private var store
    var onBooked: (String) -> Void
    var onLend: () -> Void

    // The search lives on the store, so Home can open Find on a car's airport and dates.
    private var airport: String { store.searchAirport }
    private var from: String { store.searchFrom }
    private var to: String { store.searchTo }
    @State private var error: String?
    @State private var pending: Car?
    @State private var shown: String?   // id of the car in the middle of the carousel

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
                AirportPicker(code: Bindable(store).searchAirport)
                DayRangePicker(fromLabel: "Pick up", toLabel: "Return", from: Bindable(store).searchFrom, to: Bindable(store).searchTo)
            }

            summary

            if let error { ErrorBanner(message: error) }
            if !results.isEmpty { carousel }

            if days >= 1 && results.isEmpty {
                EmptyState(symbol: "car.side",
                           title: "No cars at \(airport) for those dates yet",
                           message: "Try other dates or another airport. If you park here when you fly, your car could be the first.") {
                    Button("List my car", action: onLend).buttonStyle(.primary)
                }
            }
        }
        .onChange(of: airport) { error = nil; remember() }
        .onChange(of: from) { error = nil; remember() }
        .onChange(of: to) { error = nil; remember() }
        .sheet(item: $pending) { car in
            BookSheet(car: car, from: from, to: to) { bookingId in
                pending = nil
                onBooked(bookingId)
            }
        }
    }

    /// Every search is remembered for the Home page's "Because you searched" rows.
    private func remember() {
        try? store.update { Recommend.recordSearch(&$0, userId: store.currentUserId, airport: airport, from: from, to: to) }
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

    /// Starts the carousel on the car Home opened Find for, if it is in the results; otherwise on the first.
    private func focus() {
        if let id = store.searchFocusCar, results.contains(where: { $0.id == id }) {
            shown = id
        } else {
            shown = results.first?.id
        }
    }

    /// The cars side by side: swipe sideways, one card at a time, with the next one peeking in.
    private var carousel: some View {
        VStack(spacing: 10) {
            ScrollView(.horizontal) {
                LazyHStack(alignment: .top, spacing: 14) {
                    ForEach(results) { car in
                        carCard(car)
                            .containerRelativeFrame(.horizontal) { width, _ in results.count == 1 ? width : width * 0.86 }
                            .id(car.id)
                    }
                }
                .scrollTargetLayout()
            }
            .scrollTargetBehavior(.viewAligned)
            .scrollPosition(id: $shown)
            .scrollIndicators(.hidden)
            .contentMargins(.horizontal, 16, for: .scrollContent)
            .padding(.horizontal, -16)   // run edge to edge, past the page margin

            if results.count > 1 {
                let index = results.firstIndex { $0.id == shown } ?? 0
                HStack(spacing: 6) {
                    ForEach(results.indices, id: \.self) { i in
                        Capsule()
                            .fill(i == index ? Theme.green : Theme.line)
                            .frame(width: i == index ? 18 : 7, height: 7)
                    }
                }
                .animation(.easeOut(duration: 0.2), value: index)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("Car \(index + 1) of \(results.count)")
            }
        }
        .onChange(of: results.map(\.id), initial: true) { focus() }
        .onChange(of: store.searchFocusCar) { focus() }
    }

    /// Turo-style card: big 3:2 photo, heavy name, one line of facts, price and Book.
    private func carCard(_ car: Car) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            CarPhotoView(car: car)
                .aspectRatio(3 / 2, contentMode: .fit)
                .frame(maxWidth: .infinity)
                .clipShape(RoundedRectangle(cornerRadius: Theme.radius))
                .overlay(alignment: .topTrailing) { TrackButton(carId: car.id).padding(10) }
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
                let made = try Rules.book(&$0, userId: store.currentUserId, carId: car.id, from: from, to: to, creditsUsed: credits)
                booking = made
                // Booking opens the chat: the owner's hello is its first message.
                try Rules.sendMessage(&$0, bookingId: made.id, senderId: car.ownerId, text: ChatView.welcome($0, booking: made))
            }
            if let booking { onBooked(booking.id) }
        } catch {
            self.error = error.localizedDescription
        }
    }
}
