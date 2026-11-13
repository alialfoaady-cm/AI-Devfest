import SwiftUI

/// Pay with credits, with money, or with both: credits first and dollars for whatever is left.
/// Same as components/PayChoice.tsx in the web app.
struct PayChoiceView: View {
    let cost: Int
    let balance: Int
    @Binding var useCredits: Bool

    var body: some View {
        let credits = Rules.creditsToUse(cost, balance: balance, useCredits: useCredits)
        let dollars = Double(cost - credits) * Config.usdPerCredit
        VStack(alignment: .leading, spacing: 10) {
            Toggle(isOn: Binding(get: { useCredits && balance > 0 }, set: { useCredits = $0 })) {
                HStack {
                    Text("Use my credits").fontWeight(.medium)
                    Spacer()
                    Text("You have \(balance)").font(.subheadline).foregroundStyle(Theme.textSoft)
                }
            }
            .disabled(balance <= 0)
            .tint(Theme.green)
            row("From your credits", "\(credits)")
            row("To pay in dollars", usd(dollars))
            if dollars > 0 {
                Text("1 credit = \(usd(Config.usdPerCredit)). This is a demo: no card is charged.")
                    .font(.caption).foregroundStyle(Theme.textSoft)
            }
        }
        .foregroundStyle(Theme.text)
        .padding(14)
        .background(Theme.surfaceRaised, in: RoundedRectangle(cornerRadius: 12))
    }

    private func row(_ term: String, _ value: String) -> some View {
        HStack {
            Text(term).foregroundStyle(Theme.textSoft)
            Spacer()
            Text(value).fontWeight(.semibold).monospacedDigit()
        }
        .font(.subheadline)
    }
}

/// Cover for one trip: what it is, what it costs, and the button to buy it before pickup.
/// Same as CoverRow in app/insurance/page.tsx.
struct CoverCard: View {
    @Environment(AppStore.self) private var store
    let booking: Booking
    @State private var useCredits = true
    @State private var error: String?

    var body: some View {
        let car = store.state.car(booking.carId)
        let cost = Rules.insuranceCost(booking.days)
        let balance = store.currentUser?.credits ?? 0
        let credits = Rules.creditsToUse(cost, balance: balance, useCredits: useCredits)
        let cancelled = booking.status == .cancelled
        let beforePickup = store.state.stage(booking.id) == .pickup

        Card {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("\(car?.model ?? "Car") at \(car?.airport ?? "")").font(.headline).foregroundStyle(Theme.text)
                    Text("\(Day.short(booking.from)) to \(Day.short(booking.to)), \(plural(booking.days, "day"))")
                        .font(.subheadline).foregroundStyle(Theme.textSoft)
                }
                Spacer()
                Pill(text: cancelled ? "Cancelled" : booking.insurance != nil ? "Covered" : "Not covered",
                     color: booking.insurance != nil && !cancelled ? Theme.greenText : Theme.textSoft)
            }

            if cancelled {
                Text("This trip was cancelled, so there is nothing to cover.").foregroundStyle(Theme.textSoft)
            } else if let insurance = booking.insurance {
                Text("Sayara pays for damage on this trip. You paid \(payText(insurance)).").foregroundStyle(Theme.text)
            } else if beforePickup {
                (Text("Cover for this trip costs ") + Text(plural(cost, "credit")).bold()
                 + Text(" or \(usd(Double(cost) * Config.usdPerCredit))."))
                    .foregroundStyle(Theme.text)
                PayChoiceView(cost: cost, balance: balance, useCredits: $useCredits)
                if let error { ErrorBanner(message: error) }
                Button("Buy cover for \(payText(Payment(credits: credits, usd: Double(cost - credits) * Config.usdPerCredit)))") {
                    buy(credits)
                }
                .buttonStyle(.primary)
            } else {
                Text("Cover has to be bought before pickup. On this trip you pay for any damage the owner confirms.")
                    .foregroundStyle(Theme.textSoft)
            }
        }
    }

    private func buy(_ credits: Int) {
        do {
            try store.update { try Rules.insureTrip(&$0, userId: store.currentUserId, bookingId: booking.id, creditsUsed: credits) }
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }
}

