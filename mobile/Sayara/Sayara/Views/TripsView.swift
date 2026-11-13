import SwiftUI

/// Cars you borrowed, from pickup to return. (Cars you lent are on the Lend tab.)
struct TripsView: View {
    @Environment(AppStore.self) private var store
    var onFind: () -> Void

    private var trips: [Booking] {
        store.state.bookings.filter { $0.userId == store.currentUserId }.reversed()
    }

    var body: some View {
        Screen {
            if trips.isEmpty {
                EmptyState(symbol: "point.topleft.down.to.point.bottomright.curvepath", title: "No trips yet",
                           message: "Cars you borrow show up here, from pickup to return. Each day costs one credit.") {
                    Button("Find a car", action: onFind).buttonStyle(.primary)
                }
            }
            ForEach(trips) { trip in TripCard(booking: trip) }
        }
    }
}

private struct TripCard: View {
    @Environment(AppStore.self) private var store
    let booking: Booking

    var body: some View {
        let car = store.state.car(booking.carId)
        let stage = store.state.stage(booking.id)
        VStack(alignment: .leading, spacing: 8) {
            CarPhotoView(car: car)
                .aspectRatio(3 / 2, contentMode: .fit)
                .frame(maxWidth: .infinity)
                .clipShape(RoundedRectangle(cornerRadius: Theme.radius))
            pill(stage)
            Text("\(car?.model ?? "Car") at \(car?.airport ?? "")").font(.title3.weight(.heavy)).foregroundStyle(Theme.text)
            Text("\(Day.short(booking.from)) to \(Day.short(booking.to))" + (booking.status == .cancelled ? "" : ", \(plural(Rules.tripCost(booking.days) + (booking.mileage?.credits ?? 0), "credit"))"))
                .font(.subheadline).foregroundStyle(Theme.textSoft)
            NavigationLink(value: booking.id) { Text(action(stage)) }
                .modifier(StageButton(stage: stage))
        }
        .padding(.bottom, 10)
    }

    private func pill(_ stage: TripStage) -> some View {
        switch stage {
        case .pickup: Pill(text: "Ready to pick up", color: Theme.greenText)
        case .driving: Pill(text: "On the road", color: Theme.text)
        case .returned: Pill(text: "Returned", color: Theme.textSoft)
        case .cancelled: Pill(text: "Cancelled", color: Theme.textSoft)
        }
    }

    private func action(_ stage: TripStage) -> String {
        switch stage {
        case .pickup: "Find the car"
        case .driving: "Return the car"
        case .returned: "See return report"
        case .cancelled: "See what happened"
        }
    }
}

private struct StageButton: ViewModifier {
    let stage: TripStage
    func body(content: Content) -> some View {
        if stage == .returned || stage == .cancelled { content.buttonStyle(.secondary) } else { content.buttonStyle(.primary) }
    }
}
