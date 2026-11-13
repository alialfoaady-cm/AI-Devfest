import SwiftUI

/// Trips you booked, and who borrowed your car and what you earned.
struct TripsView: View {
    @Environment(AppStore.self) private var store

    private var myTrips: [Booking] {
        store.state.bookings.filter { $0.userId == store.currentUserId }.reversed()
    }

    private var lentOut: [Booking] {
        let mine = Set(store.state.cars.filter { $0.ownerId == store.currentUserId }.map(\.id))
        return store.state.bookings.filter { mine.contains($0.carId) }.reversed()
    }

    var body: some View {
        Screen {
            SectionTitle(text: "Cars you booked")
            if myTrips.isEmpty {
                Card { Text("No trips yet. Find a car where you land.").foregroundStyle(Theme.textSoft) }
            }
            ForEach(myTrips) { booking in
                NavigationLink(value: booking.id) { TripRow(booking: booking, perspective: .borrower) }
                    .buttonStyle(.plain)
            }

            SectionTitle(text: "Your car, lent out",
                         detail: "You earn the credits when the car comes back.")
            if lentOut.isEmpty {
                Card { Text("Nobody has borrowed your car yet.").foregroundStyle(Theme.textSoft) }
            }
            ForEach(lentOut) { booking in
                NavigationLink(value: booking.id) { TripRow(booking: booking, perspective: .owner) }
                    .buttonStyle(.plain)
            }
        }
    }
}

private struct TripRow: View {
    enum Perspective { case borrower, owner }

    @Environment(AppStore.self) private var store
    let booking: Booking
    let perspective: Perspective

    var body: some View {
        let car = store.state.car(booking.carId)
        let returned = booking.status == .returned
        Card {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(car?.model ?? "Car").font(.headline).foregroundStyle(Theme.text)
                    Text("\(car?.airport ?? "") · \(Day.short(booking.from)) – \(Day.short(booking.to)) · \(plural(booking.days, "day"))")
                        .font(.subheadline).foregroundStyle(Theme.textSoft)
                    if perspective == .owner {
                        Text("Borrowed by \(store.state.user(booking.userId)?.name ?? "someone")")
                            .font(.caption).foregroundStyle(Theme.textSoft)
                    }
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 6) {
                    if perspective == .owner {
                        Pill(text: returned ? "+\(booking.days) earned" : "+\(booking.days) on return",
                             color: returned ? Theme.green : Theme.textSoft)
                    } else {
                        Pill(text: returned ? "Returned" : nextStep, color: returned ? Theme.textSoft : Theme.green)
                    }
                    Image(systemName: "chevron.right").foregroundStyle(Theme.textSoft)
                }
            }
        }
    }

    private var nextStep: String {
        store.state.inspection(booking.id, .pickup) == nil ? "Pickup photos" : "Driving"
    }
}
