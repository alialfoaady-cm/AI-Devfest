import SwiftUI

/// Pick an airport and dates, see cars free for the whole trip, book with credits.
struct FindCarView: View {
    @Environment(AppStore.self) private var store
    var onBooked: (String) -> Void

    @State private var airport = SampleData.defaultAirport
    @State private var from = SampleData.defaultFrom
    @State private var to = SampleData.defaultTo
    @State private var error: String?
    @State private var pending: Car?

    private var days: Int { Rules.tripDays(from, to) }
    private var results: [Car] {
        Rules.availableCars(store.state, airport: airport, from: from, to: to, userId: store.currentUserId)
    }

    var body: some View {
        Screen {
            Text("Land, unlock, drive. Pay with credits you earned lending your own car.")
                .font(.subheadline).foregroundStyle(Theme.textSoft)

            Card {
                Text("Where are you landing?").font(.headline).foregroundStyle(Theme.text)
                AirportPicker(code: $airport)
                DayRangePicker(fromLabel: "Pick up", toLabel: "Return", from: $from, to: $to)
                HStack {
                    Text(days >= 1 ? "\(plural(days, "day")) · \(plural(days, "credit"))" : "A trip must be at least 1 day.")
                        .foregroundStyle(days >= 1 ? Theme.green : Theme.flag)
                    Spacer()
                    Text("You have \(store.currentUser?.credits ?? 0)").foregroundStyle(Theme.textSoft)
                }
                .font(.subheadline.weight(.semibold))
            }

            if let error { ErrorBanner(message: error) }

            SectionTitle(text: results.isEmpty ? "No cars free" : "\(plural(results.count, "car")) free",
                         detail: results.isEmpty
                            ? "No car at \(airport) is free for the whole trip. Try other dates."
                            : "Each one is back before its owner lands.")

            ForEach(results) { car in
                Card {
                    CarSummary(car: car, owner: store.state.user(car.ownerId))
                    Button("Book for \(plural(days, "credit"))") { pending = car }
                        .buttonStyle(.primary)
                        .disabled((store.currentUser?.credits ?? 0) < days)
                    if (store.currentUser?.credits ?? 0) < days {
                        Text("You need \(days - (store.currentUser?.credits ?? 0)) more credits. Lend your car to earn them.")
                            .font(.caption).foregroundStyle(Theme.unsure)
                    }
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