/// Cancelling a trip before pickup, by its borrower or by the car's owner. This window is the one
/// place the cost of cancelling is shown: it is not on the listing or the booking.
/// Same as components/trip/CancelTrip.tsx.
struct CancelTripSheet: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let booking: Booking
    let otherName: String

    @State private var useCredits = true
    @State private var error: String?

    var body: some View {
        let isBorrower = booking.userId == store.currentUserId
        let fee = Rules.cancellationFee(booking.days)
        // What comes back to the person cancelling before the fee: the borrower's payment. Zero for an owner.
        let refund = isBorrower ? Rules.refundOf(booking) : .zero
        let available = (store.currentUser?.credits ?? 0) + refund.credits
        let credits = Rules.creditsToUse(fee.total, balance: available, useCredits: useCredits)

        NavigationStack {
            Screen {
                Text("Cancelling costs \(plural(fee.total, "credit")) or \(usd(Double(fee.total) * Config.usdPerCredit)). That is \(otherName)'s parking for \(plural(booking.days, "day")) (\(fee.parking) credits) and a 15% fee (\(fee.cut)).")
                    .foregroundStyle(Theme.textSoft)
                if refund.credits > 0 || refund.usd > 0 {
                    Text("You get back the \(payText(refund)) you paid.").foregroundStyle(Theme.textSoft)
                }
                PayChoiceView(cost: fee.total, balance: available, useCredits: $useCredits)
                if let error { ErrorBanner(message: error) }
                Button("Cancel and pay \(payText(Payment(credits: credits, usd: Double(fee.total - credits) * Config.usdPerCredit)))") {
                    cancel(credits)
                }
                .buttonStyle(DangerButtonStyle())
                Button("Keep the trip") { dismiss() }.buttonStyle(.secondary)
            }
            .navigationTitle("Cancel this trip?")
            .navigationBarTitleDisplayMode(.inline)
        }
        .presentationDetents([.medium, .large])
        .preferredColorScheme(.dark)
    }

    private func cancel(_ credits: Int) {
        do {
            try store.update { try Rules.cancelBooking(&$0, userId: store.currentUserId, bookingId: booking.id, creditsUsed: credits) }
            dismiss()
        } catch {
            self.error = error.localizedDescription
        }
    }
}

/// Red, for the one action that cannot be undone.
struct DangerButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        let label = configuration.label
            .font(.headline)
            .foregroundStyle(.black)
            .frame(maxWidth: .infinity, minHeight: 52)
        if Theme.liquidGlass {
            label
                .glassEffect(.regular.tint(Theme.flag.opacity(0.9)).interactive(), in: Capsule())
                .overlay(Capsule().strokeBorder(GlassRim.gradient, lineWidth: 1))
        } else {
            label
                .background(Theme.flag, in: RoundedRectangle(cornerRadius: 8))
                .opacity(configuration.isPressed ? 0.85 : 1)
        }
    }
}

/// The Insurance tab: what cover means, and each of your trips with its cover.
/// Same as app/insurance/page.tsx.
struct InsuranceView: View {
    @Environment(AppStore.self) private var store
    var onFind: () -> Void

    private var trips: [Booking] {
        store.state.bookings.filter { $0.userId == store.currentUserId }.reversed()
    }

    var body: some View {
        Screen {
            Text("Cover a trip and Sayara pays for damage. It costs \(Config.insuranceCreditsPerDay) credits a day (\(usd(Double(Config.insuranceCreditsPerDay) * Config.usdPerCredit))), and you buy it before you pick up the car.")
                .font(.subheadline).foregroundStyle(Theme.textSoft)

            side("checkmark.shield.fill", Theme.greenText, "With cover",
                 "If the owner confirms damage after your trip, Sayara pays for the repair.")
            side("xmark.shield.fill", Theme.flag, "Without cover",
                 "If the owner confirms damage after your trip, you pay for the repair yourself.")

            SectionTitle(text: "Your trips").padding(.top, 8)
            if trips.isEmpty {
                EmptyState(symbol: "checkmark.shield", title: "No trips to cover yet",
                           message: "Book a car first. You can add cover any time before you pick it up.") {
                    Button("Find a car", action: onFind).buttonStyle(.primary)
                }
            }
            ForEach(trips) { CoverCard(booking: $0) }
        }
    }

    private func side(_ symbol: String, _ color: Color, _ title: String, _ detail: String) -> some View {
        Card {
            HStack(alignment: .top, spacing: 14) {
                Image(systemName: symbol)
                    .font(.title2)
                    .foregroundStyle(color)
                    .frame(width: 48, height: 48)
                    .background(color.opacity(0.15), in: RoundedRectangle(cornerRadius: 12))
                VStack(alignment: .leading, spacing: 2) {
                    Text(title).font(.headline).foregroundStyle(Theme.text)
                    Text(detail).font(.subheadline).foregroundStyle(Theme.textSoft)
                }
            }
        }
    }
}
